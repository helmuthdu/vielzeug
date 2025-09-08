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
  let total: number | Date | undefined;
  try {
    total = sum(array, callback);
  } catch (err) {
    if (err instanceof TypeError) return undefined;
    throw err;
  }
  if (typeof total === 'number') {
    return total / array.length;
  }
  if (total instanceof Date) {
    // For dates, average by dividing the timestamp sum by array length
    return new Date(total.getTime() / array.length);
  }
  return undefined;
}
