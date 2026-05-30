import type { Obj } from '../types';

import { assert } from '../function/assert';
import { isObject } from '../typed/isObject';

/**
 * Creates a new object containing only selected keys.
 */
export function pick<T extends Obj, K extends keyof T>(obj: T, selectedKeys: readonly K[]): Pick<T, K> {
  assert(isObject(obj), 'Expected an object', { args: { obj }, type: TypeError });

  const out = {} as Pick<T, K>;

  for (const key of selectedKeys) {
    if (key in obj) {
      out[key] = obj[key];
    }
  }

  return out;
}
