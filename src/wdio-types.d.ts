// Type augmentation for WebdriverIO Browser interface
declare global {
  namespace WebdriverIO {
    /**
     * Caching strategy for dynamic locators
     */
    type CacheStrategy = 'template' | 'resolved' | 'smart';

    interface AiLocatorOptions {
      /**
       * When true, always use AI to find the element, skipping cache and heuristics.
       * This ensures fresh AI-generated selectors on every call.
       * @default false
       */
      alwaysAI?: boolean;

      /**
       * When true, automatically regenerate locator if cached one fails verification.
       * When false, return cached locator even if it doesn't exist on page (no auto-healing).
       * @default true
       * @example
       * // Auto-heal enabled (default) - finds new locator if cached one fails
       * await browser.aiLocator('Login button', { autoHeal: true });
       *
       * // Auto-heal disabled - returns cached locator even if it fails
       * await browser.aiLocator('Login button', { autoHeal: false });
       */
      autoHeal?: boolean;

      /**
       * Variables to interpolate into the template string.
       * Use {variableName} syntax in the description.
       * Can be an object with values or a function that returns values (for lazy evaluation).
       * @example
       * // Static variables
       * browser.aiLocator('Edit button for {userName}', { variables: { userName: 'John' }})
       *
       * // Lazy evaluation (re-evaluated on each access)
       * browser.aiLocator('Edit button for {userName}', { variables: () => ({ userName: currentUser })})
       */
      variables?: Record<string, string | number> | (() => Record<string, string | number>);

      /**
       * Cache strategy for the locator.
       * - 'template': Cache by template pattern (reuses for all variable combinations)
       * - 'resolved': Cache by fully resolved description (different cache per variable combo)
       * - 'smart': Auto-detect based on whether template has variables (default)
       * @default 'smart'
       */
      cacheBy?: CacheStrategy;
    }

    interface Browser {
      /**
       * AI context storage for global variables
       */
      aiContext?: Record<string, any>;

      /**
       * Find an element using AI-powered locator generation.
       * @param description Natural language description of the element to find (supports {variable} templates)
       * @param options Optional configuration for the AI locator
       * @returns Promise resolving to the locator string (xpath or CSS selector)
       * @example
       * // Basic usage
       * const locator = await browser.aiLocator('login button');
       * await browser.$(locator).click();
       *
       * // With template variables
       * const locator = await browser.aiLocator('Edit button for {userName}', {
       *   variables: { userName: 'John' }
       * });
       *
       * // With lazy evaluation
       * const locator = await browser.aiLocator('User {name}', {
       *   variables: () => ({ name: currentUser })
       * });
       *
       * // Always use AI (skip cache and heuristics)
       * const locator = await browser.aiLocator('login button', { alwaysAI: true });
       *
       * // Template-based caching (reuse for all variable combinations)
       * const locator = await browser.aiLocator('Edit button for {userName}', {
       *   variables: { userName: 'John' },
       *   cacheBy: 'template'
       * });
       */
      aiLocator(description: string, options?: AiLocatorOptions): Promise<string>;

      /**
       * Set global AI context variables that apply to all aiLocator calls.
       * @param context Variables to set in global context
       * @example
       * await browser.setAiContext({ userName: 'John', role: 'admin' });
       * await browser.aiLocator('Profile for {userName}').click(); // Uses global context
       */
      setAiContext(context: Record<string, any>): void;

      /**
       * Clear all global AI context variables.
       * @example
       * await browser.clearAiContext();
       */
      clearAiContext(): void;

      /**
       * Merge additional variables into global AI context.
       * @param context Variables to merge into existing context
       * @example
       * await browser.setAiContext({ userName: 'John' });
       * await browser.mergeAiContext({ role: 'admin' }); // Now has both userName and role
       */
      mergeAiContext(context: Record<string, any>): void;

      /**
       * Execute function with scoped AI context (auto-cleanup after execution).
       * @param context Scoped context variables
       * @param fn Function to execute with scoped context
       * @returns Promise resolving to function result
       * @example
       * await browser.withAiContext({ userName: 'Jane' }, async () => {
       *   await browser.aiLocator('Profile for {userName}').click();
       *   // Context auto-cleared after this block
       * });
       */
      withAiContext<T>(context: Record<string, any>, fn: () => Promise<T>): Promise<T>;
    }
  }
}

export {};
