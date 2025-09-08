import { assert } from '../function/assert';
import { similarity } from '../string/similarity';
import { is } from '../typed/is';
import { IS_WITHIN_ERROR_MSG, isWithin } from '../typed/isWithin';

/**
 * Recursively checks if an object contains a value similar to the search string.
 *
 * @example
 * ```ts
 * const obj = { a: 'hello', b: { c: 'world' }, d: [1, 2, 3] };
 *
 * seek(obj, 'hello'); // true
 * seek(obj, 'world'); // true
 * seek(obj, 'foo'); // false
 * seek(obj, 'hello', 0.5); // true
 * seek(obj, 'hello', 0.8); // true
 * seek(obj, 'hello', 1); // true
 * seek(obj, 'hello', 1.5); // false
 * seek(obj, 'hello', -1); // false
 * seek(obj, 'hello', 0); // false
 * ```
 *
 * @param item - The object to search within.
 * @param query - The search string.
 * @param [tone=1] - The similarity threshold.
 *
 * @returns Whether the object contains a matching value.
 */
export function seek<T>(item: T, query: string, tone = 1): boolean {
  assert(isWithin(tone, 0, 1), IS_WITHIN_ERROR_MSG, { args: { max: 1, min: 0, tone }, type: TypeError });

  if (is('string', item) || is('number', item)) {
    // Lowercase both sides for case-insensitive comparison
    return similarity(item, query) >= tone;
  }

  return Object.values(item as Record<string, unknown>).some((value) => {
    if (is('nil', value)) return false;

    if (is('array', value)) {
      return value.some((v) => (is('object', v) ? seek(v, query, tone) : similarity(v, query) >= tone));
    }

    if (is('object', value)) {
      return seek(value, query, tone);
    }

    return similarity(value, query) >= tone;
  });
}
