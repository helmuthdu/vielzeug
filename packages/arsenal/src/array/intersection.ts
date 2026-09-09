import { toSelectorSet } from '../_common/_selectorSet';
import type { Primitive } from '../types';

/**
 * Returns elements that are present in both `source` and `other`.
 *
 * Allocates a `Set` from `other` for O(1) membership checks, plus a new array for the result.
 */
export function intersection<T>(source: readonly T[], other: readonly T[], selector?: (item: T) => Primitive): T[] {
  if (!selector) {
    const allow = new Set(other);

    return source.filter((item) => allow.has(item));
  }

  const allow = toSelectorSet(other, selector);

  return source.filter((item) => allow.has(selector(item)));
}
