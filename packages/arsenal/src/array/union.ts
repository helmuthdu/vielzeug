import { dedupeBySelector } from '../_common/_selectorSet';
import type { Primitive } from '../types';

/**
 * Returns a deduplicated union of `source` and `other`.
 *
 * Allocates a new `Set` (or selector-keyed dedup structure) and a new result array.
 */
export function union<T>(source: readonly T[], other: readonly T[], selector?: (item: T) => Primitive): T[] {
  if (!selector) {
    return [...new Set([...source, ...other])];
  }

  return dedupeBySelector([...source, ...other], selector);
}
