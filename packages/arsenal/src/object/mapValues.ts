import type { Obj } from '../types';

import { isUnsafeKey } from '../_common/unsafePaths';

/**
 * Maps object values while preserving the original keys. Dangerous keys (`__proto__`,
 * `constructor`, `prototype`) are always skipped.
 *
 * @example
 * ```ts
 * mapValues({ a: 1, b: 2 }, (value) => value * 2); // { a: 2, b: 4 }
 * ```
 *
 * @param obj - The source object.
 * @param mapper - Function producing the new value for each entry.
 * @returns A new object with the same keys and mapped values.
 */
export function mapValues<T extends Obj, R>(
  obj: T,
  mapper: (value: T[keyof T], key: keyof T, obj: T) => R,
): { [K in keyof T]: R } {
  const out = {} as { [K in keyof T]: R };

  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (isUnsafeKey(key as PropertyKey)) continue;

    out[key] = mapper(obj[key], key, obj);
  }

  return out;
}
