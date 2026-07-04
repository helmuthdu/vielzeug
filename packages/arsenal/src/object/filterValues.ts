import type { Obj } from '../types';

import { isUnsafeKey } from '../_common/unsafePaths';

/**
 * Filters object entries using a value predicate. Dangerous keys (`__proto__`, `constructor`,
 * `prototype`) are always skipped.
 *
 * @example
 * ```ts
 * filterValues({ a: 1, b: 2, c: 3 }, (value) => value > 1); // { b: 2, c: 3 }
 * ```
 *
 * @param obj - The source object.
 * @param predicate - Returns `true` to keep an entry.
 * @returns A new object containing only entries for which `predicate` returned `true`.
 */
export function filterValues<T extends Obj>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T, obj: T) => boolean,
): Partial<T> {
  const out: Partial<T> = {};

  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (isUnsafeKey(key as PropertyKey)) continue;

    if (predicate(obj[key], key, obj)) {
      out[key] = obj[key];
    }
  }

  return out;
}
