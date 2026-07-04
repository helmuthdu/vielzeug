import type { Primitive } from '../types';

import { isUnsafeKey } from '../_common/unsafePaths';

/**
 * Groups elements by a selector function. Dangerous keys (`__proto__`, `constructor`,
 * `prototype`) are skipped.
 */
export function groupBy<T>(array: T[], selector: (item: T) => Primitive): Record<string, T[]> {
  const result: Record<string, T[]> = {};

  for (const item of array) {
    const rawKey = selector(item);
    const key = rawKey === undefined || rawKey === null ? '_' : String(rawKey);

    if (isUnsafeKey(key)) continue;

    if (!result[key]) {
      result[key] = [];
    }

    result[key].push(item);
  }

  return result;
}
