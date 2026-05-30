import type { Obj } from '../types';

import { assert } from '../function/assert';
import { isObject } from '../typed/isObject';

/**
 * Typed wrapper for Object.values.
 */
export function values<T extends Obj>(obj: T): Array<T[keyof T]> {
  assert(isObject(obj), 'Expected an object', { args: { obj }, type: TypeError });

  return Object.values(obj) as Array<T[keyof T]>;
}
