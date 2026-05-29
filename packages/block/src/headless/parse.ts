// ── Trigger string parser ─────────────────────────────────────────────────────

/**
 * Parses a comma-separated trigger string into a typed array, filtering against
 * a valid set and falling back to `defaults` when the input is empty or invalid.
 *
 * Used by tooltip and popover to normalise their `trigger` prop values.
 *
 * @example
 * ```ts
 * const VALID = new Set(['click', 'hover', 'focus'] as const);
 * parseStringTriggers('hover,focus', VALID, ['click']); // → ['hover', 'focus']
 * parseStringTriggers('',            VALID, ['click']); // → ['click']
 * ```
 */
export const parseStringTriggers = <T extends string>(
  value: string | null | undefined,
  valid: ReadonlySet<T>,
  defaults: T[],
): T[] => {
  const parsed = String(value ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t): t is T => valid.has(t as T));

  return parsed.length > 0 ? parsed : [...defaults];
};
