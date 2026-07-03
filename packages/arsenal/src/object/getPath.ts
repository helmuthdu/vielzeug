import type { Obj } from '../types';

import { UNSAFE_PATH_SEGMENTS } from '../_common/unsafePaths';
import { ArsenalError } from '../errors';

type PathValue<T, P extends string> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? PathValue<T[Key], Rest>
    : undefined
  : P extends keyof T
    ? T[P]
    : undefined;

export type GetPathOptions = {
  /**
   * When `false`, throws a `TypeError` on bracket-notation segments instead of
   * auto-converting them to dot notation. Default: `true`.
   */
  bracketNotation?: boolean;
  /**
   * Returned when the path is missing or resolves to `undefined`.
   * Mutually exclusive with `strict` — if both are set, `strict` takes precedence.
   */
  fallback?: unknown;
  /**
   * When `true`, throws an `Error` if any path segment is missing.
   * Default: `false`.
   */
  strict?: boolean;
};

/**
 * Retrieves the value at a dot-notation path of an object.
 *
 * Bracket notation (`a[0].b`) is automatically converted to dot notation by default.
 * Unsafe path segments (`__proto__`, `constructor`, `prototype`) always return `options.fallback`.
 *
 * @example
 * ```ts
 * const obj = { a: { b: { c: 3 } }, d: [1, 2, 3] };
 *
 * getPath(obj, 'a.b.c');                          // 3
 * getPath(obj, 'a.b.x', { fallback: 'fallback' }); // 'fallback'
 * getPath(obj, 'd[1]');                            // 2  (bracket auto-converted)
 * getPath(obj, 'e.f.g', { strict: true });         // throws Error
 * getPath(obj, 'a[0]', { bracketNotation: false }); // throws TypeError
 * ```
 *
 * @template T - The object type.
 * @template P - The path string type.
 * @param item - The object to query.
 * @param path - The dot-separated path.
 * @param [options] - Options: `fallback`, `strict`, `bracketNotation`.
 * @returns The resolved value, or `options.fallback` if missing.
 * @throws `TypeError` when `bracketNotation: false` and bracket syntax is used.
 * @throws `Error` when `strict: true` and the path does not exist.
 */
export function getPath<T extends Obj, P extends string>(
  item: T,
  path: P,
  options: GetPathOptions = {},
): PathValue<T, P> | undefined {
  const { bracketNotation = true, fallback: defaultValue, strict = false } = options;

  if (/[[\]]/.test(path)) {
    if (!bracketNotation) {
      throw new ArsenalError(
        `getPath: bracket notation is not supported. Use dot notation: '${path.replace(/\[(\d+)\]/g, '.$1').replace(/^\.|\.$/g, '')}' or pass { bracketNotation: true }.`,
      );
    }

    path = path.replace(/\[(\d+)\]/g, '.$1').replace(/^\.|\.$/g, '') as P;
  }

  const fragments = path.split('.').filter(Boolean);
  let current: unknown = item;

  for (const fragment of fragments) {
    if (UNSAFE_PATH_SEGMENTS.has(fragment)) return defaultValue as PathValue<T, P>;

    if (current == null || typeof current !== 'object') {
      if (strict) throw new ArsenalError(`Cannot read property '${fragment}' of ${current}`);

      return defaultValue as PathValue<T, P>;
    }

    current = (current as Record<string, unknown>)[fragment];

    if (current === undefined) {
      if (strict) throw new ArsenalError(`Property '${fragment}' does not exist`);

      return defaultValue as PathValue<T, P>;
    }
  }

  return current as PathValue<T, P>;
}
