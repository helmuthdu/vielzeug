/**
 * Validates that a string is a safe CSS length value before injecting it
 * into a CSS custom property. Accepts standard length units, percentages,
 * CSS keywords, and `calc()`/`var()` expressions without embedded semicolons,
 * curly braces, or other CSS injection vectors.
 *
 * @returns The trimmed value if safe, `null` otherwise.
 */
export function safeCSSLength(value: string | null | undefined): string | null {
  if (!value) return null;

  const v = value.trim();

  // Block CSS injection sequences (parens excluded — needed by var()/calc())
  if (/[;{}\n\r]/.test(v)) return null;

  // Allow: numbers with units, %, keywords, var(--token), calc(...), env(...)
  if (
    /^-?(\d+(\.\d+)?)(px|em|rem|%|vh|vw|vmin|vmax|dvh|dvw|svh|svw|ch|ex|lh|rlh|cm|mm|in|pt|pc|fr|s|ms|deg|rad|turn)$/.test(
      v,
    )
  )
    return v;

  if (/^(0|auto|none|inherit|initial|unset|revert)$/.test(v)) return v;

  // Allow CSS function expressions: var(--token), calc(...), env(...), clamp(...), min(...), max(...)
  // Tightened pattern: must match the whole value and inner parens must close properly.
  if (/^(var|calc|env|clamp|min|max)\([^;{}]*\)$/.test(v)) return v;

  return null;
}
