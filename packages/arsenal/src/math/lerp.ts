/**
 * Linearly interpolates between `a` and `b` by factor `t`. `t` is not clamped, so values
 * outside `[0, 1]` extrapolate beyond the `[a, b]` range.
 *
 * @example
 * ```ts
 * lerp(0, 10, 0.5); // 5
 * lerp(0, 10, 1.5); // 15 (extrapolated — t is not clamped)
 * ```
 *
 * @param a - The start value (returned when `t` is `0`).
 * @param b - The end value (returned when `t` is `1`).
 * @param t - The interpolation factor.
 * @returns The interpolated value.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
