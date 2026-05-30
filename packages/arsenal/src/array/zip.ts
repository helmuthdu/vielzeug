import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Zips multiple arrays by index.
 */
export function zip<T extends readonly unknown[][]>(
  ...arrays: T
): Array<{ [K in keyof T]: T[K] extends readonly (infer U)[] ? U | undefined : never }> {
  for (const array of arrays) {
    assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });
  }

  if (arrays.length === 0) return [];

  const length = Math.max(...arrays.map((arr) => arr.length));
  const out = new Array(length);

  for (let index = 0; index < length; index++) {
    out[index] = arrays.map((array) => array[index]);
  }

  return out as Array<{ [K in keyof T]: T[K] extends readonly (infer U)[] ? U | undefined : never }>;
}
