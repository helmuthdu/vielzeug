import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import { IS_NUMBER_ERROR_MSG, isNumber } from '../typed/isNumber';

/**
 * Shifts the elements of an array to the left by a specified number of positions.
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4, 5];
 * shift(arr, 2); // [3, 4, 5]
 * shift(arr, 2, true); // [3, 4, 5, 1, 2]
 * ```
 * @param array - The array to shift.
 * @param positions - The number of positions to shift the array.
 * @param rotate - If `true`, the elements that are shifted out will be added to the end of the array.
 *
 * @returns A new array with the elements shifted.
 *
 * @throws {TypeError} If the first argument is not an array, or the second argument is not a number.
 */
export function shift<T>(array: T[], positions: number, rotate = false): T[] {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });
  assert(isNumber(positions), IS_NUMBER_ERROR_MSG, { args: { positions }, type: TypeError });

  if (array.length === 0) return array;

  const normalizedPos = ((positions % array.length) + array.length) % array.length;
  const shifted = array.slice(normalizedPos);

  return rotate ? [...shifted, ...array.slice(0, normalizedPos)] : shifted;
}

shift.fp = true;
