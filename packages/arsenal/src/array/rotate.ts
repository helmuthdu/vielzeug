import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import { IS_NUMBER_ERROR_MSG, isNumber } from '../typed/isNumber';

/**
 * Rotates the elements of an array by a specified number of positions.
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4, 5];
 * rotate(arr, 2); // [3, 4, 5]
 * rotate(arr, 2, { wrap: true }); // [3, 4, 5, 1, 2]
 * ```
 * @param array - The array to rotate.
 * @param positions - The number of positions to rotate the array.
 * @param [options] - Options for the rotate operation.
 * @param [options.wrap] - If `true`, the rotated-out elements are appended to the end.
 *
 * @returns A new array with the elements rotated.
 *
 * @throws {TypeError} If the first argument is not an array, or the second argument is not a number.
 */
export function rotate<T>(array: T[], positions: number, { wrap = false }: { wrap?: boolean } = {}): T[] {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });
  assert(isNumber(positions), IS_NUMBER_ERROR_MSG, { args: { positions }, type: TypeError });

  if (array.length === 0) return array;

  const normalizedPos = ((positions % array.length) + array.length) % array.length;
  const rotated = array.slice(normalizedPos);

  return wrap ? [...rotated, ...array.slice(0, normalizedPos)] : rotated;
}
