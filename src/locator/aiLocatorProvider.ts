import { LLMClient } from '../ai/llmClient';
import { LocatorResult } from '../types';
import { log } from '../utils/logger';
import {
  isValidXPath,
  scoreXPath,
  suggestXPathImprovements,
  normalizeXPath,
  optimizeXPath
} from '../utils/xpathUtils';
import { hasTemplateVariables } from '../utils/templateInterpolation';

/**
 * Wraps an LLM client to request a locator for a given DOM & description.
 * Expects the LLM to return a selector string (CSS/XPath/Playwright locator).
 */
export class AiLocatorProvider {
  client: LLMClient;

  constructor(client: LLMClient) {
    this.client = client;
  }

  async find(
    domSnippet: string,
    description: string,
    url?: string,
    requestTemplate: boolean = false
  ): Promise<LocatorResult> {
    log('→ AiLocatorProvider.find:', description);
    log('  Request template:', requestTemplate);
    const response = await this.client.generateLocator(
      domSnippet,
      description,
      url,
      requestTemplate
    );

    // Parse selector and alternates from delimited response (format: best|||alt1|||alt2)
    const parts = response.selector.split('|||');
    const selector = parts[0];
    const alternates = parts.slice(1);

    log('Parsed primary selector:', selector);
    log('Parsed alternates:', alternates);

    // Validate and optimize XPath selectors
    const processedSelector = this.processSelector(selector);
    const processedAlternates = alternates
      .map((alt) => this.processSelector(alt))
      .filter(Boolean) as string[];

    // If primary selector is XPath, score it and log suggestions
    if (this.isXPath(processedSelector)) {
      const score = scoreXPath(processedSelector);
      const suggestions = suggestXPathImprovements(processedSelector);
      log('XPath selector score:', score);
      if (suggestions.length > 0) {
        log('XPath improvement suggestions:', suggestions);
      }
    }

    // Check if the selector contains template variables
    const isTemplate = hasTemplateVariables(processedSelector);

    const result: LocatorResult = {
      best: processedSelector,
      alternates: processedAlternates,
      isTemplate,
      // Only include metadata if usage data is available (tracking is enabled)
      metadata: response.usage
        ? {
            usage: response.usage
          }
        : undefined
    };
    log('← AiLocatorProvider returned selector:', processedSelector);
    log('  Is template:', isTemplate);
    log('← With alternates:', processedAlternates);
    return result;
  }

  /**
   * Process selector: validate, normalize, and optimize
   */
  private processSelector(selector: string): string {
    if (!selector || !selector.trim()) return selector;

    // If it's an XPath, validate, normalize, and optimize it
    if (this.isXPath(selector)) {
      if (!isValidXPath(selector)) {
        log('⚠ Invalid XPath detected, returning as-is:', selector);
        return selector;
      }
      const normalized = normalizeXPath(selector);
      const optimized = optimizeXPath(normalized);
      log('XPath processing:', { original: selector, normalized, optimized });
      return optimized;
    }

    return selector;
  }

  /**
   * Check if selector is an XPath expression
   */
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
