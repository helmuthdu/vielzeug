import { toSelectorSet } from '../_common/_selectorSet';
import type { Primitive } from '../types';

/**
 * Returns elements that are in `source` but not in `other`.
 *
 * Allocates a `Set` from `other` for O(1) membership checks, plus a new array for the result.
 */
export function difference<T>(source: readonly T[], other: readonly T[], selector?: (item: T) => Primitive): T[] {
  if (!selector) {
    const deny = new Set(other);

    return source.filter((item) => !deny.has(item));
  }

  const deny = toSelectorSet(other, selector);

  return source.filter((item) => !deny.has(selector(item)));
}
