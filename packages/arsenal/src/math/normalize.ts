import { clamp } from './clamp';

/**
 * Normalizes a value from the range `[min, max]` into `[0, 1]`. The result is clamped, so
 * values outside `[min, max]` map to `0` or `1` rather than extrapolating.
 *
 * @example
 * ```ts
 * normalize(5, 0, 10); // 0.5
 * normalize(-5, 0, 10); // 0 (clamped)
 * normalize(15, 0, 10); // 1 (clamped)
 * ```
 *
 * @param value - The value to normalize.
 * @param min - The lower bound of the source range.
 * @param max - The upper bound of the source range.
 * @returns The normalized value in `[0, 1]`, or `0` if `min === max`.
 */
export function normalize(value: number, min: number, max: number): number {
  if (min === max) return 0;

  return clamp((value - min) / (max - min), 0, 1);
}
