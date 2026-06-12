/**
 * Creates an array of evenly-spaced numbers from `start` to `end`.
 *
 * @example
 * ```ts
 * linspace(0, 10);        // [0, 2.5, 5, 7.5, 10]
 * linspace(0, 10, 3);     // [0, 5, 10]
 * linspace(0, 10, 1);     // [0]
 * linspace(10, 0, 5);     // [10, 7.5, 5, 2.5, 0]
 * ```
 *
 * @param start - The start of the range.
 * @param end - The end of the range.
 * @param steps - Number of evenly-spaced points to generate (default: 5).
 *
 * @returns An array of `steps` numbers from `start` to `end`.
 */
export function linspace(start: number, end: number, steps = 5): number[] {
  if (steps <= 0) return [];

  if (steps === 1) return [start];

  const stepSize = (end - start) / (steps - 1);

  return Array.from({ length: steps }, (_, i) => start + i * stepSize);
}
