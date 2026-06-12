import type { Obj } from '../types';

/**
 * Filters object entries using a value predicate.
 */
export function filterValues<T extends Obj>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T, obj: T) => boolean,
): Partial<T> {
  const out: Partial<T> = {};

  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;

    if (predicate(obj[key], key, obj)) {
      out[key] = obj[key];
    }
  }

  return out;
}
