import { ServiceOptions } from './types';
import { LocatorCache } from './locator/cache';
import { OpenAIClient, OllamaClient, OpenAIRouterClient, LLMClient } from './ai/llmClient';
import { AiLocatorProvider } from './locator/aiLocatorProvider';
import { LocatorEngine } from './locator/locatorEngine';
import { registerAiLocator } from './commands/findLocator';
import { log } from './utils/logger';

declare global {
  var browser: WebdriverIO.Browser | undefined;
}

export default class AiLocatorService {
  options: ServiceOptions;
  engine?: LocatorEngine;
  client?: LLMClient;
  private registered: boolean = false;

  constructor(options: ServiceOptions = {}) {
    this.options = options;
  }

  async before(
    _capabilities: WebdriverIO.Capabilities,
    _specs: string[],
    browser: WebdriverIO.Browser
  ) {
    const provider = this.options.provider || 'openai';
    const enableUsageTracking = this.options.enableUsageTracking ?? false;

    // Initialize the appropriate LLM client based on provider
    switch (provider) {
      case 'openai':
        if (!this.options.apiKey) {
          throw new Error('OpenAI API key is required');
        }
        this.client = new OpenAIClient(
          this.options.apiKey,
          this.options.model,
          enableUsageTracking,
          this.options.usageCachePath,
          this.options.baseUrl
        );
        log('AiLocatorService using OpenAI client');
        break;

      case 'openai-router':
        if (!this.options.apiKey) {
          throw new Error('OpenAI Router API key is required');
        }
        this.client = new OpenAIRouterClient(
          this.options.apiKey,
          this.options.model || 'openai/gpt-4o-mini',
          enableUsageTracking,
          this.options.usageCachePath,
          this.options.baseUrl || 'https://openrouter.ai/api/v1/chat/completions'
        );
        log('AiLocatorService using OpenAI Router client');
        break;

      case 'ollama':
        this.client = new OllamaClient(
          this.options.model || 'llama3',
          enableUsageTracking,
          this.options.usageCachePath,
          this.options.baseUrl || 'http://localhost:11434'
        );
        log('AiLocatorService using Ollama client');
        break;

      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    const aiProvider = new AiLocatorProvider(this.client);
    const cache = new LocatorCache(this.options.cachePath);
    const maxRetries = this.options.maxRetries ?? 2; // Default to 2 retries
    this.engine = new LocatorEngine(cache, aiProvider, maxRetries);
    log('AiLocatorService created engine with maxRetries:', maxRetries);

    // Register commands here with browser instance
    if (browser && this.client) {
      try {
        registerAiLocator(browser, {
          cachePath: this.options.cachePath,
          llmClient: this.client,
          maxRetries: this.options.maxRetries ?? 2
        });
        log('AiLocatorService registered aiLocator command in before() hook');
      } catch (err) {
        log('error registering aiLocator in before()', err);
      }
    }
  }

  async beforeSession(
    _config: WebdriverIO.Config,
    _capabilities: WebdriverIO.Capabilities,
    _specs: string[],
    _cid: string
  ) {
    // nothing special here
  }

  async beforeSuite(_suite: any) {
    this.tryRegisterCommands('beforeSuite');
  }

  async beforeTest(_test: any, _context: any) {
    this.tryRegisterCommands('beforeTest');
  }

  private tryRegisterCommands(hookName: string) {
    if (this.registered) {
      return; // Already registered
    }

    try {
      if (globalThis.browser && this.client) {
        log(`[${hookName}] Attempting to register aiLocator command...`);
        log(`[${hookName}] browser object available:`, !!globalThis.browser);
        log(
          `[${hookName}] browser.addCommand available:`,
          typeof (globalThis.browser as any).addCommand
        );

        registerAiLocator(globalThis.browser as unknown as WebdriverIO.Browser, {
          cachePath: this.options.cachePath,
          llmClient: this.client,
          maxRetries: this.options.maxRetries ?? 2
        });

        this.registered = true;
        log(`[${hookName}] ✓ Successfully registered aiLocator command`);
        log(
          `[${hookName}] browser.aiLocator available:`,
          typeof (globalThis.browser as any).aiLocator
        );
      } else {
        log(
          `[${hookName}] Cannot register - browser:`,
          !!globalThis.browser,
          'client:',
          !!this.client
        );
      }
    } catch (err: any) {
      log(`[${hookName}] ✗ Error registering aiLocator:`, err.message);
      log(`[${hookName}] Error stack:`, err.stack);
    }
  }
}
