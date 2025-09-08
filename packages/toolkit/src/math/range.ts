/**
 * Creates an array of numbers progressing from start up to, but not including, end. A step is used to specify the difference between each number in the array.
 *
 * @example
 * ```ts
 * const start = 0;
 * const stop = 10;
 * const step = 2;
 *
 * range(start, stop, step) // [0, 2, 4, 6, 8];
 * ```
 *
 * @param start - The start of the range.
 * @param stop - The end of the range.
 * @param step - The value to increment or decrement by.
 *
 * @returns The range of numbers.
 */
export function range(start: number, stop: number, step: number) {
  if (step === 0) throw new Error('Step cannot be 0');
  if (start === stop) return [];
  const length = Math.max(0, Math.ceil((stop - start) / step + Number.EPSILON));
  return Array.from({ length }, (_, i) => start + i * step);
}
