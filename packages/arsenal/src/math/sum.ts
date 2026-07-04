import { ArsenalValidationError } from '../errors';

/**
 * Sum numbers in an array or numbers mapped by a callback function.
 *
 * @example
 * ```ts
 * sum([1, 2, 3]) // 6
 * sum([{value: 1}, {value: 2}, {value: 3}], (item) => item.value) // 6
 * sum(['apple', 'banana', 'cherry']) // ArsenalValidationError
 * ```
 *
 * @param array - The array to sum.
 * @param callback - An optional callback function to map the values.
 *
 * @returns The sum of the numbers in the array or the sum of the mapped values.
 *
 * @throws {ArsenalValidationError} If (after an optional `callback` mapping) any item is not a finite number.
 */
export function sum<T>(array: T[], callback?: (item: T) => number): number {
  if (array.length === 0) return 0;

  return array.reduce<number>((acc, item) => {
    const val = callback ? callback(item) : (item as unknown as number);

    if (typeof val !== 'number' || Number.isNaN(val)) {
      throw new ArsenalValidationError(
        'sum: encountered a non-numeric value; provide a callback to map non-number items',
      );
    }

    return acc + val;
  }, 0);
}
