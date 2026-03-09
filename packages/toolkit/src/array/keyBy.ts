import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';
import type { Selector } from '../types';

/**
 * Creates an object keyed by a property or selector function. When multiple
 * items share the same key, the last one wins.
 *
 * @example
 * ```ts
 * const data = [{ a: 'x', v: 1 }, { a: 'y', v: 2 }, { a: 'x', v: 3 }];
 * keyBy(data, 'a') // { x: { a: 'x', v: 3 }, y: { a: 'y', v: 2 } }
 * keyBy(data, item => item.a) // same result
 * ```
 *
 * @param array - The array to index.
 * @param selector - A property key or a function returning the key for each element.
 * @returns A record mapping each key to the corresponding element.
 *
 * @throws {TypeError} If the provided array is not an array.
 */
export function keyBy<T>(
  array: T[],
  selector: Selector<T>,
): Record<string, T> {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  const result: Record<string, T> = {};
  const getKey = typeof selector === 'function' ? selector : (item: T) => item[selector];

  for (const item of array) {
    const key = String(getKey(item));
    result[key] = item;
  }

  return result;
}
