import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Maps and filters in one pass. Returning `undefined` drops an item.
 */
export function filterMap<T, R>(array: T[], callback: (item: T, index: number, array: T[]) => R | undefined): R[] {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  const result: R[] = [];

  for (let index = 0; index < array.length; index++) {
    const value = callback(array[index], index, array);

    if (value !== undefined) {
      result.push(value);
    }
  }

  return result;
}
