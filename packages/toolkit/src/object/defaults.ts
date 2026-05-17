import type { Obj } from '../types';

import { assert } from '../function/assert';
import { IS_OBJECT_ERROR_MSG, isObject } from '../typed/isObject';

/**
 * Applies default values for missing or undefined keys.
 */
export function defaults<T extends Obj>(target: T, ...sources: Array<Partial<T>>): T {
  assert(isObject(target), IS_OBJECT_ERROR_MSG, { args: { target }, type: TypeError });

  const out = { ...target };

  for (const source of sources) {
    if (!isObject(source)) continue;

    for (const key of Object.keys(source) as Array<keyof T>) {
      if (out[key] === undefined) {
        out[key] = source[key] as T[keyof T];
      }
    }
  }

  return out;
}
