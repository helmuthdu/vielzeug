import type { Obj } from '../types';

/**
 * Maps object values while preserving the original keys.
 */
export function mapValues<T extends Obj, R>(
  obj: T,
  mapper: (value: T[keyof T], key: keyof T, obj: T) => R,
): { [K in keyof T]: R } {
  const out = {} as { [K in keyof T]: R };

  for (const key of Object.keys(obj) as Array<keyof T>) {
    out[key] = mapper(obj[key], key, obj);
  }

  return out;
}
