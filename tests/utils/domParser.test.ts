import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { extractMinimalDom } from '../../src/utils/domParser';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('extractMinimalDom', () => {
  it('removes disallowed elements and extra whitespace', () => {
    const html = '<div>\n  <script>alert(1)</script>\n  <span id="x"> Text </span>\n</div>';
    const result = extractMinimalDom(html);
    expect(result).toBe('<div><span id="x"> Text </span></div>');
  });

  it('strips HTML comments', () => {
    const html = '<div><!-- comment --><p>Visible</p></div>';
    const result = extractMinimalDom(html);
    expect(result).toBe('<div><p>Visible</p></div>');
  });

  it('truncates long DOM strings at tag boundaries', () => {
    const longContent = `<div>${'a'.repeat(2000)}</div>`;
    const result = extractMinimalDom(longContent, 100);
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result.startsWith('<div>')).toBe(true);
  });

  it('returns empty string when input is falsy', () => {
    expect(extractMinimalDom('')).toBe('');
  });
});
