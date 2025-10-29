/**
 * WDIO AI Locator Service
 *
 * AI-powered element locator service for WebdriverIO that automatically generates
 * CSS selectors and XPath expressions using LLM models.
 *
 * Features:
 * - AI-powered locator generation
 * - Optional token usage tracking (separate from locator cache)
 * - Comprehensive logging (set WDIO_AI_DEBUG=1 to enable debug logs)
 * - Usage tracking stored at: .ai-locator-usage-cache.json (project root)
 *
 * @example
 * ```typescript
 * // In wdio.conf.ts
 * export const config = {
 *   services: [
 *     ['ai-locator', {
 *       apiKey: process.env.OPENAI_API_KEY,
 *       model: 'gpt-4o-mini',
 *       enableUsageTracking: true, // Enable token usage tracking
 *       usageCachePath: './.ai-locator-usage-cache.json', // Optional custom path
 *       cachePath: './.wdio-ai-cache' // Locator cache (separate)
 *     }]
 *   ]
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Using with custom LLM client
 * import { OpenAIClient } from 'wdio-ai-locator-service';
 *
 * export const config = {
 *   services: [
 *     ['ai-locator', {
 *       llmClient: new OpenAIClient(
 *         process.env.OPENAI_API_KEY,
 *         'gpt-4o-mini',
 *         true // enableUsageTracking
 *       ),
 *       cachePath: './.wdio-ai-cache'
 *     }]
 *   ]
 * };
 * ```
 *
 * @example
 * ```typescript
 * // In your test - basic usage
 * const loginButton = await browser.aiLocator('login button');
 * await loginButton.click();
 *
 * // Always use AI (skip cache and heuristics)
 * await browser.aiLocator('submit button', { alwaysAI: true }).click();
 * ```
 *
 * Usage Tracking (Optional):
 * Enable with `enableUsageTracking: true` in service options.
 * When enabled, all AI API calls are logged to .ai-locator-usage-cache.json (project root) with:
 * - AI client name (e.g., "OpenAI")
 * - Total token usage across all calls
 * - Per-call details: timestamp, model, description, URL
 * - Token usage per call (prompt, completion, total)
 * - Success/failure status
 * - Generated selector (on success) or error message (on failure)
 *
 * Note: Usage tracking is SEPARATE from locator cache (.wdio-ai-cache/) which stores actual selectors
 */

import AiLocatorService from './service';

export { OpenAIClient } from './ai/llmClient';
export { ServiceOptions } from './types';
export { UsageCache, UsageEntry, UsageSummary } from './utils/usageCache';
export default AiLocatorService;
module.exports = AiLocatorService;
