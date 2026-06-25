/**
 * Shared ARIA attribute key normalisation helpers.
 *
 * Two flavours are needed across the codebase:
 *
 * - `normalizeAriaKey`  — always adds the `aria-` prefix for non-role keys.
 *   Used by `syncAria()` where every config key is an ARIA attribute.
 *
 * - `normalizeHostAttrKey` — passes non-ARIA keys through unchanged.
 *   Used by `host.bind({ attr: ... })` where keys may be arbitrary HTML attributes.
 */

/** Normalise an aria config key to a full `aria-*` attribute name. */
export const normalizeAriaKey = (key: string): string => {
  if (key === 'role' || key.startsWith('aria-')) return key;

  // 'ariaLabel' → 'aria-label', 'expanded' → 'aria-expanded'
  return key.startsWith('aria') ? `aria-${key.slice(4).toLowerCase()}` : `aria-${key}`;
};

/** Normalise a host-bind attr key: aria-camelCase → aria-kebab-case; other keys pass through. */
export const normalizeHostAttrKey = (key: string): string => {
  if (key === 'role' || key.startsWith('aria-')) return key;

  // 'ariaLabel' → 'aria-label', other keys unchanged
  return key.startsWith('aria') ? `aria-${key.slice(4).toLowerCase()}` : key;
};
