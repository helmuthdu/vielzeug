import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import { random } from './random';

/**
 * “Draw” a random item from an array.
 *
 * @example
 * ```ts
 * draw([1, 2, 3]) // 3
 * ```
 *
 * @param array - The array to draw from.
 *
 * @returns A random item from the array or `undefined` if the array is empty.
 *
 * @throws {TypeError} If the provided array is not an array.
 */
export const draw = <T>(array: T[]): T | undefined => {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  if (array.length === 0) return undefined;

  return array[random(0, array.length - 1)];
};
