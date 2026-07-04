/**
 * Coerces `n` to a positive integer >= 1. Non-finite values (`NaN`, `Infinity`,
 * `-Infinity`) are treated as invalid input — same as any other out-of-range
 * number — and fall back to `1` rather than silently propagating a value that
 * would defeat every downstream bounds check (`length >= NaN` and `length >= Infinity`
 * are never true, which would otherwise make a "capped" buffer grow unbounded).
 * @internal
 */
export function clampPositiveInt(n: number): { clamped: boolean; value: number } {
  const value = Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;

  return { clamped: value !== n, value };
}
