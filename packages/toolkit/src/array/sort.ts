import { assert } from '../function/assert';
import { compare } from '../function/compare';
import { compareBy } from '../function/compareBy';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Sorts an array by a selector function (single-field) or by a multi-field
 * object of `{ key: 'asc' | 'desc' }` entries.
 *
 * @example
 * ```ts
 * // Single field
 * sort([{ a: 2 }, { a: 1 }], item => item.a); // [{ a:1 }, { a:2 }]
 * sort([{ a: 2 }, { a: 1 }], item => item.a, 'desc'); // [{ a:2 }, { a:1 }]
 *
 * // Multi-field
 * sort(users, { name: 'asc', age: 'desc' });
 * ```
 *
 * @param array - The array to sort.
 * @param selector - A function extracting the sort key, or a multi-field object.
 * @param direction - `'asc'` (default) or `'desc'` — only applies to single-field mode.
 * @returns A new sorted array.
 *
 * @throws {TypeError} If the first argument is not an array.
 */
export function sort<T>(array: T[], selector: (item: T) => any, direction?: 'asc' | 'desc'): T[];
export function sort<T>(array: T[], selectors: Partial<Record<keyof T, 'asc' | 'desc'>>): T[];
export function sort<T>(
  array: T[],
  selectorOrSelectors: ((item: T) => any) | Partial<Record<keyof T, 'asc' | 'desc'>>,
  direction: 'asc' | 'desc' = 'asc',
): T[] {
  assert(isArray(array), IS_ARRAY_ERROR_MSG, { args: { array }, type: TypeError });

  if (typeof selectorOrSelectors === 'function') {
    const multiplier = direction === 'desc' ? -1 : 1;

    return [...array].sort((a, b) => compare(selectorOrSelectors(a), selectorOrSelectors(b)) * multiplier);
  }

  return [...array].sort(compareBy(selectorOrSelectors));
}
