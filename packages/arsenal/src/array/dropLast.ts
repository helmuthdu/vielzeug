import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Drops the last n elements from an array.
 */
export function dropLast<T>(array: T[], n = 1): T[] {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  const count = Math.max(0, Math.floor(n));

  if (count === 0) return [...array];

  return array.slice(0, Math.max(0, array.length - count));
}
