import type { Obj } from '../types';

import { assert } from '../function/assert';
import { IS_OBJECT_ERROR_MSG, isObject } from '../typed/isObject';

/**
 * Filters object entries using a value predicate.
 */
export function filterValues<T extends Obj>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T, obj: T) => boolean,
): Partial<T> {
  assert(isObject(obj), IS_OBJECT_ERROR_MSG, { args: { obj }, type: TypeError });

  const out: Partial<T> = {};

  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (predicate(obj[key], key, obj)) {
      out[key] = obj[key];
    }
  }

  return out;
}
