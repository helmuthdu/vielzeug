import { ArsenalError } from '../errors';

/**
 * Creates an array of numbers from `0` up to, but not including, `stop` with step `1`.
 *
 * @example
 * ```ts
 * range(5) // [0, 1, 2, 3, 4]
 * ```
 */
export function range(stop: number): number[];
/**
 * Creates an array of numbers from `start` up to, but not including, `stop` with step `1`.
 *
 * @example
 * ```ts
 * range(2, 6) // [2, 3, 4, 5]
 * ```
 */
export function range(start: number, stop: number): number[];
/**
 * Creates an array of numbers progressing from `start` up to, but not including, `stop` with a given `step`.
 *
 * @example
 * ```ts
 * range(0, 10, 2) // [0, 2, 4, 6, 8]
 * range(10, 0, -2) // [10, 8, 6, 4, 2]
 * ```
 *
 * @param start - The start of the range.
 * @param stop - The end of the range (exclusive).
 * @param step - The value to increment or decrement by.
 *
 * @returns The range of numbers.
 *
 * @throws {ArsenalError} If start, stop, or step are not finite numbers, step is 0, or range exceeds maximum size.
 */
export function range(start: number, stop: number, step: number): number[];
export function range(startOrStop: number, stop?: number, step?: number): number[] {
  const [resolvedStart, resolvedStop, resolvedStep] =
    stop === undefined ? [0, startOrStop, 1] : step === undefined ? [startOrStop, stop, 1] : [startOrStop, stop, step];

  if (!Number.isFinite(resolvedStart) || !Number.isFinite(resolvedStop) || !Number.isFinite(resolvedStep)) {
    throw new ArsenalError('range: start, stop, and step must be finite numbers');
  }

  if (resolvedStep === 0) throw new ArsenalError('range: step cannot be 0');

  if (resolvedStart === resolvedStop) {
    return [];
  }

  const raw = (resolvedStop - resolvedStart) / resolvedStep;
  const length = Math.max(0, Number.isInteger(raw) ? raw : Math.ceil(raw + Number.EPSILON));

  if (length > 10_000_000) throw new ArsenalError('range: exceeds maximum allowed size of 10,000,000');

  return Array.from({ length }, (_, i) => resolvedStart + i * resolvedStep);
}
