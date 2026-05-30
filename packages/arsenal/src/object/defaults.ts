import type { Obj } from '../types';

import { isObject } from '../typed/isObject';

/**
 * Applies default values for missing or undefined keys.
 */
export function defaults<T extends Obj>(target: T, ...sources: Array<Partial<T>>): T {
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
