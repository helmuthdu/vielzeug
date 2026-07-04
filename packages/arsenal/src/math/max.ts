import { compare } from '../array/compare';

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
 */
export function max<T>(array: T[], callback?: (item: T) => string | number | Date): T | undefined {
  if (array.length === 0) return undefined;

  const fn = callback ?? ((item: T) => item);
  let current = array[0];

  for (let i = 1; i < array.length; i++) {
    if (compare(fn(array[i]), fn(current)) > 0) {
      current = array[i];
    }
  }

  return current;
}
