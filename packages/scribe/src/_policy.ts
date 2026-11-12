/**
 * Security policy shared by the parser and renderers: HTML escaping and the destination
 * sanitizer that enforces the link/image protocol allowlist. Slug, outline, and inline-text
 * helpers live in `_text.ts`.
 */

const ESCAPE_MAP: Record<string, string> = {
  "'": '&#39;',
  '"': '&quot;',
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

/** Escape the five HTML-significant characters. Every dynamic string reaching HTML goes through this. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);
}

/** Drop control characters and spaces (the `java\nscript:` trick must not read as relative). */
function stripControls(value: string): string {
  let out = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x20 || code === 0x7f) continue;
    out += char;
  }
  return out;
}

/**
 * Reduce a raw link/image destination to the string the protocol policy must judge.
 *
 * Whitespace and control characters are stripped, and numeric character references are
 * decoded until the value stops changing, so `&#58;javascript:` or double-encoded variants
 * cannot slip a scheme past the check.
 */
export function normalizeDestination(raw: string): string {
  let value = stripControls(raw);
  for (let pass = 0; pass < 3; pass += 1) {
    const decoded = value.replace(/&#(\d+|x[0-9a-fA-F]+);/g, (entity, digits: string) => {
      const codePoint =
        digits.startsWith('x') || digits.startsWith('X')
          ? Number.parseInt(digits.slice(1), 16)
          : Number.parseInt(digits, 10);
      return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    });
    const stripped = stripControls(decoded);
    if (stripped === value) break;
    value = stripped;
  }
  return value;
}

/**
 * Validate a destination against the allowlist. Returns the normalized destination when the
 * URL is acceptable, or `null` when the caller must degrade the link/image to plain text.
 *
 * Relative URLs (no scheme before the first path/query/fragment separator) are accepted:
 * prose legitimately links within its own site. `data:` is always rejected, even if a caller
 * lists it, because `data:image/svg+xml` is a script vector.
 */
export function sanitizeDestination(raw: string, protocols: ReadonlySet<string>): string | null {
  const value = normalizeDestination(raw);
  if (value === '') return null;
  const firstSeparator = value.search(/[/?#]/);
  const colon = value.indexOf(':');
  if (colon === -1) return value;
  if (firstSeparator !== -1 && firstSeparator < colon) return value; // relative with a late colon
  const scheme = value.slice(0, colon).toLowerCase();
  if (scheme === 'data') return null;
  return protocols.has(scheme) ? value : null;
}

// ---------------------------------------------------------------------------
// Heading slugs
// ---------------------------------------------------------------------------
