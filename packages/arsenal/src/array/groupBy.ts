import type { Primitive } from '../types';

/**
 * Groups elements by a selector function.
 */
export function groupBy<T>(array: T[], selector: (item: T) => Primitive): Record<string, T[]> {
  const result: Record<string, T[]> = {};

  for (const item of array) {
    const rawKey = selector(item);
    const key = rawKey === undefined || rawKey === null ? '_' : String(rawKey);

    if (!result[key]) {
      result[key] = [];
    }

    result[key].push(item);
  }

  return result;
}
