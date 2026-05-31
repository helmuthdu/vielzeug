import type { Obj } from '../types';

/**
 * Maps object keys while preserving values.
 */
export function mapKeys<T extends Obj>(
  obj: T,
  mapper: (key: keyof T, value: T[keyof T], obj: T) => PropertyKey,
): Record<PropertyKey, T[keyof T]> {
  const out: Record<PropertyKey, T[keyof T]> = {};

  for (const key of Object.keys(obj) as Array<keyof T>) {
    const mappedKey = mapper(key, obj[key], obj);

    out[mappedKey] = obj[key];
  }

  return out;
}
