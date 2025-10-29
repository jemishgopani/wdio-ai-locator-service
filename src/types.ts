export type LLMProvider = 'openai' | 'openai-router' | 'ollama';

export interface ServiceOptions {
  provider?: LLMProvider; // LLM provider to use (default: 'openai')
  apiKey?: string;
  model?: string;
  baseUrl?: string; // Custom base URL for OpenAI Router or Ollama
  cachePath?: string;
  debug?: boolean;
  llmClient?: any;
  enableUsageTracking?: boolean; // Enable AI usage tracking to .ai-locator-usage-cache.json
  usageCachePath?: string; // Custom path for usage cache file
  maxRetries?: number; // Maximum number of AI retry attempts if locator fails (default: 2)
}

export interface LocatorResult {
  best: string;
  alternates?: string[];
  metadata?: Record<string, any>;
  /**
   * Flag indicating if this locator contains template variables ({var})
   * that should be interpolated before use
   */
  isTemplate?: boolean;
}
