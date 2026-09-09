import { createAsyncSource } from './asyncSource';
import { SourcererDisposedError } from './errors';
import { positiveInteger, totalItems } from './pagination';
import type { InfinitePagination, InfiniteSource, InfiniteSourceConfig, InfiniteSourceState } from './types';

type Request<TParams> = Readonly<{ pageSize: number; params: TParams }>;

const createPagination = (loadedItems: number, pageSize: number, total: number): InfinitePagination => ({
  hasMore: loadedItems < total,
  loadedItems,
  pageSize,
  totalItems: total,
});

/** Infinite sources retain committed items while replacement work is pending. */
export function createInfiniteSource<T, TParams = undefined>(
  config: InfiniteSourceConfig<T, TParams>,
): InfiniteSource<T, TParams> {
  let requested: Request<TParams> = {
    pageSize: positiveInteger(config.pageSize ?? 20, 'pageSize'),
    params: config.params as TParams,
  };
  let nextPage = 1;
  let hasLoaded = false;
  const asyncSource = createAsyncSource<InfiniteSourceState<T, TParams>>({
    error: null,
    items: [],
    loading: false,
    pagination: createPagination(0, requested.pageSize, 0),
    params: requested.params,
  });
  const assertLive = (): void => {
    if (asyncSource.disposed) throw new SourcererDisposedError();
  };

  const fetch = (request: Request<TParams>, page: number, append: boolean): Promise<void> => {
    const loadedItems = asyncSource.state.items;

    return asyncSource.fetch({
      commit: () => {
        hasLoaded = true;
        nextPage = page + 1;
        requested = request;
      },
      failure: (previous, error) => ({ ...previous, error, loading: false, pendingParams: undefined }),
      load: (signal) => config.load({ page, pageSize: request.pageSize, params: request.params, signal }),
      pending: (previous) => ({
        ...previous,
        error: null,
        loading: true,
        ...(append || Object.is(request.params, previous.params) ? {} : { pendingParams: request.params }),
      }),
      success: (result) => {
        const items = append ? [...loadedItems, ...result.items] : [...result.items];
        return {
          error: null,
          items,
          loading: false,
          pagination: createPagination(items.length, request.pageSize, totalItems(result.totalItems)),
          params: request.params,
        };
      },
    });
  };

  const reload = (): Promise<void> => fetch(requested, 1, false);

  const source: InfiniteSource<T, TParams> = {
    get disposalSignal() {
      return asyncSource.disposalSignal;
    },

    dispose: asyncSource.dispose,

    get disposed() {
      return asyncSource.disposed;
    },

    async loadMore() {
      assertLive();
      if (asyncSource.state.loading) return;
      if (!hasLoaded || !Object.is(requested.params, asyncSource.state.params)) {
        await reload();
        return;
      }
      if (asyncSource.state.pagination.hasMore) await fetch(requested, nextPage, true);
    },

    reload,

    async setPageSize(pageSize) {
      assertLive();
      const normalized = positiveInteger(pageSize, 'pageSize');
      if (normalized === requested.pageSize) {
        if (asyncSource.state.loading || asyncSource.state.pagination.pageSize === normalized) return;
        await reload();
        return;
      }
      requested = { ...requested, pageSize: normalized };
      nextPage = 1;
      await reload();
    },

    async setParams(params) {
      assertLive();
      if (Object.is(params, requested.params)) {
        if (!asyncSource.state.loading && !Object.is(params, asyncSource.state.params)) await reload();
        return;
      }
      requested = { ...requested, params };
      nextPage = 1;
      await reload();
    },

    get state() {
      return asyncSource.state;
    },

    subscribe: asyncSource.subscribe,

    [Symbol.dispose]() {
      source.dispose();
    },
  };

  return source;
}
