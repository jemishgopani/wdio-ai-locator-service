import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import {
  isValidXPath,
  normalizeXPath,
  scoreXPath,
  optimizeXPath,
  usesPositionalPredicates,
  isRelativeXPath,
  extractElementType,
  suggestXPathImprovements,
  chooseBetterXPath,
  selectBestXPath
} from '../../src/utils/xpathUtils';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('xpathUtils', () => {
  it('isValidXPath detects valid XPath patterns', () => {
    expect(isValidXPath('//div[@id="main"]')).toBe(true);
    expect(isValidXPath('xpath=//span[text()="Hello"]')).toBe(true);
    expect(isValidXPath('div[@id="main"]')).toBe(false);
  });

  it('normalizeXPath removes prefixes and trims whitespace', () => {
    const normalized = normalizeXPath(" xpath=//div[@id='app'] ");
    expect(normalized).toBe("//div[@id='app']");
  });

  it('scoreXPath rewards stable patterns and penalizes brittle ones', () => {
    const stableScore = scoreXPath("//button[normalize-space(.)='Login']");
    const brittleScore = scoreXPath('//div/div/div/div');
    expect(stableScore).toBe(75);
    expect(brittleScore).toBe(35);
  });

  it('optimizeXPath removes redundant segments', () => {
    const optimized = optimizeXPath('xpath=//div/descendant-or-self::node()/span');
    expect(optimized).toBe('//div//span');
  });

  it('usesPositionalPredicates identifies positional selectors', () => {
    expect(usesPositionalPredicates('//div[1]')).toBe(true);
    expect(usesPositionalPredicates('//div[@id="main"]')).toBe(false);
  });

  it('isRelativeXPath detects relative XPath expressions', () => {
    expect(isRelativeXPath('//section')).toBe(true);
    expect(isRelativeXPath('xpath=/html/body')).toBe(false);
  });

  it('extractElementType returns tag or role information', () => {
    expect(extractElementType('//button[@id="submit"]')).toBe('button');
    expect(extractElementType("//*[@role='link']")).toBe('link');
  });

  it('suggestXPathImprovements provides actionable feedback', () => {
    const suggestions = suggestXPathImprovements('xpath=/html/body/div[1]');
    expect(suggestions).toContain('Avoid positional predicates like [1], [2] - they are brittle');
    expect(suggestions).toContain(
      'Use relative XPath (//element) instead of absolute (/html/body/...)'
    );
    expect(suggestions).toContain(
      'Consider using data-testid attributes for more reliable selectors'
    );
  });

  it('chooseBetterXPath returns higher scoring candidate', () => {
    const better = chooseBetterXPath("//button[normalize-space(.)='Login']", '//div[1]');
    expect(better).toBe("//button[normalize-space(.)='Login']");
  });

  it('selectBestXPath validates candidates and picks top score', () => {
    const best = selectBestXPath(['div', '//div[1]', "//button[@data-testid='submit']"]);
    expect(best).toBe("//button[@data-testid='submit']");
  });
});
