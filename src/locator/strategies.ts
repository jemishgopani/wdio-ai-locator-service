// Deterministic strategies used before calling AI.
// Each strategy returns a selector string to be tried by the engine.

/**
 * Robust XPath strategy for exact text match
 * Uses normalize-space() to handle whitespace and checks direct text nodes
 */
export function textExactSelector(text: string) {
  const escaped = escapeXPathQuotes(text);
  // Check both direct text and descendant text nodes
  return `xpath=//*[normalize-space(.)=${escaped} and not(descendant::*[normalize-space(.)=${escaped}])]`;
}

/**
 * Robust XPath strategy for text contains
 * Handles partial text matches with normalization
 */
export function textContainsSelector(text: string) {
  const escaped = escapeXPathQuotes(text);
  return `xpath=//*[contains(normalize-space(.), ${escaped})]`;
}

/**
 * Enhanced data-testid selector
 * Tries multiple data-* attributes commonly used for testing
 */
export function dataTestIdSelector(text: string) {
  const key = text.toLowerCase().replace(/\s+/g, '-');
  // Try multiple test attribute variations
  return `[data-testid*="${key}"],[data-test*="${key}"],[data-qa*="${key}"],[data-cy*="${key}"]`;
}

/**
 * Robust button selector with multiple strategies
 * Handles buttons, input[type=button], input[type=submit], and role=button
 */
export function buttonByTextSelector(text: string) {
  const lowerText = text.toLowerCase();
  const escapedLower = escapeXPathQuotes(lowerText);

  // Multiple button patterns:
  // 1. button element with text
  // 2. input with type button/submit and value
  // 3. Elements with role="button" and text
  // 4. Links that look like buttons
  return `xpath=//button[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), ${escapedLower})] | //input[@type='button' or @type='submit'][contains(translate(@value, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), ${escapedLower})] | //*[@role='button'][contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), ${escapedLower})]`;
}

/**
 * Link selector strategy
 * Handles anchor tags with text or aria-label
 */
export function linkByTextSelector(text: string) {
  const lowerText = text.toLowerCase();
  const escapedLower = escapeXPathQuotes(lowerText);

  return `xpath=//a[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), ${escapedLower}) or contains(translate(@aria-label, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), ${escapedLower})]`;
}

/**
 * Label-based input selector
 * Finds inputs associated with labels containing the text
 */
export function inputByLabelSelector(text: string) {
  const escaped = escapeXPathQuotes(text);

  // Strategy 1: label with for attribute
  // Strategy 2: input inside label
  // Strategy 3: input with aria-label or placeholder
  return `xpath=//label[contains(normalize-space(.), ${escaped})]/@for | //label[contains(normalize-space(.), ${escaped})]//input | //label[contains(normalize-space(.), ${escaped})]//textarea | //label[contains(normalize-space(.), ${escaped})]//select | //input[@aria-label=${escaped} or @placeholder=${escaped}] | //textarea[@aria-label=${escaped} or @placeholder=${escaped}]`;
}

/**
 * ARIA role-based selector
 * Uses ARIA roles and accessible names
 */
export function ariaRoleSelector(text: string) {
  const lowerText = text.toLowerCase();

  // Common interactive roles
  const roles = ['button', 'link', 'tab', 'menuitem', 'option', 'checkbox', 'radio', 'textbox'];
  const rolePaths = roles
    .map(
      (role) =>
        `//*[@role='${role}'][contains(translate(@aria-label, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${lowerText}') or contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${lowerText}')]`
    )
    .join(' | ');

  return `xpath=${rolePaths}`;
}

/**
 * ID and class-based selector for common patterns
 */
export function idClassSelector(text: string) {
  const key = text.toLowerCase().replace(/\s+/g, '-');
  // Try common ID/class naming patterns
  return `#${key},[id*="${key}"],[class*="${key}"]`;
}

/**
 * Heading selector (h1-h6)
 */
export function headingSelector(text: string) {
  const escaped = escapeXPathQuotes(text);
  return `xpath=//h1[normalize-space(.)=${escaped}] | //h2[normalize-space(.)=${escaped}] | //h3[normalize-space(.)=${escaped}] | //h4[normalize-space(.)=${escaped}] | //h5[normalize-space(.)=${escaped}] | //h6[normalize-space(.)=${escaped}]`;
}

/**
 * CSS candidate selector (pass-through)
 */
export function cssCandidate(selector: string) {
  return selector;
}

/**
 * Escape quotes in XPath expressions properly
 * Handles both single and double quotes
 */
function escapeXPathQuotes(text: string): string {
  // If text contains no quotes, wrap in quotes
  if (!text.includes("'") && !text.includes('"')) {
    return `"${text}"`;
  }

  // If text contains only single quotes, wrap in double quotes
  if (!text.includes('"')) {
    return `"${text}"`;
  }

  // If text contains only double quotes, wrap in single quotes
  if (!text.includes("'")) {
    return `'${text}'`;
  }

  // If text contains both, use concat()
  const parts = text.split("'");
  const concatParts = parts.map((part) => `"${part}"`).join(`,"'",`);
  return `concat(${concatParts})`;
}

/**
 * Escape quotes for CSS selectors
 */
