import { warn } from './_dev';
import { createAsyncSource } from './asyncSource';
import { positiveInteger, sameQuery, totalItems } from './pagination';
import type {
  InfinitePagination,
  InfiniteQuery,
  InfiniteQueryPatch,
  InfiniteSource,
  InfiniteSourceConfig,
} from './types';

const createPagination = (loaded: number, total: number, isLoadingMore: boolean): InfinitePagination => ({
  hasMore: loaded < total,
  isLoadingMore,
  kind: 'infinite',
  loaded,
  total,
});

const normalizeQuery = (current: InfiniteQuery, patch: InfiniteQueryPatch = {}): InfiniteQuery => ({
  pageSize: positiveInteger(patch.pageSize ?? current.pageSize, 'pageSize'),
  search: patch.search ?? current.search,
});

/** Infinite sources preserve loaded collection state while a pending query replaces it. */
export function createInfiniteSource<T>(config: InfiniteSourceConfig<T>): InfiniteSource<T> {
  const initialQuery: InfiniteQuery = { pageSize: 20, search: '' };
  let requestedQuery = normalizeQuery(initialQuery, config.initialQuery);
  let nextPage = 1;
  const asyncSource = createAsyncSource<T, InfiniteQuery, InfinitePagination>({
    data: [],
    error: null,
    isFetching: false,
    pagination: createPagination(0, 0, false),
    query: requestedQuery,
  });

  const fetch = (query: InfiniteQuery, page: number, append: boolean): Promise<void> => {
    const loadedData = asyncSource.snapshot.data;

    return asyncSource.fetch({
      failure: (previous, error) => ({ ...previous, error, isFetching: false, pendingQuery: undefined }),
      load: (signal) => config.load({ query: { ...query, page, pageSize: query.pageSize }, signal }),
      pending: (previous) => ({
        ...previous,
        error: null,
        isFetching: true,
        pagination: createPagination(previous.data.length, previous.pagination.total, append),
        pendingQuery: query,
      }),
      success: (result) => {
        const total = totalItems(result.total);
        const data = append ? [...loadedData, ...result.data] : result.data;

        nextPage = page + 1;

        return {
          data,
          error: null,
          isFetching: false,
          pagination: createPagination(data.length, total, false),
          query,
        };
      },
    });
  };

  const reload = (): Promise<void> => {
    nextPage = 1;

    return fetch(requestedQuery, 1, false);
  };

  const setQuery = async (patch: InfiniteQueryPatch): Promise<void> => {
    const current = asyncSource.snapshot.pendingQuery ?? asyncSource.snapshot.query;
    const next = normalizeQuery(current, patch);

    if (sameQuery(next, requestedQuery)) return;

    requestedQuery = next;
    nextPage = 1;
    await fetch(next, 1, false);
  };

  const source: InfiniteSource<T> = {
    get disposalSignal() {
      return asyncSource.disposalSignal;
    },

    dispose: asyncSource.dispose,

    get disposed() {
      return asyncSource.disposed;
    },

    loadMore() {
      const { isFetching, pagination } = asyncSource.snapshot;

      return isFetching || (asyncSource.snapshot.data.length > 0 && !pagination.hasMore)
        ? Promise.resolve()
        : fetch(requestedQuery, nextPage, true);
    },

    reload,
    setQuery,

    get snapshot() {
      return asyncSource.snapshot;
    },

    subscribe: asyncSource.subscribe,

    [Symbol.dispose]() {
      source.dispose();
    },
  };

  if (config.autoStart !== false)
    void reload().catch(() => warn('Initial load failed. Inspect source.snapshot.error.'));

  return source;
}
