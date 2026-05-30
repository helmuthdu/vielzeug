import type { Primitive } from '../types';

import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Creates an object keyed by selector result. Last item wins on collisions.
 */
export function indexBy<T>(array: T[], selector: (item: T) => Primitive): Record<string, T> {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  const result: Record<string, T> = {};

  for (const item of array) {
    result[String(selector(item))] = item;
  }

  return result;
}
