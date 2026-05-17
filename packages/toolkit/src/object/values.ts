import type { Obj } from '../types';

import { assert } from '../function/assert';
import { IS_OBJECT_ERROR_MSG, isObject } from '../typed/isObject';

/**
 * Typed wrapper for Object.values.
 */
export function values<T extends Obj>(obj: T): Array<T[keyof T]> {
  assert(isObject(obj), IS_OBJECT_ERROR_MSG, { args: { obj }, type: TypeError });

  return Object.values(obj) as Array<T[keyof T]>;
}
