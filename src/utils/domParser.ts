import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize and minimize HTML for AI processing using sanitize-html package
 * Removes: scripts, styles, comments, unnecessary attributes, extra whitespace
 * Keeps: semantic structure, text content, IDs, classes, data attributes, ARIA
 */
export function extractMinimalDom(serializedDom: string, maxChars = 10000) {
  if (!serializedDom) return '';

  // Use sanitize-html to clean the DOM
  let cleaned = sanitizeHtml(serializedDom, {
    // Allow most HTML tags that are useful for locators
    allowedTags: [
      'div',
      'span',
      'p',
      'a',
      'button',
      'input',
      'textarea',
      'select',
      'option',
      'form',
      'label',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'table',
      'thead',
      'tbody',
      'tr',
      'td',
      'th',
      'nav',
      'header',
      'footer',
      'main',
      'section',
      'article',
      'aside',
      'img',
      'video',
      'audio',
      'iframe',
      'canvas',
      'details',
      'summary',
      'dialog',
      'menu',
      'menuitem'
    ],
    // Keep only attributes useful for locators
    allowedAttributes: {
      '*': [
        'id',
        'class',
        'name',
        'type',
        'role',
        'aria-*',
        'data-*',
        'for',
        'placeholder',
        'value',
        'alt',
        'title',
        'href',
        'src',
        'action',
        'method',
        'disabled',
        'readonly',
        'checked',
        'selected',
        'required'
      ]
    },
    // Remove all disallowed tags completely (including content)
    disallowedTagsMode: 'discard',
    // Remove scripts and styles
    allowedSchemes: ['http', 'https', 'mailto'],
    // Don't allow CSS classes
    allowedClasses: {},
    // Allow all data attributes
    allowProtocolRelative: true,
    // Remove empty elements
    exclusiveFilter: (frame) => {
      // Remove empty divs and spans without attributes
      if (
        (frame.tag === 'div' || frame.tag === 'span') &&
        !frame.text.trim() &&
        Object.keys(frame.attribs).length === 0
      ) {
        return true;
      }
      return false;
    }
  });

  // Additional cleanup: Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // Collapse multiple spaces into one
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Remove spaces between tags
  cleaned = cleaned.replace(/>\s+</g, '><');

  // Remove empty attributes
  cleaned = cleaned.replace(/\s+\w+\s*=\s*["']\s*["']/g, '');

  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();

  // If still too large, truncate intelligently at tag boundaries
  if (cleaned.length > maxChars) {
    const truncated = cleaned.slice(0, maxChars);
    const lastClosingTag = truncated.lastIndexOf('</');

    if (lastClosingTag > maxChars * 0.8) {
      // Close enough to the end, truncate at closing tag
      const closingTagEnd = truncated.indexOf('>', lastClosingTag);
      if (closingTagEnd !== -1) {
        cleaned = truncated.slice(0, closingTagEnd + 1);
      } else {
        cleaned = truncated;
      }
    } else {
      // Just truncate at maxChars
      cleaned = truncated;
    }
  }

  return cleaned;
}
