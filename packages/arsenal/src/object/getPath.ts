import type { Obj } from '../types';

import { UNSAFE_PATH_SEGMENTS } from '../_common/unsafePaths';

type PathValue<T, P extends string> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? PathValue<T[Key], Rest>
    : undefined
  : P extends keyof T
    ? T[P]
    : undefined;

function pathSegments(path: string): string[] {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/^\.|\.$/g, '')
    .split('.')
    .filter(Boolean);
}

function readPath(item: Obj, path: string): unknown {
  let current: unknown = item;

  for (const segment of pathSegments(path)) {
    if (UNSAFE_PATH_SEGMENTS.has(segment) || current == null || typeof current !== 'object') return undefined;

    current = (current as Record<string, unknown>)[segment];

    if (current === undefined) return undefined;
  }

  return current;
}

/**
 * Retrieves a value at a dot-notation or numeric bracket-notation path.
 * Returns `undefined` when the path is missing or contains an unsafe segment.
 * Use `getPathOr` to supply a fallback or `requirePath` to throw on a missing path.
 */
export function getPath<T extends Obj, P extends string>(item: T, path: P): PathValue<T, P> | undefined {
  return readPath(item, path) as PathValue<T, P> | undefined;
}

/**
 * Retrieves a value at a path or returns `fallback` when the path is missing.
 */
export function getPathOr<T extends Obj, P extends string, F>(item: T, path: P, fallback: F): PathValue<T, P> | F {
  const value = readPath(item, path);

  return (value === undefined ? fallback : value) as PathValue<T, P> | F;
}

/**
 * Retrieves a value at a path or throws when the path is missing.
 */
export function requirePath<T extends Obj, P extends string>(item: T, path: P): Exclude<PathValue<T, P>, undefined> {
  const value = readPath(item, path);

  if (value === undefined) throw new TypeError(`Path does not exist: '${path}'`);

  return value as Exclude<PathValue<T, P>, undefined>;
}
