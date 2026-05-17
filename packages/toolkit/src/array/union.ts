import type { Primitive } from '../types';

import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Returns a deduplicated union of both arrays.
 */
export function union<T>(source: T[], other: T[], selector?: (item: T) => Primitive): T[] {
  assert(isArray(source), IS_ARRAY_ERROR_MSG, { args: { source }, type: TypeError });
  assert(isArray(other), IS_ARRAY_ERROR_MSG, { args: { other }, type: TypeError });

  if (!selector) {
    return [...new Set([...source, ...other])];
  }

  const seen = new Set<Primitive>();
  const out: T[] = [];

  for (const item of [...source, ...other]) {
    const key = selector(item) as Primitive;

    if (seen.has(key)) continue;

    seen.add(key);
    out.push(item);
  }

  return out;
}
