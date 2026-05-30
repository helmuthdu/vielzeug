import type { Primitive } from '../types';

import { assert } from '../function/assert';

/**
 * Returns elements that are in source but not in other.
 */
export function difference<T>(source: T[], other: T[], selector?: (item: T) => Primitive): T[] {
  assert(Array.isArray(source), 'Expected an array', { args: { source }, type: TypeError });
  assert(Array.isArray(other), 'Expected an array', { args: { other }, type: TypeError });

  if (!selector) {
    const deny = new Set(other);

    return source.filter((item) => !deny.has(item));
  }

  const deny = new Set(other.map((item) => selector(item) as Primitive));

  return source.filter((item) => !deny.has(selector(item) as Primitive));
}
