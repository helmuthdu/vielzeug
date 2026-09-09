import { createAsyncSource } from './asyncSource';
import { SourcererDisposedError } from './errors';
import { createPagePagination, positiveInteger, totalItems } from './pagination';
import type { PageSource, PageSourceConfig, PageSourceState } from './types';

type Request<TParams> = Readonly<{ page: number; pageSize: number; params: TParams }>;

/** Page sources retain committed items while replacement work is pending. */
export function createPageSource<T, TParams = undefined>(config: PageSourceConfig<T, TParams>): PageSource<T, TParams> {
  let requested: Request<TParams> = {
    page: 1,
    pageSize: positiveInteger(config.pageSize ?? 20, 'pageSize'),
    params: config.params as TParams,
  };
  let hasLoaded = false;
  const asyncSource = createAsyncSource<PageSourceState<T, TParams>>({
    error: null,
    items: [],
    loading: false,
    pagination: createPagePagination(requested.page, requested.pageSize, 0),
    params: requested.params,
  });
  const assertLive = (): void => {
    if (asyncSource.disposed) throw new SourcererDisposedError();
  };
  const isCommitted = (request: Request<TParams>): boolean =>
    asyncSource.state.pagination.page === request.page &&
    asyncSource.state.pagination.pageSize === request.pageSize &&
    Object.is(asyncSource.state.params, request.params);

  const fetch = (request: Request<TParams>): Promise<void> =>
    asyncSource.fetch({
      commit: () => {
        hasLoaded = true;
        requested = request;
      },
      failure: (previous, error) => ({ ...previous, error, loading: false, pendingParams: undefined }),
      load: (signal) => config.load({ ...request, signal }),
      pending: (previous) => ({
        ...previous,
        error: null,
        loading: true,
        ...(Object.is(request.params, previous.params) ? {} : { pendingParams: request.params }),
      }),
      success: (result) => ({
        error: null,
        items: [...result.items],
        loading: false,
        pagination: createPagePagination(request.page, request.pageSize, totalItems(result.totalItems)),
        params: request.params,
      }),
    });

  const goTo = async (page: number): Promise<void> => {
    assertLive();
    const normalized = hasLoaded
      ? Math.min(positiveInteger(page, 'page'), asyncSource.state.pagination.pageCount)
      : positiveInteger(page, 'page');
    if (normalized === requested.page) {
      if (!asyncSource.state.loading && (!hasLoaded || !isCommitted(requested))) await fetch(requested);
      return;
    }
    requested = { ...requested, page: normalized };
    await fetch(requested);
  };

  const source: PageSource<T, TParams> = {
    get disposalSignal() {
      return asyncSource.disposalSignal;
    },

    dispose: asyncSource.dispose,

    get disposed() {
      return asyncSource.disposed;
    },

    first() {
      return goTo(1);
    },

    goTo,

    last() {
      return goTo(asyncSource.state.pagination.pageCount);
    },

    async next() {
      assertLive();
      if (!hasLoaded || requested.page < asyncSource.state.pagination.pageCount) await goTo(requested.page + 1);
    },

    async previous() {
      assertLive();
      if (requested.page > 1) await goTo(requested.page - 1);
    },

    reload() {
      return fetch(requested);
    },

    async setPageSize(pageSize) {
      assertLive();
      const normalized = positiveInteger(pageSize, 'pageSize');
      if (normalized === requested.pageSize && requested.page === 1) {
        if (!asyncSource.state.loading && !isCommitted(requested)) await fetch(requested);
        return;
      }
      requested = { ...requested, page: 1, pageSize: normalized };
      await fetch(requested);
    },

    async setParams(params) {
      assertLive();
      if (Object.is(params, requested.params)) {
        if (!asyncSource.state.loading && !isCommitted(requested)) await fetch(requested);
        return;
      }
      requested = { ...requested, page: 1, params };
      await fetch(requested);
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
