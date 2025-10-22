import { assert } from '../function/assert';
import { IS_OBJECT_ERROR_MSG, isObject } from '../typed/isObject';
import type { Obj } from '../types';

/**
 * Returns an array of values for an object's properties
 *
 * @example
 * ```ts
 * const obj = { a: 1, b: 2, c: 3 };
 * toValues(obj); // [1, 2, 3]
 * ```
 *
 * @param item - The object whose property values are to be returned.
 *
 * @returns an array of the object's own enumerable string-keyed property values.
 */
export function values<T extends Obj, K extends keyof T>(item: T) {
  assert(isObject(item), IS_OBJECT_ERROR_MSG, { args: { item }, type: TypeError });

  return Object.values(item) as T[K][];
}
