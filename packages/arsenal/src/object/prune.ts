import { isUnsafeKey } from '../_common/unsafePaths';
import { filterMap } from '../array/filterMap';
import { isEmpty } from '../guards/isEmpty';
import { isNil } from '../guards/isNil';
import { isPlainObject } from '../guards/isPlainObject';
import { isString } from '../guards/isString';

/**
 * Removes all nullable and empty values from strings, arrays, or objects.
 *
 * - For strings: trims whitespace and returns `undefined` if the result is empty.
 * - For arrays: recursively removes `null`, `undefined`, empty strings, and empty objects/arrays.
 * - For objects: recursively removes properties whose pruned value is empty. Dangerous keys
 *   (`__proto__`, `constructor`, `prototype`) are always skipped.
 * - For any other type: returns the value unchanged.
 *
 * @example
 * ```ts
 * prune('  hello  '); // 'hello'
 * prune('   ');       // undefined
 * prune([1, null, '', 2, undefined, 3]); // [1, 2, 3]
 * prune({ a: 1, b: null, c: '', d: 2 }); // { a: 1, d: 2 }
 * prune({ a: { b: null, c: '' }, d: 1 }); // { d: 1 }
 * ```
 *
 * @param value - The value to prune.
 * @returns The pruned value, or `undefined` if the result would be empty.
 */
export function prune(value: string): string | undefined;
export function prune<T>(value: T[]): Array<NonNullable<T>> | undefined;
export function prune<T extends Record<string, unknown>>(value: T): Partial<T> | undefined;
export function prune<T>(value: T): T | undefined;
export function prune<T>(value: T): T | undefined {
  if (isNil(value)) return undefined;

  if (isString(value)) {
    const trimmed = value.trim();

    return (trimmed === '' ? undefined : trimmed) as T | undefined;
  }

  if (Array.isArray(value)) {
    const cleaned = filterMap(value as unknown[], (item) => {
      const pruned = prune(item);

      return isEmpty(pruned) ? undefined : (pruned as unknown);
    });

    return (cleaned.length === 0 ? undefined : cleaned) as T | undefined;
  }

  if (isPlainObject(value)) {
    const cleaned: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value)) {
      if (isUnsafeKey(key)) continue;

      const cleanedValue = prune(val);

      if (!isEmpty(cleanedValue)) {
        cleaned[key] = cleanedValue;
      }
    }

    return (Object.keys(cleaned).length === 0 ? undefined : cleaned) as T | undefined;
  }

  return value;
}
