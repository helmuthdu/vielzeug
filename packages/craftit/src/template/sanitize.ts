/**
 * XSS Protection & Sanitization
 * Security utilities for safe HTML rendering
 *
 * ⚠️ SECURITY NOTICE:
 * These utilities provide best-effort protection against common XSS vectors.
 * They are NOT a replacement for a hardened sanitization library like DOMPurify.
 *
 * For high-security contexts (user-generated content, untrusted sources),
 * use a dedicated, well-tested sanitization library.
 *
 * This module is designed for:
 * - Developer convenience in controlled environments
 * - Basic protection against accidental XSS
 * - Clear APIs for trusted vs untrusted content
 */

/**
 * Validate and sanitize CSS
 */
export function sanitizeCSS(css: string): string {
  // Remove potentially dangerous CSS
  const dangerous = [
    /javascript:/gi,
    /expression\s*\(/gi,
    /import\s+/gi,
    /@import/gi,
    /behavior\s*:/gi,
    /-moz-binding/gi,
  ];

  let sanitized = css;
  for (const pattern of dangerous) {
    sanitized = sanitized.replace(pattern, '');
  }

  return sanitized;
}

/**
 * Sanitize HTML string to prevent XSS attacks
 *
 * This is a BEST-EFFORT sanitizer that removes common XSS vectors:
 * - Dangerous elements (script, iframe, object, embed)
 * - Event handler attributes (onclick, onload, etc.)
 * - javascript: URLs in href attributes
 * - Dangerous inline styles (expression, javascript:, etc.)
 *
 * ⚠️ LIMITATIONS:
 * - Not context-aware (doesn't distinguish between HTML/attribute contexts)
 * - May miss exotic XSS vectors or browser-specific quirks
 * - For production security, use DOMPurify or equivalent
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove dangerous elements
  const dangerousElements = doc.querySelectorAll('script, iframe, object, embed, link[rel="import"]');
  for (const element of dangerousElements) {
    element.remove();
  }

  // Remove dangerous attributes
  const allElements = doc.querySelectorAll('*');
  for (const element of allElements) {
    // Remove event handlers, javascript: URLs, and sanitize styles
    for (const attr of Array.from(element.attributes)) {
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value.trim();

      // Remove event handlers (onclick, onload, etc.)
      if (attrName.startsWith('on')) {
        element.removeAttribute(attr.name);
        continue;
      }

      // Sanitize URLs in href and src
      if (attrName === 'href' || attrName === 'src') {
        if (attrValue.toLowerCase().startsWith('javascript:')) {
          element.removeAttribute(attr.name);
          continue;
        }
      }

      // Sanitize inline styles to remove dangerous CSS
      if (attrName === 'style') {
        element.setAttribute(attr.name, sanitizeCSS(attrValue));
      }
    }
  }

  return doc.body.innerHTML;
}

/**
 * Escape HTML special characters
 */
export function escapeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Mark string as trusted (bypass sanitization)
 * Use with extreme caution!
 */
export class TrustedHTML {
  public readonly content: string;

  constructor(content: string) {
    this.content = content;
  }

  toString(): string {
    return this.content;
  }
}

/**
 * Create trusted HTML string
 * Only use this when you're absolutely sure the content is safe
 */
export function trustHTML(html: string): TrustedHTML {
  return new TrustedHTML(html);
}

/**
 * Check if value is trusted
 */
export function isTrustedHTML(value: unknown): value is TrustedHTML {
  return value instanceof TrustedHTML;
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 *
 * ⚠️ TRADE-OFFS:
 * - Blocks javascript:, vbscript:, file:, and data: URIs
 * - data: URIs are blocked to prevent data exfiltration, but this breaks legitimate
 *   use cases like inline images (data:image/png;base64,...)
 * - For apps that need data URIs, consider a more sophisticated validator
 *
 * @param url - The URL to sanitize
 * @returns Sanitized URL or 'about:blank' if dangerous
 */
export function sanitizeURL(url: string): string {
  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    return 'about:blank';
  }

  return url;
}

/**
 * Sanitize attribute value
 *
 * @param name - Attribute name
 * @param value - Attribute value
 * @returns Sanitized value
 */
export function sanitizeAttribute(name: string, value: string): string {
  // Sanitize URLs in href and src
  if (name === 'href' || name === 'src') {
    return sanitizeURL(value);
  }

  // Remove event handlers
  if (name.startsWith('on')) {
    return '';
  }

  // Sanitize inline styles
  if (name === 'style') {
    return sanitizeCSS(value);
  }

  return value;
}

/**
 * Create a safe HTML builder
 *
 * Escapes interpolated values except those explicitly marked as TrustedHTML.
 *
 * ⚠️ POLICY INTEGRATION:
 * The returned TrustedHTML is only policy-aware when consumed via processValue().
 * If you bypass processValue(), the current security policy won't be enforced.
 *
 * @example
 * const userInput = '<script>alert("xss")</script>';
 * const trustedPart = trustHTML('<b>Bold</b>');
 * const html = safe`<div>${userInput} ${trustedPart}</div>`;
 * // Result: <div>&lt;script&gt;alert("xss")&lt;/script&gt; <b>Bold</b></div>
 */
export function safe(strings: TemplateStringsArray, ...values: unknown[]): TrustedHTML {
  const sanitizedValues = values.map((value) => {
    if (isTrustedHTML(value)) {
      return value.content;
    }
    if (typeof value === 'string') {
      return escapeHTML(value);
    }
    return String(value);
  });

  let result = strings[0];
  for (let i = 0; i < sanitizedValues.length; i++) {
    result += sanitizedValues[i] + strings[i + 1];
  }

  return new TrustedHTML(result);
}

/**
 * Strip all HTML tags from a string
 */
export function stripHTML(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * Security policy type
 *
 * Policy Options:
 * - sanitizeHTML: true = escape strings (prevent HTML injection)
 *                 false = allow raw strings (HTML included)
 * - sanitizeAttributes: true = sanitize attribute values (URLs, event handlers, styles)
 * - sanitizeURLs: true = block dangerous URL protocols
 * - allowTrusted: true = TrustedHTML bypasses sanitization
 *                 false = even TrustedHTML gets sanitized
 */
export interface SecurityPolicyConfig {
  sanitizeHTML: boolean;
  sanitizeAttributes: boolean;
  sanitizeURLs: boolean;
  allowTrusted: boolean;
}

/**
 * Security policies for different contexts
 */
export const SecurityPolicy = {
  /**
   * Moderate policy - allow trusted HTML (default)
   */
  MODERATE: {
    allowTrusted: true,
    sanitizeAttributes: true,
    sanitizeHTML: true,
    sanitizeURLs: true,
  },

  /**
   * Relaxed policy - minimal sanitization
   * Only sanitizes attributes and URLs, allows raw HTML
   */
  RELAXED: {
    allowTrusted: true,
    sanitizeAttributes: true,
    sanitizeHTML: false,
    sanitizeURLs: true,
  },
  /**
   * Strict policy - sanitize everything, even trusted content
   */
  STRICT: {
    allowTrusted: false,
    sanitizeAttributes: true,
    sanitizeHTML: true,
    sanitizeURLs: true,
  },
} satisfies Record<string, SecurityPolicyConfig>;

let currentPolicy: SecurityPolicyConfig = SecurityPolicy.MODERATE;

/**
 * Set global security policy
 */
export function setSecurityPolicy(policy: SecurityPolicyConfig): void {
  currentPolicy = policy;
}

/**
 * Get current security policy
 */
export function getSecurityPolicy(): SecurityPolicyConfig {
  return currentPolicy;
}

/**
 * Process value according to security policy
 *
 * This is the main integration point for the security policy system.
 *
 * Behavior:
 * - TrustedHTML: bypasses sanitization if allowTrusted=true, otherwise sanitized
 * - String with sanitizeHTML=true: HTML-escaped (< becomes &lt;, etc.)
 * - String with sanitizeHTML=false: returned as-is (allows raw HTML injection)
 * - Other types: converted to string
 *
 * @param value - The value to process
 * @returns Processed string safe for current security policy
 */
export function processValue(value: unknown): string {
  if (isTrustedHTML(value)) {
    if (currentPolicy.allowTrusted) {
      return value.content;
    }
    // Even trusted content gets sanitized in STRICT mode
    return sanitizeHTML(value.content);
  }

  if (typeof value === 'string') {
    if (currentPolicy.sanitizeHTML) {
      // Escape HTML characters to prevent injection
      return escapeHTML(value);
    }
    // Allow raw HTML (dangerous!)
    return value;
  }

  return String(value);
}
