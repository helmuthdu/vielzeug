import type { ScoutIndex } from './scout-index';
import type { SearchConstraints } from './types';

/**
 * Adapts a `ScoutIndex` to sourcerer's explicit local `match` callback.
 * Caches one match set per query so local filtering does not repeat index work per item.
 */
export function toSearchMatcher<T>(
  index: ScoutIndex<T>,
  options?: SearchConstraints,
): (item: T, query: string) => boolean {
  let lastQuery: string | undefined;
  let lastRevision = -1;
  let matches = new Set<T>();

  return (item, query) => {
    if (query !== lastQuery || index.revision !== lastRevision) {
      lastQuery = query;
      lastRevision = index.revision;
      matches = new Set(index.search(query, options).map((result) => result.item));
    }

    return matches.has(item);
  };
}

/**
 * Returns a predicate that returns `true` for items matching `query` in the given index.
 *
 * The predicate is computed once at call time — call `toFilterPredicate` again if the
 * query or corpus changes.
 *
 * Compatible with `Array.filter`, `vault`'s `query.filter()`, or any predicate pipeline.
 */
export function toFilterPredicate<T>(
  index: ScoutIndex<T>,
  query: string,
  options?: SearchConstraints,
): (item: T) => boolean {
  const matchSet = new Set(index.search(query, options).map((result) => result.item));

  return (item) => matchSet.has(item);
}
