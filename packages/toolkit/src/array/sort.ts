import { assert } from '../function/assert';
import { compare } from '../function/compare';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Sorts an array of objects by a specific key in ascending order.
 *
 * @example
 * ```ts
 * const data = [{ a: 2 }, { a: 3 }, { a: 1 }];
 * sort(data, (item) => item.a); // [{ a: 1 }, { a: 2 }, { a: 3 }]
 * ```
 *
 * @param array - The array of objects to sort.
 * @param selector - A function that extracts the key to sort by.
 * @param desc - A boolean indicating whether to sort in descending order (default: false).
 *
 * @returns A new array sorted by the specified key.
 *
 * @throws {TypeError} If the provided array is not an array.
 */
// biome-ignore lint/suspicious/noExplicitAny: -
export const sort = <T>(array: T[], selector: (item: T) => any, desc = false) => {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  const multiplier = desc ? -1 : 1;

  return [...array].sort((a, b) => compare(selector(a), selector(b)) * multiplier);
};

sort.fp = true;
