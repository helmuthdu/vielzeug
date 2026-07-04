import type { Primitive } from '../types';

import { dedupeBySelector } from '../_common/_selectorSet';

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
 */
export function uniq<T>(array: T[], selector?: (item: T) => Primitive): T[] {
  if (array.length <= 1) {
    return [...array];
  }

  if (!selector) {
    return [...new Set(array)];
  }

  return dedupeBySelector(array, selector);
}
