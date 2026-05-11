import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Drops the first n elements from an array.
 */
export function drop<T>(array: T[], n = 1): T[] {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  const count = Math.max(0, Math.floor(n));

  return array.slice(count);
}
