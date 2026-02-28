/**
 * XSS Protection & Sanitization
 * Security utilities for safe HTML rendering
 */

/**
 * Sanitize HTML string to prevent XSS attacks
 */
export function sanitizeHTML(html: string): string {
  if (typeof DOMParser === 'undefined') {
    // Server-side fallback
    return html
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

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
    // Remove event handlers
    for (const attr of Array.from(element.attributes)) {
      if (attr.name.startsWith('on') || attr.name === 'href' && attr.value.trim().startsWith('javascript:')) {
        element.removeAttribute(attr.name);
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

  return value;
}

/**
 * Create a safe HTML builder
 */
export function safe(strings: TemplateStringsArray, ...values: unknown[]): TrustedHTML {
  const sanitizedValues = values.map(value => {
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
 * Security policy type
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
   * Strict policy - sanitize everything
   */
  STRICT: {
    sanitizeHTML: true,
    sanitizeAttributes: true,
    sanitizeURLs: true,
    allowTrusted: false,
  } as SecurityPolicyConfig,

  /**
   * Moderate policy - allow trusted HTML
   */
  MODERATE: {
    sanitizeHTML: true,
    sanitizeAttributes: true,
    sanitizeURLs: true,
    allowTrusted: true,
  } as SecurityPolicyConfig,

  /**
   * Relaxed policy - minimal sanitization
   */
  RELAXED: {
    sanitizeHTML: false,
    sanitizeAttributes: true,
    sanitizeURLs: true,
    allowTrusted: true,
  } as SecurityPolicyConfig,
};

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
 */
export function processValue(value: unknown): string {
  if (isTrustedHTML(value)) {
    if (currentPolicy.allowTrusted) {
      return value.content;
    }
    return sanitizeHTML(value.content);
  }

  if (typeof value === 'string') {
    if (currentPolicy.sanitizeHTML) {
      return escapeHTML(value);
    }
    return value;
  }

  return String(value);
}



