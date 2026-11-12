import { createAsyncSource } from './asyncSource';
import { SourcererDisposedError } from './errors';
import { positiveInteger, sameParams, totalItems } from './pagination';
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
  const initial: Request<TParams> = {
    pageSize: positiveInteger(config.pageSize ?? 20, 'pageSize'),
    params: config.params as TParams,
  };
  let requested: Request<TParams> = initial;
  let committed: Request<TParams> = initial;
  let nextPage = 1;
  let committedNextPage = 1;
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

  const fetch = (request: Request<TParams>, page: number, append: boolean): Promise<void> =>
    asyncSource.fetch({
      commit: () => {
        hasLoaded = true;
        committed = request;
        committedNextPage = page + 1;
        requested = request;
        nextPage = page + 1;
      },
      // Only the current request reaches `failure` (superseded work settles silently),
      // so the desired request rolls back to what the published feed still shows.
      failure: (previous, error) => {
        requested = committed;
        nextPage = committedNextPage;
        return { ...previous, error, loading: false, pendingParams: undefined };
      },
      load: (signal) => config.load({ page, pageSize: request.pageSize, params: request.params, signal }),
      pending: (previous) => ({
        ...previous,
        error: null,
        loading: true,
        ...(append || sameParams(request.params, previous.params) ? {} : { pendingParams: request.params }),
      }),
      success: (result) => {
        const items = append ? [...asyncSource.state.items, ...result.items] : [...result.items];
        return {
          error: null,
          items,
          loading: false,
          pagination: createPagination(items.length, request.pageSize, totalItems(result.totalItems)),
          params: request.params,
        };
      },
    });

  const reload = (): Promise<void> => fetch(requested, 1, false);

  const ensureLoaded = async (): Promise<void> => {
    // While idle, `requested` always matches the committed feed, so the only
    // missing work is the first load (which a failure rolls back to).
    if (!asyncSource.state.loading && !hasLoaded) await reload();
  };

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
      if (!hasLoaded) {
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
        await ensureLoaded();
        return;
      }
      requested = { ...requested, pageSize: normalized };
      await reload();
    },

    async setParams(params) {
      assertLive();
      if (sameParams(params, requested.params)) {
        await ensureLoaded();
        return;
      }
      requested = { ...requested, params };
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
