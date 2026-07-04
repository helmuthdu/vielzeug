import { average } from './average';

/**
 * Computes the population variance (average squared deviation from the mean) of an array of
 * numbers, or of values mapped by a callback.
 *
 * @example
 * ```ts
 * variance([2, 4, 4, 4, 5, 5, 7, 9]); // 4
 * variance([{ n: 1 }, { n: 3 }], (item) => item.n); // 1
 * variance([]); // 0
 * ```
 *
 * @param array - The array to compute variance over.
 * @param callback - An optional callback to map each item to a number.
 * @returns The population variance, or `0` for an empty array.
 */
export function variance<T>(array: T[], callback?: (item: T) => number): number {
  if (array.length === 0) return 0;

  const values = callback ? array.map(callback) : (array as unknown as number[]);
  const mean = average(values) ?? 0;

  return average(values.map((value) => (value - mean) ** 2)) ?? 0;
}
