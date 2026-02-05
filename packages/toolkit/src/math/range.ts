import { assert } from '../function/assert';

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
 *
 * @throws {TypeError} If start, stop, or step are not finite numbers.
 * @throws {Error} If step is 0 or if range exceeds maximum size.
 */
export function range(start: number, stop: number, step: number) {
  assert(
    Number.isFinite(start) && Number.isFinite(stop) && Number.isFinite(step),
    'start, stop, and step must be finite numbers',
    { args: { start, step, stop }, type: TypeError },
  );
  assert(step !== 0, 'Step cannot be 0', { args: { step }, type: Error });

  if (start === stop) {
    return [];
  }

  const length = Math.max(0, Math.ceil((stop - start) / step + Number.EPSILON));

  assert(length <= 10_000_000, 'Range exceeds maximum allowed size of 10,000,000', {
    args: { length, start, step, stop },
    type: Error,
  });

  return Array.from({ length }, (_, i) => start + i * step);
}
