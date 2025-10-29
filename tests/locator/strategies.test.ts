import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import {
  textExactSelector,
  textContainsSelector,
  dataTestIdSelector,
  buttonByTextSelector,
  linkByTextSelector,
  inputByLabelSelector,
  ariaRoleSelector,
  idClassSelector,
  headingSelector,
  cssCandidate
} from '../../src/locator/strategies';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('locator strategies', () => {
  it('textExactSelector produces normalized XPath with escaped quotes', () => {
    const selector = textExactSelector(`Bob "The Builder" O'Neil`);
    expect(selector.startsWith('xpath=')).toBe(true);
    expect(selector.includes('normalize-space(.)=concat(')).toBe(true);
    expect(selector.includes('The Builder')).toBe(true);
    expect(selector.includes('Neil')).toBe(true);
  });

  it('textContainsSelector generates contains() XPath pattern', () => {
    const selector = textContainsSelector('Submit');
    expect(selector).toBe('xpath=//*[contains(normalize-space(.), "Submit")]');
  });

  it('dataTestIdSelector covers common data attribute variations', () => {
    const selector = dataTestIdSelector('Login Button');
    expect(selector).toBe(
      '[data-testid*="login-button"],[data-test*="login-button"],[data-qa*="login-button"],[data-cy*="login-button"]'
    );
  });

  it('buttonByTextSelector combines multiple button strategies', () => {
    const selector = buttonByTextSelector('Checkout');
    expect(
      selector.includes(
        "//button[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), \"checkout\")]"
      )
    ).toBe(true);
    expect(
      selector.includes(
        "//input[@type='button' or @type='submit'][contains(translate(@value, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), \"checkout\")]"
      )
    ).toBe(true);
    expect(
      selector.includes(
        "//*[@role='button'][contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), \"checkout\")]"
      )
    ).toBe(true);
  });

  it('linkByTextSelector handles text and aria-label matches', () => {
    const selector = linkByTextSelector('Pricing');
    expect(
      selector.includes(
        "//a[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), \"pricing\")"
      )
    ).toBe(true);
    expect(
      selector.includes(
        "contains(translate(@aria-label, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), \"pricing\")"
      )
    ).toBe(true);
  });

  it('inputByLabelSelector targets label associations and accessibility attributes', () => {
    const selector = inputByLabelSelector('Email Address');
    expect(selector.includes('//label[contains(normalize-space(.), "Email Address")]/@for')).toBe(
      true
    );
    expect(selector.includes('//label[contains(normalize-space(.), "Email Address")]//input')).toBe(
      true
    );
    expect(
      selector.includes('//input[@aria-label="Email Address" or @placeholder="Email Address"]')
    ).toBe(true);
  });

  it('ariaRoleSelector builds OR conditions across common roles', () => {
    const selector = ariaRoleSelector('Dashboard');
    expect(selector.startsWith('xpath=')).toBe(true);
    expect(selector.includes("//*[@role='button']")).toBe(true);
    expect(selector.includes('dashboard')).toBe(true);
  });

  it('idClassSelector generates ID and class-based selectors', () => {
    const selector = idClassSelector('Primary Action');
    expect(selector).toBe('#primary-action,[id*="primary-action"],[class*="primary-action"]');
  });

  it('headingSelector targets all heading levels', () => {
    const selector = headingSelector('Overview');
    expect(selector.includes('//h1[normalize-space(.)="Overview"]')).toBe(true);
    expect(selector.includes('//h6[normalize-space(.)="Overview"]')).toBe(true);
  });

  it('cssCandidate returns selector unchanged', () => {
    const selector = '.my-class > button';
    expect(cssCandidate(selector)).toBe(selector);
  });
});
