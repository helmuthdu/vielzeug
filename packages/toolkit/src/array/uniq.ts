import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import type { Primitive, Selector } from '../types';

/**
 * Creates a new array with duplicate values removed.
 *
 * @example
 * ```ts
 * uniq([1, 2, 2, 3, 3, 3]); // [1, 2, 3]
 * const arrObj = [{ id: 1 }, { id: 2 }, { id: 2 }, { id: 3 }, { id: 3 }, { id: 3 }];
 * uniq(arrObj, 'id'); // [{ id: 1 }, { id: 2 }, { id: 3 }]
 * uniq(arrObj, item => item.id); // [{ id: 1 }, { id: 2 }, { id: 3 }]
 * ```
 *
 * @param array - The array to process.
 * @param [selector] - The key(s) to compare objects or a function to generate comparison values.

 * @returns A new duplicate-free array.

 * @throws {TypeError} - If the input is not an array or if the key is invalid.
 */
export function uniq<T>(array: T[], selector?: Selector<T>): T[] {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { type: TypeError });

  if (array.length <= 1) {
    return [...array];
  }

  if (!selector) {
    return [...new Set(array)];
  }

  const seen = new Map<Primitive, T>();
  const getKey = typeof selector === 'function' ? selector : (item: T) => item[selector];

  return array.filter((item) => {
    const key = getKey(item) as Primitive;
    if (seen.has(key)) {
      return false;
    }
    seen.set(key, item);
    return true;
  });
}

uniq.fp = true;
