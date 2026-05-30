import type { Obj } from '../types';

import { assert } from '../function/assert';
import { isObject } from '../typed/isObject';

/**
 * Typed wrapper for Object.entries.
 */
export function entries<T extends Obj>(obj: T): Array<[keyof T, T[keyof T]]> {
  assert(isObject(obj), 'Expected an object', { args: { obj }, type: TypeError });

  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
}
