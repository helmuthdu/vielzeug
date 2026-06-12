import type { Obj } from '../types';

/**
 * Creates a new object without the selected keys.
 */
export function omit<T extends Obj, K extends keyof T>(obj: T, omittedKeys: readonly K[]): Omit<T, K> {
  const blacklist = new Set<PropertyKey>(omittedKeys as readonly PropertyKey[]);
  const out = {} as Omit<T, K>;

  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;

    if (!blacklist.has(key)) {
      (out as T)[key] = obj[key];
    }
  }

  return out;
}
