import type { Obj } from '../types';

import { assert } from '../function/assert';
import { IS_OBJECT_ERROR_MSG, isObject } from '../typed/isObject';

/**
 * Creates a new object without the selected keys.
 */
export function omit<T extends Obj, K extends keyof T>(obj: T, omittedKeys: readonly K[]): Omit<T, K> {
  assert(isObject(obj), IS_OBJECT_ERROR_MSG, { args: { obj }, type: TypeError });

  const blacklist = new Set<PropertyKey>(omittedKeys as readonly PropertyKey[]);
  const out = {} as Omit<T, K>;

  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (!blacklist.has(key)) {
      (out as T)[key] = obj[key];
    }
  }

  return out;
}
