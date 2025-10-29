import * as fs from 'fs';
import * as path from 'path';
import { log } from './logger';

/**
 * AI Locator Usage Tracker
 *
 * Tracks all AI API calls and token usage for the WDIO AI Locator service.
 * This is SEPARATE from the locator cache and only tracks usage statistics.
 *
 * The usage data is stored as a JSON file at: .ai-locator-usage-cache.json
 * (This is different from the locator cache which stores actual selectors)
 *
 * This file contains:
 * - Summary statistics (total calls, tokens, success/failure counts, AI client info)
 * - Individual entries for each AI API call with token usage details
 *
 * Enable tracking with: enableUsageTracking: true in service options
 *
 * Example usage file structure:
 * {
 *   "aiClient": "OpenAI",
 *   "totalCalls": 5,
 *   "totalTokens": 2500,
 *   "totalPromptTokens": 2000,
 *   "totalCompletionTokens": 500,
 *   "successfulCalls": 4,
 *   "failedCalls": 1,
 *   "entries": [
 *     {
 *       "timestamp": "2025-10-28T10:30:00.000Z",
 *       "aiClient": "OpenAI",
 *       "model": "gpt-4o-mini",
 *       "description": "login button",
 *       "url": "https://example.com/login",
 *       "promptTokens": 450,
 *       "completionTokens": 20,
 *       "totalTokens": 470,
 *       "success": true,
 *       "selector": "#login-btn"
 *     }
 *   ]
 * }
 */

export interface UsageEntry {
  timestamp: string;
  aiClient: string;
  model: string;
  description: string;
  url: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  success: boolean;
  selector?: string;
  error?: string;
}

export interface UsageSummary {
  aiClient: string;
  totalCalls: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  successfulCalls: number;
  failedCalls: number;
  entries: UsageEntry[];
}

export class UsageCache {
  private cacheFilePath: string;
  private aiClient: string;
  private enabled: boolean;

  constructor(aiClient: string = 'Unknown', enabled: boolean = false, customPath?: string) {
    this.aiClient = aiClient;
    this.enabled = enabled;

    // Store in project root, separate from locator cache
    if (customPath) {
      this.cacheFilePath = customPath;
    } else {
      this.cacheFilePath = path.join(process.cwd(), '.ai-locator-usage-cache.json');
    }

    // Ensure directory exists
    const dir = path.dirname(this.cacheFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (this.enabled) {
      log('UsageCache ENABLED at:', this.cacheFilePath);
      log('AI Client:', this.aiClient);
    } else {
      log('UsageCache DISABLED - set enableUsageTracking: true to enable');
    }
  }

  private loadUsageData(): UsageSummary {
    if (!fs.existsSync(this.cacheFilePath)) {
      return {
        aiClient: this.aiClient,
        totalCalls: 0,
        totalTokens: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        successfulCalls: 0,
        failedCalls: 0,
        entries: []
      };
    }

    try {
      const data = fs.readFileSync(this.cacheFilePath, 'utf-8');
      const parsed = JSON.parse(data);
      // Update aiClient if it changed
      parsed.aiClient = this.aiClient;
      return parsed;
    } catch (error) {
      log('Error loading usage cache, starting fresh:', error);
      return {
        aiClient: this.aiClient,
        totalCalls: 0,
        totalTokens: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        successfulCalls: 0,
        failedCalls: 0,
        entries: []
      };
    }
  }

  private saveUsageData(data: UsageSummary): void {
    try {
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(data, null, 2), 'utf-8');
      log('Usage cache updated:', this.cacheFilePath);
    } catch (error) {
      log('Error saving usage cache:', error);
    }
  }

  addUsage(entry: UsageEntry): void {
    if (!this.enabled) {
      log('Usage tracking is disabled, skipping entry');
      return;
    }

    const data = this.loadUsageData();

    data.entries.push(entry);
    data.totalCalls++;
    data.totalTokens += entry.totalTokens;
    data.totalPromptTokens += entry.promptTokens;
    data.totalCompletionTokens += entry.completionTokens;

    if (entry.success) {
      data.successfulCalls++;
    } else {
      data.failedCalls++;
    }

    this.saveUsageData(data);

    log('AI Usage logged:', {
      model: entry.model,
      tokens: entry.totalTokens,
      success: entry.success,
      description: entry.description
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getSummary(): UsageSummary {
    return this.loadUsageData();
  }

  getFilePath(): string {
    return this.cacheFilePath;
  }
}
