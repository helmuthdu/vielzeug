/**
 * Restricts a number to be within a specified range.
 * Both `min` and `max` are optional — omitting one leaves that end unconstrained.
 *
 * @example
 * ```ts
 * clamp(5, 1, 10)  // 5  — within range
 * clamp(0, 1, 10)  // 1  — below min
 * clamp(15, 1, 10) // 10 — above max
 * clamp(15, 1)     // 15 — no max, above min
 * clamp(-5, undefined, 0) // -5 — no min, below max
 * ```
 *
 * @param n   - The number to clamp.
 * @param min - Optional lower bound (inclusive).
 * @param max - Optional upper bound (inclusive).
 *
 * @returns The clamped number.
 */
export function clamp(n: number, min?: number, max?: number): number {
  if (min != null && n < min) return min;

  if (max != null && n > max) return max;

  return n;
}
