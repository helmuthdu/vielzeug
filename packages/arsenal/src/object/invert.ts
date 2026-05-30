import { assert } from '../function/assert';
import { IS_OBJECT_ERROR_MSG, isObject } from '../typed/isObject';

/**
 * Inverts key-value pairs.
 */
export function invert<T extends Record<PropertyKey, PropertyKey>>(obj: T): Record<T[keyof T], keyof T> {
  assert(isObject(obj), IS_OBJECT_ERROR_MSG, { args: { obj }, type: TypeError });

  const out = {} as Record<T[keyof T], keyof T>;

  for (const [key, value] of Object.entries(obj) as Array<[keyof T, T[keyof T]]>) {
    out[value] = key;
  }

  return out;
}
