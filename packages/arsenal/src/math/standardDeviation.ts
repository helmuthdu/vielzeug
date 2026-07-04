import { variance } from './variance';

/**
 * Computes the population standard deviation (square root of `variance`) of an array of
 * numbers, or of values mapped by a callback.
 *
 * @example
 * ```ts
 * standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]); // 2
 * standardDeviation([]); // 0
 * ```
 *
 * @param array - The array to compute standard deviation over.
 * @param callback - An optional callback to map each item to a number.
 * @returns The population standard deviation, or `0` for an empty array.
 */
export function standardDeviation<T>(array: T[], callback?: (item: T) => number): number {
  return Math.sqrt(variance(array, callback));
}
