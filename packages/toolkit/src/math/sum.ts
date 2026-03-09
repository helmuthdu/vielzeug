/**
 * Sum numbers in an array or numbers mapped by a callback function.
 *
 * @example
 * ```ts
 * sum([1, 2, 3]) // 6
 * sum([{value: 1}, {value: 2}, {value: 3}], (item) => item.value) // 6
 * sum(['apple', 'banana', 'cherry']) // TypeError
 * ```
 *
 * @param array - The array to sum.
 * @param callback - An optional callback function to map the values.
 *
 * @returns The sum of the numbers in the array or the sum of the mapped values.
 */
export function sum<T>(array: T[], callback?: (item: T) => number): number {
  if (array.length === 0) return 0;

  return array.reduce<number>((acc, item) => {
    const val = callback ? callback(item) : (item as unknown as number);
    if (Number.isNaN(val)) {
      throw new TypeError('Cannot sum NaN values');
    }
    return acc + val;
  }, 0);
}
