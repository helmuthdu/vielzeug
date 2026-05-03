import { assert } from '../function/assert';
import { similarity } from '../string/similarity';
import { isArray } from '../typed/isArray';
import { isNil } from '../typed/isNil';
import { isNumber } from '../typed/isNumber';
import { isObject } from '../typed/isObject';
import { isString } from '../typed/isString';

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
function _seek<T>(item: T, query: string, tone: number): boolean {
  if (isNil(item)) return false;

  if (isString(item) || isNumber(item)) {
    return similarity(String(item), query) >= tone;
  }

  if (isArray(item)) {
    return (item as unknown[]).some((value) => _seek(value, query, tone));
  }

  if (isObject(item)) {
    return Object.values(item as Record<string, unknown>).some((value) =>
      isNil(value) ? false : _seek(value, query, tone),
    );
  }

  return false;
}

export function seek<T>(item: T, query: string, tone = 1): boolean {
  assert(typeof tone === 'number' && tone >= 0 && tone <= 1, 'Tone must be a number between 0 and 1', {
    args: { tone },
    type: TypeError,
  });

  return _seek(item, query, tone);
}
