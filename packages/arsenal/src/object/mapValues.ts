import type { Obj } from '../types';

import { assert } from '../function/assert';
import { IS_OBJECT_ERROR_MSG, isObject } from '../typed/isObject';

/**
 * Maps object values while preserving the original keys.
 */
export function mapValues<T extends Obj, R>(
  obj: T,
  mapper: (value: T[keyof T], key: keyof T, obj: T) => R,
): { [K in keyof T]: R } {
  assert(isObject(obj), IS_OBJECT_ERROR_MSG, { args: { obj }, type: TypeError });

  const out = {} as { [K in keyof T]: R };

  for (const key of Object.keys(obj) as Array<keyof T>) {
    out[key] = mapper(obj[key], key, obj);
  }

  return out;
}
