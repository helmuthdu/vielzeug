import { assert } from '../function/assert';
import { seek } from '../object/seek';
import { IS_STRING_ERROR_MSG, isString } from '../typed/isString';
import { IS_WITHIN_ERROR_MSG, isWithin } from '../typed/isWithin';
import { filter } from './filter';

/**
 * Performs a search on an array of objects, checking all values for a match with the search string.
 *
 * @example
 * ```ts
 * const data = [{ name: 'John Doe', age: 25 }, { name: 'Jane Doe', age: 30 }];
 * search(data, 'doe', 0.5); // [{ name: 'John Doe', age: 25 }, { name: 'Jane Doe', age: 30 }]
 * ```
 *
 * @param array - The array of objects to search.
 * @param query - The string to search for.
 * @param [tone=0.25] - Degree of similarity between 0 and 1.
 *
 * @returns The filtered array of objects that match the search string.
 *
 * @throws {Error} If input values are invalid.
 */
export function search<T>(array: T[], query: string, tone = 0.25): T[] {
  assert(isString(query), IS_STRING_ERROR_MSG, { args: { query }, type: TypeError });
  assert(isWithin(tone, 0, 1), IS_WITHIN_ERROR_MSG, { args: { max: 1, min: 0, tone }, type: TypeError });

  if (!query) return [];

  const searchTerm = query.toLowerCase();

  return filter(array, (obj) => seek(obj, searchTerm, tone));
}
