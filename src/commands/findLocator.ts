import type { Browser } from 'webdriverio';
import { LocatorEngine } from '../locator/locatorEngine';
import { LocatorCache } from '../locator/cache';
import { AiLocatorProvider } from '../locator/aiLocatorProvider';
import { log } from '../utils/logger';
import {
  interpolateTemplate,
  hasTemplateVariables,
  interpolateLocator
} from '../utils/templateInterpolation';

type CacheStrategy = 'template' | 'resolved' | 'smart';

export function registerAiLocator(browser: Browser, options?: any) {
  if (!options?.llmClient) {
    throw new Error('LLM client is required for aiLocator command');
  }

  const provider = new AiLocatorProvider(options.llmClient);
  const cache = new LocatorCache(options?.cachePath);
  const maxRetries = options?.maxRetries ?? 2; // Default to 2 retries
  const engine = new LocatorEngine(cache, provider, maxRetries);

  // Store resolved selectors in a Map to cache them per description
  const selectorCache = new Map<string, string>();
  const inflightSelectors = new Map<string, Promise<string>>();

  // Initialize AI context if not exists
  if (!(browser as any).aiContext) {
    (browser as any).aiContext = {};
  }

  const resolveSelector = async (
    ctx: Browser,
    cacheKeyDescription: string,
    alwaysAI: boolean = false,
    actualDescription?: string,
    variables?: Record<string, string | number>,
    requestTemplate: boolean = false,
    autoHeal: boolean = true
  ): Promise<string> => {
    const url = await ctx.getUrl().catch(() => 'unknown-url');
    const cacheKey = `${url}::${cacheKeyDescription}`;
    const descriptionForEngine = actualDescription || cacheKeyDescription;

    log('→ resolveSelector');
    log('Cache key description:', cacheKeyDescription);
    log('Actual description for engine:', descriptionForEngine);
    log('Cache key:', cacheKey);
    log('AlwaysAI:', alwaysAI);
    log('AutoHeal:', autoHeal);
    log('Request template:', requestTemplate);
    log('Variables for locator interpolation:', variables);

    // Skip in-memory cache if alwaysAI is true
    if (!alwaysAI) {
      const cachedSelector = selectorCache.get(cacheKey);
      if (cachedSelector) {
        log('✓ Using in-memory cached selector:', cachedSelector);
        // Interpolate variables if present in cached selector
        if (variables && hasTemplateVariables(cachedSelector)) {
          const interpolated = interpolateLocator(cachedSelector, variables);
          log('✓ Interpolated cached selector with variables:', interpolated);
          return interpolated;
        }
        return cachedSelector;
      }
    } else {
      log('○ In-memory cache skipped (alwaysAI mode)');
    }

    const inflight = inflightSelectors.get(cacheKey);
    if (inflight) {
      log('○ Request already in-flight, waiting for result...');
      const selector = await inflight;
      // Interpolate variables if present in selector
      if (variables && hasTemplateVariables(selector)) {
        const interpolated = interpolateLocator(selector, variables);
        log('✓ Interpolated in-flight selector with variables:', interpolated);
        return interpolated;
      }
      return selector;
    }

    const fetchPromise = (async () => {
      log('→ Fetching page source...');
      const dom = await ctx.getPageSource();
      log('✓ Page source retrieved, length:', dom.length);

      log('→ Calling locator engine...');
      const res = await engine.findLocator(
        ctx as any,
        descriptionForEngine,
        dom,
        alwaysAI,
        requestTemplate,
        variables,
        autoHeal
      );

      if (!res?.best) {
        throw new Error(`AI locator service returned no selector for "${descriptionForEngine}"`);
      }

      log('✓ Locator engine returned:', res.best);
      log('  Is template:', res.isTemplate);

      // Only cache if not in alwaysAI mode
      if (!alwaysAI) {
        selectorCache.set(cacheKey, res.best);
        log('✓ Cached selector in memory (key:', cacheKeyDescription, ')');
      } else {
        log('○ Selector not cached (alwaysAI mode)');
      }

      return res.best;
    })();

    inflightSelectors.set(cacheKey, fetchPromise);

    try {
      const selector = await fetchPromise;
      // Interpolate variables if present in selector
      if (variables && hasTemplateVariables(selector)) {
        const interpolated = interpolateLocator(selector, variables);
        log('✓ Interpolated fetched selector with variables:', interpolated);
        return interpolated;
      }
      return selector;
    } finally {
      inflightSelectors.delete(cacheKey);
    }
  };

  async function aiLocator(
    this: Browser,
    description: string,
    options?: {
      alwaysAI?: boolean;
      autoHeal?: boolean;
      variables?: Record<string, string | number> | (() => Record<string, string | number>);
      cacheBy?: CacheStrategy;
    }
  ) {
    log('\n╔══════════════════════════════════════════════════════════╗');
    log('║ browser.aiLocator() called                               ║');
    log('╚══════════════════════════════════════════════════════════╝');
    log('Element description (template):', description);
    log('Options:', options);

    // Merge global context with local variables
    const globalContext = (this as any).aiContext || {};
    let variables = { ...globalContext };

    if (options?.variables) {
      const localVars =
        typeof options.variables === 'function' ? options.variables() : options.variables;
      variables = { ...variables, ...localVars };
    }

    log('Merged variables:', variables);

    // Interpolate template with variables
    const resolvedDescription = interpolateTemplate(description, variables);
    log('Resolved description:', resolvedDescription);

    // Determine cache strategy
    const cacheStrategy = options?.cacheBy ?? 'smart';
    const hasVars = hasTemplateVariables(description);

    let finalCacheStrategy: 'template' | 'resolved';
    if (cacheStrategy === 'smart') {
      finalCacheStrategy = hasVars ? 'template' : 'resolved';
    } else {
      finalCacheStrategy = cacheStrategy;
    }

    log('Cache strategy:', cacheStrategy, '→', finalCacheStrategy);

    // Build cache key based on strategy
    const templateForCache = finalCacheStrategy === 'template' ? description : resolvedDescription;

    // When using template caching, send template description to AI (not resolved)
    // The AI will generate a locator pattern with {variables} placeholders
    const descriptionForAI = finalCacheStrategy === 'template' ? description : resolvedDescription;
    const requestTemplate = finalCacheStrategy === 'template' && hasVars;

    const alwaysAI = options?.alwaysAI ?? false;
    const autoHeal = options?.autoHeal ?? true; // Default to true for auto-healing

    const selector = await resolveSelector(
      this,
      templateForCache,
      alwaysAI,
      descriptionForAI,
      variables,
      requestTemplate,
      autoHeal
    );
    log('Final selector to use:', selector);
    log('Returning selector string\n');

    return selector;
  }

  // Context management methods
  function setAiContext(this: Browser, context: Record<string, any>) {
    (this as any).aiContext = { ...(this as any).aiContext, ...context };
    log('AI Context set:', (this as any).aiContext);
  }

  function clearAiContext(this: Browser) {
    (this as any).aiContext = {};
    log('AI Context cleared');
  }

  function mergeAiContext(this: Browser, context: Record<string, any>) {
    (this as any).aiContext = { ...(this as any).aiContext, ...context };
    log('AI Context merged:', (this as any).aiContext);
  }

  async function withAiContext<T>(
    this: Browser,
    context: Record<string, any>,
    fn: () => Promise<T>
  ): Promise<T> {
    const previousContext = { ...(this as any).aiContext };
    log('AI Context: Entering scoped context:', context);

    try {
      (this as any).aiContext = { ...previousContext, ...context };
      return await fn();
    } finally {
      (this as any).aiContext = previousContext;
      log('AI Context: Restored previous context');
    }
  }

  browser.addCommand('aiLocator', aiLocator);
  browser.addCommand('setAiContext', setAiContext);
  browser.addCommand('clearAiContext', clearAiContext);
  browser.addCommand('mergeAiContext', mergeAiContext);
  browser.addCommand('withAiContext', withAiContext);
}
