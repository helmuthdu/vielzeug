/**
 * The `clamp` function restricts a number to be within a specified range.
 *
 * @example
 * ```ts
 * clamp(5, 1, 10) // 5
 * clamp(0, 1, 10) // 1
 * clamp(15, 1, 10) // 10
 * ```
 *
 * @param n - The number to be clamped.
 * @param min - The minimum value of the range.
 * @param max - The maximum value of the range.
 *
 * @returns The clamped number.
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
