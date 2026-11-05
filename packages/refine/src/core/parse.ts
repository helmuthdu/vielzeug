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

// ── Boolean attribute parser ──────────────────────────────────────────────────

/**
 * Parses a boolean HTML attribute value into `true | false | undefined`, where
 * `undefined` means "attribute absent": the signal controlled components (`open`)
 * use to distinguish uncontrolled from controlled mode.
 *
 * The grammar is the standard attribute one: presence with no value (`open`) or
 * the literal `"true"` is true; anything else, including `"false"`, is false.
 * Every controlled overlay (dialog, drawer, menu, popover, tooltip,
 * command-palette) parses its `open` prop with this exact contract.
 */
export const parseOptionalBool = (value: string | null): boolean | undefined =>
  value == null ? undefined : value === '' || value === 'true';

// ── Detent list parser ────────────────────────────────────────────────────────

/**
 * Parses a comma-separated list of detent fractions into a sorted, deduplicated
 * array of numbers in the open interval (0, 1): `detents="0.5,0.75"`. A detent
 * fraction is the share of the panel that stays on-screen when a dragged panel
 * comes to rest there (`0.5` = half-open). Entries outside (0, 1) are dropped;
 * an absent or fully-invalid attribute yields `undefined` ("no detents"), which
 * keeps the component two-state (fully open / fully closed).
 */
export const parseDetents = (value: string | null): readonly number[] | undefined => {
  if (value == null) return undefined;

  const fractions = [
    ...new Set(
      value
        .split(',')
        .map((entry) => Number.parseFloat(entry.trim()))
        .filter((entry) => entry > 0 && entry < 1),
    ),
  ].sort((a, b) => a - b);

  return fractions.length > 0 ? fractions : undefined;
};
