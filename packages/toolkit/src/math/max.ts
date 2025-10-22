import { compare } from '../function/compare';
import { boil } from './boil';

/**
 * Finds the maximum item in an array.
 *
 * @description
 * This function can be used to find the maximum number, string, or any other type of item in an array.
 *
 * @example
 * ```ts
 * max([1, 2, 3]); // 3
 * max([{ value: 1 }, { value: 2 }, { value: 3 }], item => item.value); // 3
 * max(['apple', 'banana', 'cherry']); // 'cherry'
 * max([new Date('2023-01-01'), new Date('2022-01-01')]); // 2023-01-01
 * ```
 *
 * @param array - The array to be searched.
 * @param [callback] - (optional) The function to invoke for each element in the array to determine its value.
 *
 * @return The item with the maximum value as determined by the callback function.
 *
 * @throws {TypeError} If the provided array is not an array.
 */
export function max<T>(array: T[], callback?: (item: T) => string | number | Date): T | undefined {
  return boil(array, (a, b) => {
    const fn = callback || ((item: T) => item);
    return compare(fn(a), fn(b)) > 0 ? a : b;
  });
}
