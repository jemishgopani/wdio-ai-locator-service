import { LocatorResult } from '../types';
import { LocatorCache } from './cache';
import { AiLocatorProvider } from './aiLocatorProvider';
import { extractMinimalDom } from '../utils/domParser';
import { log } from '../utils/logger';
import { selectBestXPath, scoreXPath } from '../utils/xpathUtils';
import { interpolateLocator } from '../utils/templateInterpolation';

export class LocatorEngine {
  cache: LocatorCache;
  aiProvider: AiLocatorProvider;
  maxRetries: number;

  constructor(cache: LocatorCache, aiProvider: AiLocatorProvider, maxRetries: number = 2) {
    this.cache = cache;
    this.aiProvider = aiProvider;
    this.maxRetries = maxRetries;
  }

  buildKey(url: string, desc: string) {
    return `${url}::${desc}`;
  }

  /** Main entry: returns a selector string that exists on the page. */
  async findLocator(
    browser: WebdriverIO.Browser,
    desc: string,
    contextDomSnippet?: string,
    alwaysAI: boolean = false,
    requestTemplate: boolean = false,
    variables?: Record<string, string | number>,
    autoHeal: boolean = true
  ): Promise<LocatorResult> {
    const url = (await browser.getUrl()) || 'unknown-url';
    const key = this.buildKey(url, desc);

    log('╔════════════════════════════════════════════════════════════╗');
    log('║ Starting Locator Search                                   ║');
    log('╚════════════════════════════════════════════════════════════╝');
    log('Description:', desc);
    log('URL:', url);
    log('Cache key:', key);
    log('AlwaysAI mode:', alwaysAI);
    log('AutoHeal mode:', autoHeal);
    log('Request template:', requestTemplate);
    log('Variables for verification:', variables);

    if (alwaysAI) {
      log('\n⚡ AlwaysAI mode enabled - skipping cache and heuristics, going directly to AI');
    }

    // 1) Cache check (skip if alwaysAI)
    if (!alwaysAI) {
      log('\n[Step 1/2] Checking cache...');
      const cached = this.cache.get(key);
      if (cached) {
        log('✓ Cache hit:', cached.best);

        // Interpolate if template before verification
        const selectorToVerify =
          cached.isTemplate && variables ? interpolateLocator(cached.best, variables) : cached.best;

        if (await this.verifySelector(browser, selectorToVerify)) {
          log('✓ Cached selector verified successfully');
          log('Result: Using cached selector');
          return cached;
        } else {
          log('✗ Cached selector failed verification');

          if (autoHeal) {
            log('⚡ AutoHeal enabled - continuing to AI to regenerate locator');
          } else {
            log('○ AutoHeal disabled - returning cached locator without verification');
            log('Result: Using unverified cached selector');
            return cached;
          }
        }
      } else {
        log('○ No cache entry found');
      }
    } else {
      log('\n[Step 1/2] Cache check - SKIPPED (alwaysAI mode)');
    }

    // 2) Ask AI with retry logic
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const isRetry = attempt > 0;

      if (isRetry) {
        log(
          `\n🔄 Retry attempt ${attempt}/${this.maxRetries} - Capturing fresh DOM and requesting new AI-generated locator...`
        );
      } else {
        log('\n[Step 2/2] Requesting AI-generated locator...');
      }

      // Capture fresh DOM on each attempt (including retries)
      const rawDom =
        contextDomSnippet || (await browser.execute(() => document.documentElement.outerHTML));
      const rawDomStr = typeof rawDom === 'string' ? rawDom : JSON.stringify(rawDom);
      const dom = extractMinimalDom(rawDomStr);

      log('DOM Statistics:');
      log('  - Original DOM size:', rawDomStr.length, 'characters');
      log('  - Trimmed DOM size:', dom.length, 'characters');
      log('  - Reduction:', Math.round((1 - dom.length / rawDomStr.length) * 100) + '%');

      if (isRetry) {
        log('📸 Fresh DOM captured for retry');
      }

      log('\n📄 Trimmed DOM sent to AI:');
      log('─'.repeat(80));
      log(dom);
      log('─'.repeat(80));
      log('');

      const aiRes = await this.aiProvider.find(dom, desc, url, requestTemplate);
      log('AI returned selector:', aiRes.best);
      log('  Is template:', aiRes.isTemplate);

      // Try primary selector
      // If it's a template, interpolate variables before verification
      const selectorToVerify =
        aiRes.isTemplate && variables ? interpolateLocator(aiRes.best, variables) : aiRes.best;
      log(
        'Selector to verify:',
        selectorToVerify,
        aiRes.isTemplate ? '(interpolated from template)' : ''
      );

      if (aiRes && aiRes.best && (await this.verifySelector(browser, selectorToVerify))) {
        log('✓ AI selector verified successfully' + (isRetry ? ` (on retry ${attempt})` : ''));
        this.cache.set(key, aiRes);
        log('Result: Using AI-generated selector');
        return aiRes;
      }
      log('✗ AI primary selector failed verification');

      // Try alternates from aiRes if any
      log('\nTrying AI alternate selectors...');
      if (aiRes?.alternates?.length) {
        log('AI provided', aiRes.alternates.length, 'alternates:', aiRes.alternates);

        // If all alternates are XPath, use smart selection based on scoring
        const allXPath = aiRes.alternates.every((alt) => this.isXPath(alt));
        if (allXPath) {
          log('All alternates are XPath, using smart selection...');
          const bestXPath = selectBestXPath(aiRes.alternates);
          if (bestXPath) {
            // Interpolate if template
            const bestXPathToVerify =
              aiRes.isTemplate && variables ? interpolateLocator(bestXPath, variables) : bestXPath;
            log('Testing best XPath:', bestXPathToVerify, aiRes.isTemplate ? '(interpolated)' : '');

            if (await this.verifySelector(browser, bestXPathToVerify)) {
              log(
                '✓ Best scored XPath alternate verified:',
                bestXPath,
                'score:',
                scoreXPath(bestXPath)
              );
              const res: LocatorResult = {
                best: bestXPath,
                alternates: aiRes.alternates.filter((a) => a !== bestXPath),
                isTemplate: aiRes.isTemplate
              };
              this.cache.set(key, res);
              log(
                'Result: Using smart-selected XPath alternate' +
                  (isRetry ? ` (on retry ${attempt})` : '')
              );
              return res;
            }
          }
        }

        // Fallback: try alternates in order
        for (let i = 0; i < aiRes.alternates.length; i++) {
          const alt = aiRes.alternates[i];
          // Interpolate if template
          const altToVerify =
            aiRes.isTemplate && variables ? interpolateLocator(alt, variables) : alt;
          log(
            `Testing alternate ${i + 1}/${aiRes.alternates.length}:`,
            altToVerify,
            aiRes.isTemplate ? '(interpolated)' : ''
          );

          if (await this.verifySelector(browser, altToVerify)) {
            log('✓ Alternate selector verified successfully:', alt);
            const res: LocatorResult = {
              best: alt,
              alternates: aiRes.alternates,
              isTemplate: aiRes.isTemplate
            };
            this.cache.set(key, res);
            log('Result: Using AI alternate selector' + (isRetry ? ` (on retry ${attempt})` : ''));
            return res;
          }
        }
        log('✗ No alternate selectors matched');
      } else {
        log('○ No alternates provided');
      }

      // If this was the last retry, break out
      if (attempt === this.maxRetries) {
        log(`\n✗ All ${this.maxRetries + 1} attempts exhausted`);
        break;
      }

      log(`\nℹ Attempt ${attempt + 1} failed, will retry...`);
    }

    log('\n✗ Unable to resolve locator for:', desc);
    throw new Error(
      `Unable to resolve locator for "${desc}" after ${this.maxRetries + 1} attempts`
    );
  }

  private async verifySelector(browser: WebdriverIO.Browser, selector: string): Promise<boolean> {
    if (!selector) return false;
    try {
      const el = await browser.$(selector);
      const exists = await el.isExisting();
      log('verifySelector', selector, exists);
      return exists;
    } catch (err) {
      log('verifySelector error', err);
      return false;
    }
  }

  private isXPath(selector: string): boolean {
    if (!selector) return false;
    const trimmed = selector.trim();
    return (
      trimmed.startsWith('xpath=') ||
      trimmed.startsWith('//') ||
      (trimmed.startsWith('/') && !trimmed.startsWith('/*'))
    );
  }
}
