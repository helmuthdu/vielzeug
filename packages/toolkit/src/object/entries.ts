import type { Obj } from '../types';

import { assert } from '../function/assert';
import { IS_OBJECT_ERROR_MSG, isObject } from '../typed/isObject';

/**
 * Typed wrapper for Object.entries.
 */
export function entries<T extends Obj>(obj: T): Array<[keyof T, T[keyof T]]> {
  assert(isObject(obj), IS_OBJECT_ERROR_MSG, { args: { obj }, type: TypeError });

  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
}
