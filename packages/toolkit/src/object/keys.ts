import type { Obj } from '../types';

import { assert } from '../function/assert';
import { IS_OBJECT_ERROR_MSG, isObject } from '../typed/isObject';

/**
 * Typed wrapper for Object.keys.
 */
export function keys<T extends Obj>(obj: T): Array<keyof T> {
  assert(isObject(obj), IS_OBJECT_ERROR_MSG, { args: { obj }, type: TypeError });

  return Object.keys(obj) as Array<keyof T>;
}
