import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

type Falsy = false | '' | 0 | 0n | null | undefined;

/**
 * Creates a new array with all falsy values removed.
 */
export function compact<T>(array: T[]): Array<Exclude<T, Falsy>> {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  return array.filter(Boolean) as Array<Exclude<T, Falsy>>;
}
