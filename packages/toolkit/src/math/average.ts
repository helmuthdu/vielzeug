import { sum } from './sum';

/**
 * Calculates the average of an array of numbers.
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4, 5];
 * average(arr); // 3
 * average(arr, (num) => num * 2); // 6
 * ```
 *
 * @param array - The array to average.
 * @param callback - (optional) A callback function to map each item to a number.
 * @returns The average, or `undefined` if the array is empty or contains non-numeric values.
 */
export function average<T>(array: T[], callback?: (item: T) => number): number | undefined {
  if (array.length === 0) return undefined;

  try {
    const result = sum(array, callback) / array.length;

    return Number.isNaN(result) ? undefined : result;
  } catch {
    return undefined;
  }
}
