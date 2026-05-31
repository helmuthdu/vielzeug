import type { Obj } from '../types';

/**
 * Creates a new object containing only selected keys.
 */
export function pick<T extends Obj, K extends keyof T>(obj: T, selectedKeys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;

  for (const key of selectedKeys) {
    if (key in obj) {
      out[key] = obj[key];
    }
  }

  return out;
}
