import type { Obj } from '../types';

import { isUnsafeKey } from '../_common/unsafePaths';

/**
 * Creates a new object without the selected keys. Only `obj`'s own enumerable keys are
 * considered; dangerous keys (`__proto__`, `constructor`, `prototype`) are always skipped.
 *
 * @example
 * ```ts
 * omit({ a: 1, b: 2, c: 3 }, ['b']); // { a: 1, c: 3 }
 * ```
 *
 * @param obj - The source object.
 * @param omittedKeys - The keys to exclude.
 * @returns A new object with `omittedKeys` removed.
 */
export function omit<T extends Obj, K extends keyof T>(obj: T, omittedKeys: readonly K[]): Omit<T, K> {
  const blacklist = new Set<PropertyKey>(omittedKeys as readonly PropertyKey[]);
  const out = {} as Omit<T, K>;

  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (isUnsafeKey(key as PropertyKey)) continue;

    if (!blacklist.has(key)) {
      (out as T)[key] = obj[key];
    }
  }

  return out;
}
