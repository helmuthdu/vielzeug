import { assert } from '../function/assert';
import { IS_OBJECT_ERROR_MSG, isObject } from '../typed/isObject';
import type { Obj } from '../types';

type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T][];

/**
 * Returns an array of a given object's own enumerable string-keyed property [key, value] pairs.
 *
 * @example
 * ```ts
 * const obj = { a: 1, b: 2, c: 3 };
 * entries(obj); // logs [['a', 1], ['b', 2], ['c', 3]]
 * ```
 *
 * @param item - The object whose properties are to be returned.
 *
 * @returns an array of the object's own enumerable string-keyed property [key, value] pairs.
 */
export function entries<T extends Obj>(item: T): Entries<T> {
  assert(isObject(item), IS_OBJECT_ERROR_MSG, { args: { item }, type: TypeError });

  return Object.entries(item) as Entries<T>;
}
