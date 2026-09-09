/** Host attribute key normalization. */

/** Normalise a host-bind attr key: aria-camelCase → aria-kebab-case; other keys pass through. */
export const normalizeHostAttrKey = (key: string): string => {
  if (key === 'role' || key.startsWith('aria-')) return key;

  // 'ariaLabel' → 'aria-label', other keys unchanged
  return key.startsWith('aria') ? `aria-${key.slice(4).toLowerCase()}` : key;
};
