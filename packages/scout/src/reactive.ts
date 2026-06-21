import { batch, computed, signal } from '@vielzeug/ripple';

import type { CreateSearchOptions, ScoutIndexOptions, SearchResult, SearchState } from './types';

import { createIndex, type ScoutIndex } from './scout-index';

/**
 * Combined index + reactive search state returned by `createReactiveSearch()`.
 * Exposes the underlying `ScoutIndex` for incremental mutations (`add`, `remove`, `reindex`).
 */
export type ReactiveSearch<T> = SearchState<T> & {
  readonly index: ScoutIndex<T>;
};

const DEFAULT_DEBOUNCE = 200;

/**
 * Creates a reactive search state backed by a `ScoutIndex`.
 *
 * - Set `state.query.value` to trigger a (debounced) search.
 * - Read `state.results.value` inside an `effect` or `computed` to consume results reactively.
 * - `state.isSearching.value` is `true` while debouncing, `false` otherwise.
 * - Call `state.dispose()` (or `using state = createSearch(...)`) to release subscriptions.
 *
 * @example
 * ```ts
 * const index = createIndex(users, { fields: ['name', 'email'] });
 * const search = createSearch(index, { debounce: 150 });
 *
 * effect(() => {
 *   const results = search.results.value;
 *   renderList(results.map(r => r.item));
 * });
 *
 * // Wire to an input
 * input.addEventListener('input', e => {
 *   search.query.value = e.currentTarget.value;
 * });
 *
 * // Clean up
 * search.dispose();
 * ```
 *
 * @param index - A `ScoutIndex` built with `createIndex()`.
 * @param options.debounce - Milliseconds to wait before committing query changes. Default: `200`.
 * @param options.limit - Override the index-level result limit.
 * @param options.minQueryLength - Override the index-level minimum query length.
 * @param options.threshold - Override the index-level score threshold.
 */
export function createSearch<T>(index: ScoutIndex<T>, options: CreateSearchOptions = {}): SearchState<T> {
  const { debounce: debounceMs = DEFAULT_DEBOUNCE, limit, minQueryLength, threshold } = options;

  const query = signal<string>('', { name: 'scout:query' });
  const committedQuery = signal<string>('', { name: 'scout:committedQuery' });

  const isSearching = computed(() => query.value !== committedQuery.value, { name: 'scout:isSearching' });

  const results = computed<SearchResult<T>[]>(
    () => index.search(committedQuery.value, { limit, minQueryLength, threshold }),
    { name: 'scout:results' },
  );

  let timer: ReturnType<typeof setTimeout> | null = null;

  function cancelTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  const subscription = query.subscribe(() => {
    const q = query.peek();

    cancelTimer();

    if (q === committedQuery.peek()) return;

    if (debounceMs === 0) {
      committedQuery.value = q;

      return;
    }

    timer = setTimeout(() => {
      committedQuery.value = q;
      timer = null;
    }, debounceMs);
  });

  function clear(): void {
    cancelTimer();

    batch(() => {
      query.value = '';
      committedQuery.value = '';
    });
  }

  function dispose(): void {
    cancelTimer();
    subscription.dispose();
    query.dispose();
    committedQuery.dispose();
    isSearching.dispose();
    results.dispose();
  }

  return {
    clear,
    dispose,
    isSearching,
    query,
    results,
    [Symbol.dispose](): void {
      dispose();
    },
  };
}

/**
 * Creates a `ScoutIndex` and a reactive search state in one call — the shorthand
 * for the common pattern of `createIndex` + `createSearch`.
 *
 * The returned `ReactiveSearch` exposes the underlying index via `.index` for
 * incremental mutations (`add`, `remove`, `reindex`) after construction.
 *
 * @example
 * ```ts
 * const search = createReactiveSearch(users, {
 *   fields: [{ field: 'name', weight: 2 }, 'email'],
 *   debounce: 150,
 * });
 *
 * effect(() => renderList(search.results.value.map(r => r.item)));
 *
 * // Wire to an input
 * input.addEventListener('input', e => { search.query.value = e.currentTarget.value; });
 *
 * // Add a new item at runtime
 * search.index.add(newUser);
 * ```
 *
 * @param items - Initial corpus to index.
 * @param options - Index options (`fields`, `limit`, `minQueryLength`, `threshold`) plus optional `debounce`.
 */
export function createReactiveSearch<T>(
  items: T[],
  options: ScoutIndexOptions<T> & { debounce?: number },
): ReactiveSearch<T> {
  const index = createIndex(items, {
    fields: options.fields,
    limit: options.limit,
    minQueryLength: options.minQueryLength,
    threshold: options.threshold,
  });
  const state = createSearch(index, { debounce: options.debounce });

  return { ...state, index };
}
