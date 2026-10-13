import { getPath } from '../object/getPath';
import { compare } from './compare';
import { compareBy } from './compareBy';

export type SortDirection = 'asc' | 'desc';
export type SortSelectors<T> = Partial<Record<keyof T, SortDirection>>;

/**
 * One ordering term: a dot-notation path into the item plus its direction.
 *
 * `key` accepts a `keyof T` or any dotted/bracketed path (`'address.city'`,
 * `'tags[0]'`), because a data grid's sortable columns are strings known only at
 * runtime. Values are resolved with `getPath`, which refuses prototype-access segments.
 */
export type SortCriterion<T> = Readonly<{
  key: keyof T | (string & {});
  direction?: SortDirection;
}>;

/**
 * Criteria arrive as a plain or frozen array from callers; `Array.isArray` alone cannot
 * narrow a `ReadonlyArray` member out of a union, so the discriminant gets a name.
 */
function isCriteriaForm<T>(
  value: ((item: T) => unknown) | ReadonlyArray<SortCriterion<T>> | SortSelectors<T>,
): value is ReadonlyArray<SortCriterion<T>> {
  return Array.isArray(value);
}

/**
 * Sorts an array by a selector function (single-field), by a multi-field object of
 * `{ key: 'asc' | 'desc' }` entries, or by an ordered list of path criteria.
 *
 * The criteria form is the one a grid or table hands over: column ids arrive as
 * runtime strings, so they cannot be typed `keyof T` keys. Ordering is delegated to
 * `compare`, which means a column mixing incompatible value types (a number beside a
 * string) throws a `TypeError` instead of guessing an order — keep columns typed.
 *
 * Ties keep their input order: `Array.prototype.sort` is stable in every supported
 * engine and no tiebreaker is layered on top.
 *
 * @example
 * ```ts
 * // Single field
 * sort([{ a: 2 }, { a: 1 }], item => item.a); // [{ a:1 }, { a:2 }]
 * sort([{ a: 2 }, { a: 1 }], item => item.a, 'desc'); // [{ a:2 }, { a:1 }]
 *
 * // Multi-field by key
 * sort(users, { name: 'asc', age: 'desc' });
 *
 * // Ordered path criteria, nested paths included
 * sort(rows, [{ key: 'address.city' }, { key: 'age', direction: 'desc' }]);
 * ```
 *
 * @param array - The array to sort.
 * @param selector - A function extracting the sort key, a multi-field object, or path criteria.
 * @param direction - `'asc'` (default) or `'desc'`: only applies to single-field mode.
 * @returns A new sorted array.
 *
 * @throws {TypeError} If the first argument is not an array, or a column mixes value types.
 */
export function sort<T>(array: readonly T[], selector: (item: T) => unknown, direction?: SortDirection): T[];
export function sort<T>(array: readonly T[], selectors: SortSelectors<T>): T[];
export function sort<T>(array: readonly T[], criteria: ReadonlyArray<SortCriterion<T>>): T[];
export function sort<T>(
  array: readonly T[],
  selectorOrSelectors: ((item: T) => unknown) | ReadonlyArray<SortCriterion<T>> | SortSelectors<T>,
  direction: SortDirection = 'asc',
): T[] {
  if (!Array.isArray(array)) throw new TypeError('sort: first argument must be an array');

  if (typeof selectorOrSelectors === 'function') {
    const multiplier = direction === 'desc' ? -1 : 1;

    return [...array].sort((a, b) => compare(selectorOrSelectors(a), selectorOrSelectors(b)) * multiplier);
  }

  if (isCriteriaForm(selectorOrSelectors)) {
    const criteria = selectorOrSelectors.map(({ direction: dir = 'asc', key }) => ({
      multiplier: dir === 'desc' ? -1 : 1,
      path: String(key),
    }));

    return [...array].sort((a, b) => {
      for (const { multiplier, path } of criteria) {
        const result = compare(getPath(a, path), getPath(b, path)) * multiplier;

        if (result !== 0) return result;
      }

      return 0;
    });
  }

  return [...array].sort(compareBy(selectorOrSelectors));
}
