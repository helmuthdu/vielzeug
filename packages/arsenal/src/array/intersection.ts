import type { Primitive } from '../types';

/**
 * Returns elements that are present in both arrays.
 */
export function intersection<T>(source: T[], other: T[], selector?: (item: T) => Primitive): T[] {
  if (!selector) {
    const allow = new Set(other);

    return source.filter((item) => allow.has(item));
  }

  const allow = new Set(other.map((item) => selector(item) as Primitive));

  return source.filter((item) => allow.has(selector(item) as Primitive));
}
