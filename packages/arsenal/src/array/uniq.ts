import type { Primitive } from '../types';

import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Creates a new array with duplicate values removed.
 *
 * @example
 * ```ts
 * uniq([1, 2, 2, 3, 3, 3]); // [1, 2, 3]
 * const arrObj = [{ id: 1 }, { id: 2 }, { id: 2 }, { id: 3 }, { id: 3 }, { id: 3 }];
 * uniq(arrObj, item => item.id); // [{ id: 1 }, { id: 2 }, { id: 3 }]
 * ```
 *
 * @param array - The array to process.
 * @param [selector] - Function used to generate comparison values for each item.

 * @returns A new duplicate-free array.

 * @throws {TypeError} - If the input is not an array.
 */
export function uniq<T>(array: T[], selector?: (item: T) => Primitive): T[] {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { type: TypeError });

  if (array.length <= 1) {
    return [...array];
  }

  if (!selector) {
    return [...new Set(array)];
  }

  const seen = new Set<Primitive>();

  return array.filter((item) => {
    const key = selector(item) as Primitive;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}
