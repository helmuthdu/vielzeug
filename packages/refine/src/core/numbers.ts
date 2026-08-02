// ── Number helpers ────────────────────────────────────────────────────────────

/**
 * Coerces `value` via `Number()` and returns it when finite, `undefined` otherwise.
 *
 * Caveat: `null` and `''` both coerce to `0` in JavaScript (`Number(null) === 0`,
 * `Number('') === 0`) and are therefore returned as the finite number `0`, not
 * `undefined` — this function does not treat "absent" values specially. Only
 * genuinely non-numeric input (`undefined`, `NaN`, non-numeric strings) yields
 * `undefined`. Callers that mean "no bound set" should pass `undefined`
 * explicitly rather than `null` or `''`.
 */
export const toFiniteNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
};

export const toFiniteNumberOr = (value: unknown, fallback: number): number => {
  return toFiniteNumber(value) ?? fallback;
};

export const toPositiveStep = (value: unknown, fallback: number): number => {
  return Math.abs(toFiniteNumberOr(value, fallback)) || fallback;
};
