import type { Obj } from '../types';

import { assert } from '../function/assert';
import { isObject } from '../typed/isObject';

/**
 * Typed wrapper for Object.keys.
 */
export function keys<T extends Obj>(obj: T): Array<keyof T> {
  assert(isObject(obj), 'Expected an object', { args: { obj }, type: TypeError });

  return Object.keys(obj) as Array<keyof T>;
}
