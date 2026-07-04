import type { Obj } from '../types';

import { isUnsafeKey } from '../_common/unsafePaths';

/**
 * Creates a new object containing only selected keys. Only `obj`'s own enumerable keys are
 * considered — inherited properties (e.g. `toString`) are never picked, and dangerous keys
 * (`__proto__`, `constructor`, `prototype`) are always skipped.
 *
 * @example
 * ```ts
 * pick({ a: 1, b: 2, c: 3 }, ['a', 'c']); // { a: 1, c: 3 }
 * ```
 *
 * @param obj - The source object.
 * @param selectedKeys - The keys to keep.
 * @returns A new object containing only `selectedKeys` that exist as own properties of `obj`.
 */
export function pick<T extends Obj, K extends keyof T>(obj: T, selectedKeys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;

  for (const key of selectedKeys) {
    if (isUnsafeKey(key as PropertyKey)) continue;

    if (Object.hasOwn(obj, key)) {
      out[key] = obj[key];
    }
  }

  return out;
}
