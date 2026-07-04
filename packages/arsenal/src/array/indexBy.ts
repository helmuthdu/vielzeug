import type { Primitive } from '../types';

import { isUnsafeKey } from '../_common/unsafePaths';

/**
 * Creates an object keyed by selector result. Last item wins on collisions. Dangerous keys
 * (`__proto__`, `constructor`, `prototype`) are skipped.
 */
export function indexBy<T>(array: T[], selector: (item: T) => Primitive): Record<string, T> {
  const result: Record<string, T> = {};

  for (const item of array) {
    const key = String(selector(item));

    if (isUnsafeKey(key)) continue;

    result[key] = item;
  }

  return result;
}
