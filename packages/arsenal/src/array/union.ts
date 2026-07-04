import type { Primitive } from '../types';

import { dedupeBySelector } from '../_common/_selectorSet';

/**
 * Returns a deduplicated union of both arrays.
 */
export function union<T>(source: T[], other: T[], selector?: (item: T) => Primitive): T[] {
  if (!selector) {
    return [...new Set([...source, ...other])];
  }

  return dedupeBySelector([...source, ...other], selector);
}
