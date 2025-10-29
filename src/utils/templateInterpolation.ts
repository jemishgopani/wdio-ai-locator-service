import { log } from './logger';

/**
 * Interpolate template string with variables.
 * Replaces {variableName} with corresponding value from variables object.
 *
 * @param template Template string with {variable} placeholders
 * @param variables Object containing variable values or function returning variables
 * @returns Interpolated string
 *
 * @example
 * interpolateTemplate('Hello {name}', { name: 'John' }) // 'Hello John'
 * interpolateTemplate('User {id}: {name}', { id: 123, name: 'Alice' }) // 'User 123: Alice'
 */
export function interpolateTemplate(
  template: string,
  variables?: Record<string, string | number> | (() => Record<string, string | number>)
): string {
  if (!variables) {
    return template;
  }

  // Resolve variables if function (lazy evaluation)
  const resolvedVariables = typeof variables === 'function' ? variables() : variables;

  if (!resolvedVariables || Object.keys(resolvedVariables).length === 0) {
    return template;
  }

  // Replace {variableName} with actual values
  const result = template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = resolvedVariables[key];
    if (value === undefined || value === null) {
      log(`Warning: Variable '${key}' not found in variables, keeping placeholder`);
      return match; // Keep placeholder if variable not found
    }
    return String(value);
  });

  log('Template interpolation:', { template, variables: resolvedVariables, result });
  return result;
}

/**
 * Detect if a template string contains variable placeholders.
 *
 * @param template Template string to check
 * @returns True if template contains {variable} placeholders
 *
 * @example
 * hasTemplateVariables('Hello {name}') // true
 * hasTemplateVariables('Hello World') // false
 */
export function hasTemplateVariables(template: string): boolean {
  return /\{(\w+)\}/.test(template);
}

/**
 * Extract variable names from a template string.
 *
 * @param template Template string with {variable} placeholders
 * @returns Array of variable names found in template
 *
 * @example
 * extractTemplateVariables('User {id}: {name}') // ['id', 'name']
 * extractTemplateVariables('Hello World') // []
 */
export function extractTemplateVariables(template: string): string[] {
  const matches = template.match(/\{(\w+)\}/g);
  if (!matches) {
    return [];
  }

  // Extract variable names without braces and remove duplicates
  const variables = matches.map((match) => match.slice(1, -1));
  return Array.from(new Set(variables));
}

/**
 * Validate that all template variables have corresponding values.
 *
 * @param template Template string with {variable} placeholders
 * @param variables Variables object
 * @returns Object with validation result and missing variables
 *
 * @example
 * validateTemplateVariables('Hello {name}', { name: 'John' })
 * // { valid: true, missing: [] }
 *
 * validateTemplateVariables('User {id}: {name}', { name: 'Alice' })
 * // { valid: false, missing: ['id'] }
 */
export function validateTemplateVariables(
  template: string,
  variables?: Record<string, any>
): { valid: boolean; missing: string[] } {
  const requiredVars = extractTemplateVariables(template);

  if (requiredVars.length === 0) {
    return { valid: true, missing: [] };
  }

  if (!variables) {
    return { valid: false, missing: requiredVars };
  }

  const missing = requiredVars.filter(
    (varName) => variables[varName] === undefined || variables[varName] === null
  );

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Interpolate locator string with variables, preserving selector syntax.
 * Replaces {variableName} with corresponding value, properly escaping for XPath/CSS.
 *
 * @param locator Locator string with {variable} placeholders (XPath or CSS selector)
 * @param variables Object containing variable values
 * @returns Interpolated locator string
 *
 * @example
 * interpolateLocator("//button[text()='{buttonText}']", { buttonText: 'Login' })
 * // "//button[text()='Login']"
 *
 * interpolateLocator("button[data-user='{userId}']", { userId: '123' })
 * // "button[data-user='123']"
 */
export function interpolateLocator(
  locator: string,
  variables?: Record<string, string | number>
): string {
  if (!variables || Object.keys(variables).length === 0) {
    return locator;
  }

  // Replace {variableName} with actual values
  const result = locator.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key];
    if (value === undefined || value === null) {
      log(
        `Warning: Variable '${key}' not found in variables for locator interpolation, keeping placeholder`
      );
      return match; // Keep placeholder if variable not found
    }
    // Escape special characters for XPath/CSS selectors
    return String(value).replace(/'/g, "\\'").replace(/"/g, '\\"');
  });

  log('Locator interpolation:', { locator, variables, result });
  return result;
}
