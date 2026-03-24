/**
 * Returns the median of an array of numbers.
 *
 * @example
 * ```ts
 * median([1, 2, 3, 4, 100]); // 3
 * median([1, 2, 3, 4, 5], (n) => n * 2); // 6
 * median([]); // undefined
 * median([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // 5.5
 * ```
 *
 * @param arr - The array of numbers.
 * @param callback - (optional) A callback function to map each item to a number.
 * @returns The median, or `undefined` if the array is empty.
 */
export function median<T>(arr: T[], callback?: (item: T) => number): number | undefined {
  if (arr.length === 0) return undefined;

  const values = callback ? arr.map(callback) : [...(arr as unknown as number[])];

  values.sort((a, b) => a - b);

  const mid = Math.floor(values.length / 2);

  return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
}
