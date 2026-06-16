import { UNSAFE_PATH_SEGMENTS } from '../_internal/unsafePaths';
import { isPlainObject } from '../guards/isPlainObject';

/**
 * Flattens a nested plain object into a map of dot-notation path keys to leaf values.
 * Keys containing unsafe segments (`__proto__`, `constructor`, `prototype`) are silently skipped.
 * Nesting beyond MAX_FLATTEN_DEPTH is treated as an opaque leaf value to prevent stack overflows.
 *
 * @example
 * ```ts
 * flattenPaths({ a: { b: 1, c: 2 }, d: 3 })
 * // { 'a.b': 1, 'a.c': 2, 'd': 3 }
 * ```
 */
const MAX_FLATTEN_DEPTH = 10;

function _flattenPaths(obj: Record<string, unknown>, prefix: string, depth: number): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    if (UNSAFE_PATH_SEGMENTS.has(key)) continue;

    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (isPlainObject(val) && depth < MAX_FLATTEN_DEPTH) {
      Object.assign(result, _flattenPaths(val as Record<string, unknown>, fullKey, depth + 1));
    } else {
      result[fullKey] = val;
    }
  }

  return result;
}

export function flattenPaths(obj: Record<string, unknown>): Record<string, unknown> {
  return _flattenPaths(obj, '', 0);
}

/**
 * Reconstructs a nested plain object from a map of dot-notation path keys to leaf values.
 * Any path containing an unsafe segment is silently skipped.
 *
 * @example
 * ```ts
 * unflattenPaths({ 'a.b': 1, 'a.c': 2, 'd': 3 })
 * // { a: { b: 1, c: 2 }, d: 3 }
 * ```
 */
export function unflattenPaths(flat: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(flat)) {
    const parts = key.split('.');

    if (parts.some((p) => UNSAFE_PATH_SEGMENTS.has(p))) continue;

    let obj = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!isPlainObject(obj[parts[i]])) {
        obj[parts[i]] = {};
      }

      obj = obj[parts[i]] as Record<string, unknown>;
    }

    obj[parts[parts.length - 1]] = val;
  }

  return result;
}
