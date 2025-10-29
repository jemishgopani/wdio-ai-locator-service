import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { UsageCache } from '../../src/utils/usageCache';

const baseDir = path.join(os.tmpdir(), 'usage-cache-tests');

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mkdirSync(baseDir, { recursive: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(baseDir, { recursive: true, force: true });
});

describe('UsageCache', () => {
  const buildEntry = () => ({
    timestamp: new Date().toISOString(),
    aiClient: 'OpenAI',
    model: 'gpt-4o-mini',
    description: 'login button',
    url: 'https://example.com/login',
    promptTokens: 100,
    completionTokens: 20,
    totalTokens: 120,
    success: true,
    selector: '#login-btn'
  });

  it('persists usage entries when enabled', () => {
    const tmpDir = mkdtempSync(path.join(baseDir, 'enabled-'));
    const cachePath = path.join(tmpDir, 'usage.json');

    const cache = new UsageCache('OpenAI', true, cachePath);
    cache.addUsage(buildEntry());

    expect(existsSync(cachePath)).toBe(true);
    const stored = JSON.parse(readFileSync(cachePath, 'utf-8'));
    expect(stored.totalCalls).toBe(1);
    expect(stored.entries).toHaveLength(1);
    expect(stored.entries[0].selector).toBe('#login-btn');

    const summary = cache.getSummary();
    expect(summary.totalTokens).toBe(120);
    expect(summary.successfulCalls).toBe(1);
    expect(summary.failedCalls).toBe(0);
  });

  it('skips persistence when disabled', () => {
    const tmpDir = mkdtempSync(path.join(baseDir, 'disabled-'));
    const cachePath = path.join(tmpDir, 'usage.json');

    const cache = new UsageCache('OpenAI', false, cachePath);
    cache.addUsage(buildEntry());

    expect(existsSync(cachePath)).toBe(false);
    const summary = cache.getSummary();
    expect(summary.totalCalls).toBe(0);
    expect(summary.entries).toHaveLength(0);
  });
});
