import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import type { Predicate } from '../types';
import { findIndex } from './findIndex';

/**
 * Replaces the first element in an array that satisfies the provided predicate function with a new value.
 *
 * @example
 * ```ts
 * substitute([1, 2, 3], (n) => n === 2, 4) // [1, 4, 3]
 * ```
 *
 * @param array - The array to search.
 * @param predicate - A function to test each element of the array.
 * @param value - The new value to replace the found element.
 *
 * @return A new array with the replaced value.
 *
 * @throws {TypeError} If the first argument is not an array.
 */
export function substitute<T>(array: T[], predicate: Predicate<T>, value: T): T[] {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  const index = findIndex(array, predicate);

  if (index === -1) return array;

  return [...array.slice(0, index), value, ...array.slice(index + 1)];
}

substitute.fn = true;
