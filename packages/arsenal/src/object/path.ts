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
 * Retrieves the value at a given dot-notation path of the object. If the value is undefined,
 * the default value is returned.
 *
 * Use dot notation only — for array indices, use the numeric key: `'a.0.b'` not `'a[0].b'`.
 * Bracket notation (`a[0].b`) is not supported and will throw a `TypeError`.
 *
 * @example
 * ```ts
 * const obj = { a: { b: { c: 3 } }, d: [1, 2, 3] };
 *
 * getPath(obj, 'a.b.c'); // 3
 * getPath(obj, 'a.b.x', 'default'); // 'default'
 * getPath(obj, 'd.1'); // 2
 * getPath(obj, 'e.f.g', 'default', { throwOnMissing: true }); // throws Error
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
export function getPath<T extends Obj, P extends string>(
  item: T,
  path: P,
  defaultValue?: unknown,
  options: PathOptions = {},
): PathValue<T, P> | undefined {
  if (/[[\]]/.test(path)) {
    throw new TypeError(
      `getPath: bracket notation is not supported. Use dot notation: '${path.replace(/\[(\d+)\]/g, '.$1').replace(/^\.|\.$/g, '')}'`,
    );
  }

  const { throwOnMissing = false } = options;

  const fragments = path.split('.').filter(Boolean);
  let current: unknown = item;

  for (const fragment of fragments) {
    if (current == null || typeof current !== 'object') {
      if (throwOnMissing) throw new Error(`Cannot read property '${fragment}' of ${current}`);

      return defaultValue as PathValue<T, P>;
    }

    current = (current as Record<string, unknown>)[fragment];

    if (current === undefined) {
      if (throwOnMissing) throw new Error(`Property '${fragment}' does not exist`);

      return defaultValue as PathValue<T, P>;
    }
  }

  return current as PathValue<T, P>;
}
