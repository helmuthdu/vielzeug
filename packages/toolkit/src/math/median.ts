/**
 * Returns the median of an array of numbers.
 *
 * @example
 * ```ts
 * median([1, 2, 3, 4, 100]); // 3
 * median([1, 2, 3, 4, 5], (n) => n * 2); // 6
 * median([]); // undefined
 * median([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // 5.5
 * median([new Date(2020-01-01), new Date(2020-01-02), new Date(2020-01-31)]) // 2020-01-02
 * ```
 *
 * @param arr - The array of numbers.
 * @param callback - (optional) A callback function to map the numbers.
 * @returns The median of the numbers.
 */
export function median<T>(arr: T[], callback?: (item: T) => number | Date): number | Date | undefined {
  if (arr.length === 0) return undefined;

  const values = callback ? arr.map(callback) : (arr as unknown as (number | Date)[]);
  const allDates = values.every((v) => v instanceof Date);
  const numericValues = values.map((v) => (v instanceof Date ? v.getTime() : (v as number)));

  numericValues.sort((a, b) => a - b);

  const mid = Math.floor(numericValues.length / 2);
  const medianValue =
    numericValues.length % 2 === 0 ? (numericValues[mid - 1] + numericValues[mid]) / 2 : numericValues[mid];

  return (allDates ? new Date(medianValue) : medianValue) as unknown as number | Date;
}
