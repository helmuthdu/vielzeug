import type { Primitive } from '../types';

import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Returns elements that are present in both arrays.
 */
export function intersection<T>(source: T[], other: T[], selector?: (item: T) => Primitive): T[] {
  assert(isArray(source), IS_ARRAY_ERROR_MSG, { args: { source }, type: TypeError });
  assert(isArray(other), IS_ARRAY_ERROR_MSG, { args: { other }, type: TypeError });

  if (!selector) {
    const allow = new Set(other);

    return source.filter((item) => allow.has(item));
  }

  const allow = new Set(other.map((item) => selector(item) as Primitive));

  return source.filter((item) => allow.has(selector(item) as Primitive));
}
