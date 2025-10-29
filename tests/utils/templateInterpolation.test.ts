import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import {
  interpolateTemplate,
  hasTemplateVariables,
  extractTemplateVariables,
  validateTemplateVariables,
  interpolateLocator
} from '../../src/utils/templateInterpolation';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('templateInterpolation utils', () => {
  it('interpolateTemplate replaces placeholders with object variables', () => {
    const template = 'Hello {name}, you have {count} new messages';
    const result = interpolateTemplate(template, { name: 'John', count: 3 });
    expect(result).toBe('Hello John, you have 3 new messages');
  });

  it('interpolateTemplate resolves variables from function lazily', () => {
    const template = 'Dear {title} {lastName}';
    const result = interpolateTemplate(template, () => ({ title: 'Dr.', lastName: 'Smith' }));
    expect(result).toBe('Dear Dr. Smith');
  });

  it('interpolateTemplate keeps placeholder when variable missing', () => {
    const template = 'Order for {customer} ({id})';
    const result = interpolateTemplate(template, { customer: 'Alice' });
    expect(result).toBe('Order for Alice ({id})');
  });

  it('hasTemplateVariables detects placeholders correctly', () => {
    expect(hasTemplateVariables('Hello {name}')).toBe(true);
    expect(hasTemplateVariables('No placeholders here')).toBe(false);
  });

  it('extractTemplateVariables returns unique variable names', () => {
    const vars = extractTemplateVariables('User {id}: {name} ({id})');
    expect(vars).toEqual(['id', 'name']);
  });

  it('validateTemplateVariables identifies missing variables', () => {
    const validation = validateTemplateVariables('Hello {name}, id {id}', { name: 'Bob' });
    expect(validation).toEqual({ valid: false, missing: ['id'] });
  });

  it('validateTemplateVariables passes when all variables present', () => {
    const validation = validateTemplateVariables('Welcome {name}', { name: 'Eve' });
    expect(validation).toEqual({ valid: true, missing: [] });
  });

  it('interpolateLocator replaces variables and escapes quotes', () => {
    const locator = '//button[@aria-label="Edit \'{item}\'"]';
    const result = interpolateLocator(locator, { item: 'Bob "The Builder" O\'Neil' });
    expect(result).toBe('//button[@aria-label="Edit \'Bob \\"The Builder\\" O\\\'Neil\'"]');
  });
});
