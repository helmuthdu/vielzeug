import type { Obj } from '../types';

import { isUnsafeKey } from '../_common/unsafePaths';

/**
 * Maps object keys while preserving values. Both the original key and any mapped key that
 * resolve to a dangerous key (`__proto__`, `constructor`, `prototype`) are skipped.
 *
 * @example
 * ```ts
 * mapKeys({ a: 1, b: 2 }, (key) => `x_${String(key)}`); // { x_a: 1, x_b: 2 }
 * ```
 *
 * @param obj - The source object.
 * @param mapper - Function producing the new key for each entry.
 * @returns A new object with mapped keys and the original values.
 */
export function mapKeys<T extends Obj>(
  obj: T,
  mapper: (key: keyof T, value: T[keyof T], obj: T) => PropertyKey,
): Record<PropertyKey, T[keyof T]> {
  const out: Record<PropertyKey, T[keyof T]> = {};

  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (isUnsafeKey(key as PropertyKey)) continue;

    const mappedKey = mapper(key, obj[key], obj);

    if (isUnsafeKey(mappedKey)) continue;

    out[mappedKey] = obj[key];
  }

  return out;
}
