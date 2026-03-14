import { assert } from '../function/assert';
import { isNil } from '../typed/isNil';
import { IS_OBJECT_ERROR_MSG, isObject } from '../typed/isObject';
import type { Obj } from '../types';

type PathValue<T, P extends string> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? PathValue<T[Key], Rest>
    : undefined
  : P extends keyof T
    ? T[P]
    : undefined;

// #region PathOptions
type PathOptions = {
  throwOnMissing?: boolean;
};
// #endregion PathOptions

/**
 * Retrieves the value at a given path of the object. If the value is undefined, the default value is returned.
 *
 * @example
 * ```ts
 * const obj = { a: { b: { c: 3 } }, d: [1, 2, 3] };
 *
 * getValue(obj, 'a.b.c'); // 3
 * getValue(obj, 'a.b.d', 'default'); // 'default'
 * getValue(obj, 'd[1]'); // 2
 * getValue(obj, 'e.f.g', 'default', { throwOnMissing: true }); // throws Error
 * ```
 *
 * @template T - The type of the object to query.
 * @template P - The type of the path string.
 * @param item - The object to query.
 * @param path - The dot-separated path of the property to get.
 * @param [defaultValue] - The value returned for undefined resolved values.
 * @param [options] - Additional options for value retrieval.
 *
 * @returns The resolved value.
 *
 * @throws If throwOnMissing is true and the path doesn't exist.
 */
export function get<T extends Obj, P extends string>(
  item: T,
  path: P,
  defaultValue?: unknown,
  options: PathOptions = {},
): PathValue<T, P> | undefined {
  assert(isObject(item), IS_OBJECT_ERROR_MSG, { args: { item }, type: TypeError });

  const { throwOnMissing = false } = options;

  const fragments = path.split(/[.[\]]+/).filter(Boolean);
  // biome-ignore lint/suspicious/noExplicitAny: -
  let current: any = item;

  for (const fragment of fragments) {
    if (isNil(current) || typeof current !== 'object') {
      if (throwOnMissing) throw new Error(`Cannot read property '${fragment}' of ${current}`);
      return defaultValue as PathValue<T, P>;
    }

    current = current[fragment];

    if (current === undefined) {
      if (throwOnMissing) throw new Error(`Property '${fragment}' does not exist`);
      return defaultValue as PathValue<T, P>;
    }
  }

  return current as PathValue<T, P>;
}
