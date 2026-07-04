import type { Primitive } from '../types';

import { isUnsafeKey } from '../_common/unsafePaths';

/**
 * Counts elements in an array by selector output. Selector results of `null`/`undefined` are
 * bucketed under the key `'_'`, matching `groupBy`'s convention. Dangerous keys (`__proto__`,
 * `constructor`, `prototype`) are skipped.
 */
export function countBy<T>(array: T[], selector: (item: T) => Primitive): Record<string, number> {
  const out: Record<string, number> = {};

  for (let index = 0; index < array.length; index++) {
    const rawKey = selector(array[index]);
    const key = rawKey === undefined || rawKey === null ? '_' : String(rawKey);

    if (isUnsafeKey(key)) continue;

    out[key] = (out[key] ?? 0) + 1;
  }

  return out;
}
