import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Splits an array into values that match and do not match the predicate.
 */
export function partition<T>(array: T[], predicate: (item: T, index: number, array: T[]) => boolean): [T[], T[]] {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  const accepted: T[] = [];
  const rejected: T[] = [];

  for (let index = 0; index < array.length; index++) {
    if (predicate(array[index], index, array)) {
      accepted.push(array[index]);
    } else {
      rejected.push(array[index]);
    }
  }

  return [accepted, rejected];
}
