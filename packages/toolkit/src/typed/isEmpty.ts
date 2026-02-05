import { isArray } from './isArray';
import { isNil } from './isNil';
import { isObject } from './isObject';

/**
 * Checks if the given argument is empty.
 *
 * @example
 * ```ts
 * isEmpty(null); // true
 * isEmpty(undefined); // true
 * isEmpty([]); // true
 * isEmpty({}); // true
 * isEmpty(''); // true
 * isEmpty(0); // false
 * isEmpty(123); // false
 * isEmpty('abc'); // false
 * isEmpty([1, 2, 3]); // false
 * isEmpty({ a: 1, b: 2 }); // false
 * ```
 *
 * @param arg - The argument to be checked.
 *
 * @returns `true` if all arguments are `null`, `undefined`, `{}`, `[]`, or empty strings. Otherwise, it returns `false`.
 */
// biome-ignore lint/suspicious/noExplicitAny: -
export function isEmpty(arg: any): boolean {
  if (isNil(arg) || arg === '') return true;
  if (isArray(arg)) return arg.length === 0;
  if (arg instanceof Map || arg instanceof Set) return arg.size === 0;
  if (isObject(arg)) return Object.keys(arg).length === 0;
  return false;
}

export const IS_EMPTY_ERROR_MSG = 'Expected an empty value';
