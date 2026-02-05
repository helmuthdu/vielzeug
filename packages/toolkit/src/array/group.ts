import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import type { Selector } from '../types';

/**
 * Groups the elements of an array based on the given key.
 *
 * @example
 * ```ts
 * const data = [{ a: 2 }, { a: 1 }];
 * group(data, 'a') // { '1': [{ a: 2 }], '2': [{ a: 1 }] };
 * ```
 *
 * @param array - The array to group.
 * @param selector - The function to generate the key for each element. It can be a string representing the key or a function that returns the key.
 *
 * @returns an object with keys as the grouped values and values as arrays of elements.
 *
 * @throws {TypeError} If the provided array is not an array.
 */
export function group<T, _K extends keyof T, R extends string | number | symbol>(
  array: T[],
  selector: Selector<T>,
): Record<R, T[]> {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  const result = {} as Record<R, T[]>;
  const getKey = typeof selector === 'function' ? selector : (item: T) => item[selector];

  for (const item of array) {
    const rawKey = getKey(item);
    const key = (rawKey === undefined || rawKey === null ? '_' : String(rawKey)) as R;

    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }

  return result;
}

group.fp = true;
