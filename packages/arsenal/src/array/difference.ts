import type { Primitive } from '../types';

import { toSelectorSet } from '../_common/_selectorSet';

/**
 * Returns elements that are in source but not in other.
 */
export function difference<T>(source: T[], other: T[], selector?: (item: T) => Primitive): T[] {
  if (!selector) {
    const deny = new Set(other);

    return source.filter((item) => !deny.has(item));
  }

  const deny = toSelectorSet(other, selector);

  return source.filter((item) => !deny.has(selector(item)));
}
