/**
 * Creates an array of numbers progressing from min to max with a specified number of steps.
 *
 * @example
 * ```ts
 * const min = 0;
 * const max = 10;
 * const steps = 5;
 *
 * rate(min, max, steps) // [0, 2.5, 5, 7.5, 10];
 * ```
 *
 * @param min - The start of the range.
 * @param max - The end of the range.
 * @param [steps=5] - The number of steps between min and max.
 *
 * @returns The range of numbers.
 */
export function rate(min: number, max: number, steps = 5) {
  if (steps === 1) return [min];
  const stepSize = (max - min) / (steps - 1);
  return Array.from({ length: steps }, (_, i) => min + i * stepSize);
}
