import { log } from './logger';

/**
 * XPath Utilities for validation, normalization, and optimization
 */

/**
 * Validate if a string is a valid XPath expression
 */
export function isValidXPath(xpath: string): boolean {
  if (!xpath || typeof xpath !== 'string') {
    return false;
  }

  // Remove xpath= prefix if present
  const cleanXpath = xpath.replace(/^xpath=/, '');

  // Basic XPath syntax validation
  const xpathPatterns = [
    /^\/\//, // Starts with //
    /^\/[^\/]/, // Starts with single /
    /^\(/ // Starts with (
  ];

  return xpathPatterns.some((pattern) => pattern.test(cleanXpath.trim()));
}

/**
 * Normalize XPath to remove common issues
 */
export function normalizeXPath(xpath: string): string {
  if (!xpath) return xpath;

  let normalized = xpath.trim();

  // Remove xpath= prefix if present (WebDriverIO doesn't use this format)
  if (normalized.startsWith('xpath=')) {
    normalized = normalized.substring(6);
  }

  // Remove surrounding backticks or quotes if present
  normalized = normalized.replace(/^[`'"]+|[`'"]+$/g, '');

  // Normalize whitespace in XPath predicates
  normalized = normalized.replace(/\s+/g, ' ');

  // Return without xpath= prefix - WebDriverIO's $() handles XPath natively
  return normalized;
}

/**
 * Score XPath expression for stability and maintainability
 * Higher score = more stable
 */
export function scoreXPath(xpath: string): number {
  if (!xpath) return 0;

  const cleanXpath = xpath.replace(/^xpath=/, '');
  let score = 50; // Base score

  // Positive factors
  if (cleanXpath.includes('normalize-space')) score += 15;
  if (cleanXpath.includes('@data-testid') || cleanXpath.includes('@data-test')) score += 30;
  if (cleanXpath.includes('@aria-label') || cleanXpath.includes('@role')) score += 25;
  if (cleanXpath.includes('@id') && !/@id=["'][^"']*\d{3,}/.test(cleanXpath)) score += 20;
  if (cleanXpath.includes('@name')) score += 15;
  if (cleanXpath.includes('@placeholder')) score += 10;
  if (cleanXpath.includes('translate(') && cleanXpath.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ'))
    score += 10;
  if (/^\/\/[a-z]+\[/.test(cleanXpath)) score += 10; // Starts with //element[
  if (cleanXpath.includes('following-sibling') || cleanXpath.includes('preceding-sibling'))
    score += 5;

  // Negative factors
  if (/\[\d+\]/.test(cleanXpath)) score -= 20; // Has positional predicates like [1], [2]
  if ((cleanXpath.match(/\//g) || []).length > 10) score -= 15; // Too many slashes (deep nesting)
  if (/\/html\/body\/div\[\d+\]/.test(cleanXpath)) score -= 25; // Starts with absolute path
  if (cleanXpath.includes('div/div/div/div')) score -= 15; // Too many divs
  if (/@id=["'][^"']*\d{5,}/.test(cleanXpath)) score -= 20; // Generated IDs with many numbers
  if (/@class=["'][^"']*[a-f0-9]{8,}/.test(cleanXpath)) score -= 15; // Hash-based classes
  if ((cleanXpath.match(/\[/g) || []).length > 5) score -= 10; // Too many predicates

  return Math.max(0, Math.min(100, score));
}

/**
 * Optimize XPath by removing unnecessary parts
 */
export function optimizeXPath(xpath: string): string {
  if (!xpath) return xpath;

  let optimized = xpath.replace(/^xpath=/, '');

  // Remove redundant /descendant-or-self::node()/ patterns
  optimized = optimized.replace(/\/descendant-or-self::node\(\)\//g, '//');

  // Simplify //*/element to //element
  optimized = optimized.replace(/\/\/\*\//g, '//');

  // Remove unnecessary . in normalize-space(.)
  // Already optimal, keep as is

  // Remove spaces around operators
  optimized = optimized.replace(/\s*(=|!=|<|>|\|)\s*/g, '$1');

  // Return without xpath= prefix - WebDriverIO handles XPath natively
  return optimized;
}

/**
 * Check if XPath uses positional predicates (brittle)
 */
export function usesPositionalPredicates(xpath: string): boolean {
  const cleanXpath = xpath.replace(/^xpath=/, '');
  return /\[\d+\]/.test(cleanXpath);
}

/**
 * Check if XPath is relative (preferred) vs absolute
 */
export function isRelativeXPath(xpath: string): boolean {
  const cleanXpath = xpath.replace(/^xpath=/, '').trim();
  return cleanXpath.startsWith('//');
}

/**
 * Extract element type from XPath
 */
export function extractElementType(xpath: string): string | null {
  const cleanXpath = xpath.replace(/^xpath=/, '');

  // Match patterns like //button, //input, //div
  const match = cleanXpath.match(/^\/\/([a-z]+)[\[\/\s]/i);
  if (match) {
    return match[1];
  }

  // Match patterns like //*[@role='button']
  const roleMatch = cleanXpath.match(/@role=['"]([^'"]+)['"]/);
  if (roleMatch) {
    return roleMatch[1];
  }

  return null;
}

/**
 * Suggest improvements for XPath
 */
export function suggestXPathImprovements(xpath: string): string[] {
  const suggestions: string[] = [];
  const cleanXpath = xpath.replace(/^xpath=/, '');

  if (usesPositionalPredicates(xpath)) {
    suggestions.push('Avoid positional predicates like [1], [2] - they are brittle');
  }

  if (!isRelativeXPath(xpath)) {
    suggestions.push('Use relative XPath (//element) instead of absolute (/html/body/...)');
  }

  if (!cleanXpath.includes('normalize-space') && cleanXpath.includes('text()')) {
    suggestions.push('Consider using normalize-space() to handle whitespace better');
  }

  if ((cleanXpath.match(/\//g) || []).length > 8) {
    suggestions.push('XPath is too deep - consider using // or more specific attributes');
  }

  if (/@id=["'][^"']*\d{5,}/.test(cleanXpath)) {
    suggestions.push('ID appears to be generated - may not be stable');
  }

  if (!cleanXpath.includes('@data-testid') && !cleanXpath.includes('@data-test')) {
    suggestions.push('Consider using data-testid attributes for more reliable selectors');
  }

  return suggestions;
}

/**
 * Compare two XPath expressions and return the better one
 */
export function chooseBetterXPath(xpath1: string, xpath2: string): string {
  const score1 = scoreXPath(xpath1);
  const score2 = scoreXPath(xpath2);

  log('XPath comparison:', {
    xpath1: { path: xpath1, score: score1 },
    xpath2: { path: xpath2, score: score2 }
  });

  return score1 >= score2 ? xpath1 : xpath2;
}

/**
 * Validate and score multiple XPath candidates, return best
 */
export function selectBestXPath(candidates: string[]): string | null {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  const validCandidates = candidates
    .filter((xpath) => isValidXPath(xpath))
    .map((xpath) => ({
      xpath,
      score: scoreXPath(xpath),
      suggestions: suggestXPathImprovements(xpath)
    }));

  if (validCandidates.length === 0) {
    return null;
  }

  // Sort by score descending
  validCandidates.sort((a, b) => b.score - a.score);

  const best = validCandidates[0];

  log('Best XPath selected:', {
    xpath: best.xpath,
    score: best.score,
    suggestions: best.suggestions
  });

  return best.xpath;
}
