import { assert } from '../function/assert';
import { IS_OBJECT_ERROR_MSG, isObject } from '../typed/isObject';
import type { Obj } from '../types';

/**
 * Returns an array of the keys for an object's properties.
 *
 * @example
 * ```ts
 * const obj = { a: 1, b: 2, c: 3 };
 *
 * keys(obj); // ['a', 'b', 'c']
 * ```
 *
 * @param item - The object to query.
 *
 * @returns true if the object has the property, false otherwise.
 */
export function keys<T extends Obj, K extends keyof T>(item: T) {
  assert(isObject(item), IS_OBJECT_ERROR_MSG, { args: { item }, type: TypeError });

  return Object.keys(item) as K[];
}
