import type { Primitive } from '../types';

import { toSelectorSet } from '../_common/_selectorSet';

/**
 * Returns elements that are present in both arrays.
 */
export function intersection<T>(source: T[], other: T[], selector?: (item: T) => Primitive): T[] {
  if (!selector) {
    const allow = new Set(other);

    return source.filter((item) => allow.has(item));
  }

  const allow = toSelectorSet(other, selector);

  return source.filter((item) => allow.has(selector(item)));
}
