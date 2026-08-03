import type { PagePagination, PageQuery, PageQueryPatch, PageSource, PageSourceConfig } from './types';

import { warn } from './_dev';
import { createAsyncSource } from './asyncSource';
import { createPagePagination, positiveInteger, sameQuery, totalItems } from './pagination';

const normalizeQuery = <TFilter, TSort>(
  current: PageQuery<TFilter, TSort>,
  patch: PageQueryPatch<TFilter, TSort> = {},
  maxPage?: number,
): PageQuery<TFilter, TSort> => {
  const page = patch.page ?? current.page;
  const pageSize = patch.pageSize ?? current.pageSize;
  const search = patch.search ?? current.search;
  const resetsPage = 'filter' in patch || patch.pageSize !== undefined || patch.search !== undefined || 'sort' in patch;

  const requestedPage = patch.page ?? (resetsPage ? 1 : page);

  return {
    ...('filter' in patch
      ? patch.filter !== undefined && { filter: patch.filter }
      : current.filter !== undefined && { filter: current.filter }),
    ...('sort' in patch
      ? patch.sort !== undefined && { sort: patch.sort }
      : current.sort !== undefined && { sort: current.sort }),
    page:
      maxPage === undefined
        ? positiveInteger(requestedPage, 'page')
        : Math.min(positiveInteger(requestedPage, 'page'), maxPage),
    pageSize: positiveInteger(pageSize, 'pageSize'),
    search,
  };
};

/** Page sources retain loaded state while pendingQuery records newer work. */
export function createPageSource<T, TFilter = unknown, TSort = unknown>(
  config: PageSourceConfig<T, TFilter, TSort>,
): PageSource<T, TFilter, TSort> {
  const initialQuery: PageQuery<TFilter, TSort> = {
    page: 1,
    pageSize: 20,
    search: '',
  };
  let requestedQuery = normalizeQuery(initialQuery, config.initialQuery);
  const asyncSource = createAsyncSource<T, PageQuery<TFilter, TSort>, PagePagination>({
    data: [],
    error: null,
    isFetching: false,
    pagination: createPagePagination(requestedQuery.page, requestedQuery.pageSize, 0),
    query: requestedQuery,
  });

  const fetch = (query: PageQuery<TFilter, TSort>): Promise<void> =>
    asyncSource.fetch({
      failure: (previous, error) => ({ ...previous, error, isFetching: false, pendingQuery: undefined }),
      load: (signal) => config.load({ query, signal }),
      pending: (previous) => ({ ...previous, error: null, isFetching: true, pendingQuery: query }),
      success: (result) => {
        const total = totalItems(result.total);
        const pagination = createPagePagination(query.page, query.pageSize, total);
        const loadedQuery = { ...query, page: pagination.index };

        requestedQuery = loadedQuery;

        return {
          data: result.data,
          error: null,
          isFetching: false,
          pagination,
          query: loadedQuery,
        };
      },
    });

  const reload = (): Promise<void> => fetch(requestedQuery);

  const setQuery = async (patch: PageQueryPatch<TFilter, TSort>): Promise<void> => {
    const current = asyncSource.snapshot.pendingQuery ?? asyncSource.snapshot.query;
    const next = normalizeQuery(
      current,
      patch,
      asyncSource.snapshot.pagination.total > 0 ? asyncSource.snapshot.pagination.count : undefined,
    );

    if (sameQuery(next, requestedQuery)) return;

    requestedQuery = next;
    await fetch(next);
  };

  const source: PageSource<T, TFilter, TSort> = {
    get disposalSignal() {
      return asyncSource.disposalSignal;
    },

    dispose: asyncSource.dispose,

    get disposed() {
      return asyncSource.disposed;
    },

    page: {
      go(index) {
        return asyncSource.snapshot.isFetching ? Promise.resolve() : setQuery({ page: index });
      },

      last() {
        return asyncSource.snapshot.isFetching
          ? Promise.resolve()
          : setQuery({ page: asyncSource.snapshot.pagination.count });
      },

      next() {
        return asyncSource.snapshot.isFetching || !asyncSource.snapshot.pagination.hasNext
          ? Promise.resolve()
          : setQuery({ page: asyncSource.snapshot.pagination.index + 1 });
      },

      previous() {
        return asyncSource.snapshot.isFetching || !asyncSource.snapshot.pagination.hasPrevious
          ? Promise.resolve()
          : setQuery({ page: asyncSource.snapshot.pagination.index - 1 });
      },
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
