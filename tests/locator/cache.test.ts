import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { LocatorCache } from '../../src/locator/cache';
import { LocatorResult } from '../../src/types';

const tmpRoot = path.join(process.cwd(), '.tmp-tests');

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  rmSync(tmpRoot, { recursive: true, force: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe('LocatorCache', () => {
  it('persists selectors to disk on set()', () => {
    mkdirSync(tmpRoot, { recursive: true });
    const tmpDir = mkdtempSync(path.join(tmpRoot, 'locator-cache-'));
    const filePath = path.join(tmpDir, 'cache.json');

    const cache = new LocatorCache(filePath);
    const locator: LocatorResult = {
      best: '#login-btn',
      alternates: ['//button[text()="Login"]'],
      isTemplate: false
    };

    cache.set('login::button', locator);

    const persisted = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(persisted['login::button']).toEqual(locator);
  });

  it('loads existing cache file on init', () => {
    mkdirSync(tmpRoot, { recursive: true });
    const tmpDir = mkdtempSync(path.join(tmpRoot, 'locator-cache-load-'));
    const filePath = path.join(tmpDir, 'cache.json');

    const existing: Record<string, LocatorResult> = {
      'https://example.com::search box': {
        best: '#search',
        alternates: ['//input[@name="search"]'],
        isTemplate: false
      }
    };

    writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8');

    const cache = new LocatorCache(filePath);
    const loaded = cache.get('https://example.com::search box');
    expect(loaded).toEqual(existing['https://example.com::search box']);
  });
});
