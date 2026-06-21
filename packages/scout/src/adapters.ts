import type { ScoutIndex } from './scout-index';
import type { SearchConstraints } from './types';

/**
 * Wraps a `ScoutIndex` as a `searchFn` compatible with `sourcerer`'s `LocalSourceConfig`.
 *
 * The returned function ignores the `items` argument (the index is the source of truth)
 * and delegates entirely to `index.search()`, returning plain items in score order.
 *
 * @example
 * ```ts
 * const index = createIndex(users, { fields: ['name', 'email'] });
 *
 * // Pass directly to sourcerer's searchFn option
 * const source = createLocalSource(users, { searchFn: toSearchFn(index) });
 * ```
 */
export function toSearchFn<T>(
  index: ScoutIndex<T>,
  options?: SearchConstraints,
): (items: readonly T[], query: string) => readonly T[] {
  return (_items, query) => index.search(query, options).map((r) => r.item);
}

/**
 * Returns a predicate that returns `true` for items matching `query` in the given index.
 *
 * The predicate is computed once at call time — call `toFilterPredicate` again if the
 * query or corpus changes.
 *
 * Compatible with `Array.filter`, `vault`'s `query.filter()`, or any predicate pipeline.
 *
 * @example
 * ```ts
 * const index = createIndex(products, { fields: ['title', 'sku'] });
 *
 * // Array filter
 * const results = products.filter(toFilterPredicate(index, 'widget'));
 *
 * // vault query builder
 * const rows = await db.query('products')
 *   .filter(toFilterPredicate(index, searchTerm))
 *   .toArray();
 * ```
 */
export function toFilterPredicate<T>(
  index: ScoutIndex<T>,
  query: string,
  options?: SearchConstraints,
): (item: T) => boolean {
  const matchSet = new Set(index.search(query, options).map((r) => r.item));

  return (item) => matchSet.has(item);
}
