import type { Primitive } from '../types';

import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Counts elements in an array by selector output.
 */
export function countBy<T>(array: T[], selector: (item: T) => Primitive): Record<string, number> {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  const out: Record<string, number> = {};

  for (let index = 0; index < array.length; index++) {
    const key = String(selector(array[index]));

    out[key] = (out[key] ?? 0) + 1;
  }

  return out;
}
