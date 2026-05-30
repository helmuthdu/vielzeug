import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Returns the first element or fallback when array is empty.
 */
export function first<T>(array: T[], fallback?: T): T | undefined {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  return array.length > 0 ? array[0] : fallback;
}
