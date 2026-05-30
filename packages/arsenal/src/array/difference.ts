import type { Primitive } from '../types';

import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Returns elements that are in source but not in other.
 */
export function difference<T>(source: T[], other: T[], selector?: (item: T) => Primitive): T[] {
  assert(isArray(source), IS_ARRAY_ERROR_MSG, { args: { source }, type: TypeError });
  assert(isArray(other), IS_ARRAY_ERROR_MSG, { args: { other }, type: TypeError });

  if (!selector) {
    const deny = new Set(other);

    return source.filter((item) => !deny.has(item));
  }

  const deny = new Set(other.map((item) => selector(item) as Primitive));

  return source.filter((item) => !deny.has(selector(item) as Primitive));
}
