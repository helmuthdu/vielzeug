import { sum } from './sum';

/**
 * Calculates the average of an array of numbers or dates.
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4, 5];
 * average(arr); // 3
 * average(arr, (num) => num * 2); // 6
 * average(arr, (num) => new Date(Date.now() + 1000 * 60 * 60 * 24 * num); // Date object representing 3 days from now
 * ```
 *
 * @param array - The array of numbers or dates to average.
 * @param callback - (optional) A callback function to map the values.
 * @returns The average of the numbers or dates in the array.
 */

export function average<T>(array: T[], callback?: (item: T) => number | Date): number | Date | undefined {
  if (array.length === 0) return undefined;

  // Check if we are dealing with Dates (either directly or via callback)
  const firstItem = callback ? callback(array[0]) : array[0];
  const isDate = firstItem instanceof Date;

  if (isDate) {
    const totalTimestamp = array.reduce<number>((acc, item) => {
      const val = callback ? callback(item) : item;
      if (!(val instanceof Date)) {
        throw new TypeError('average expected all items to be Date objects');
      }
      return acc + val.getTime();
    }, 0);
    return new Date(totalTimestamp / array.length);
  }

  // Handle numbers
  try {
    const total = sum(array, callback as (item: T) => number);
    if (typeof total === 'number') {
      return total / array.length;
    }
  } catch (err) {
    if (err instanceof TypeError) return undefined;
    throw err;
  }

  return undefined;
}
