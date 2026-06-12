import type { Primitive } from '../types';

/**
 * Creates an object keyed by selector result. Last item wins on collisions.
 */
export function indexBy<T>(array: T[], selector: (item: T) => Primitive): Record<string, T> {
  const result: Record<string, T> = {};

  for (const item of array) {
    result[String(selector(item))] = item;
  }

  return result;
}
