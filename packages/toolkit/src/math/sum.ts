/**
 * Sum numbers in an array or numbers mapped by a callback function.
 *
 * @example
 * ```ts
 * sum([1, 2, 3]) // 6
 * sum([{value: 1}, {value: 2}, {value: 3}], (item) => item.value) // 6
 * sum(['apple', 'banana', 'cherry']) // TypeError
 * sum([new Date('2023-01-01'), new Date('2022-01-01')]) // 467308800000
 * ```
 *
 * @param array - The array to sum.
 * @param callback - An optional callback function to map the values.
 *
 * @returns The sum of the numbers in the array or the sum of the mapped values.
 */
export function sum<T>(array: T[], callback?: (item: T) => number | Date): number | Date | undefined {
  if (array.length === 0) return undefined;

  return array.reduce<number | Date | undefined>((acc, item) => {
    const value = callback ? callback(item) : item;
    if (value instanceof Date) {
      return sumDate(value, acc);
    }
    if (typeof value === 'number') {
      return sumNumbers(acc, value);
    }
    throw new TypeError('sum only supports numbers and Date objects');
  }, undefined);
}

function sumDate(value: Date, acc: number | Date | undefined) {
  const valueTime = value.getTime();
  if (acc === undefined) return new Date(valueTime);
  if (acc instanceof Date) return new Date(acc.getTime() + valueTime);
  return new Date(acc + valueTime);
}

function sumNumbers<T>(acc: number | Date | undefined, value: number | (T & number)) {
  if (acc === undefined) return value;
  if (acc instanceof Date) return new Date(acc.getTime() + value);
  return acc + value;
}
