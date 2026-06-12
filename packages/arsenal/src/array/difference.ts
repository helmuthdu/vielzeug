import type { Primitive } from '../types';

/**
 * Returns elements that are in source but not in other.
 */
export function difference<T>(source: T[], other: T[], selector?: (item: T) => Primitive): T[] {
  if (!selector) {
    const deny = new Set(other);

    return source.filter((item) => !deny.has(item));
  }

  const deny = new Set(other.map((item) => selector(item) as Primitive));

  return source.filter((item) => !deny.has(selector(item) as Primitive));
}
