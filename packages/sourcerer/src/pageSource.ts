import { createAsyncSource } from './asyncSource';
import { SourcererDisposedError } from './errors';
import { createPagePagination, positiveInteger, sameParams, totalItems } from './pagination';
import type { PageSource, PageSourceConfig, PageSourceState } from './types';

type Request<TParams> = Readonly<{ page: number; pageSize: number; params: TParams }>;

/** Page sources retain committed items while replacement work is pending. */
export function createPageSource<T, TParams = undefined>(config: PageSourceConfig<T, TParams>): PageSource<T, TParams> {
  const initial: Request<TParams> = {
    page: 1,
    pageSize: positiveInteger(config.pageSize ?? 20, 'pageSize'),
    params: config.params as TParams,
  };
  let requested: Request<TParams> = initial;
  let committed: Request<TParams> = initial;
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
  const ensureLoaded = async (): Promise<void> => {
    // While idle, `requested` always matches the committed request, so the only
    // missing work is the first load (which a failure rolls back to).
    if (!asyncSource.state.loading && !hasLoaded) await fetch(requested);
  };

  const fetch = (request: Request<TParams>): Promise<void> =>
    asyncSource.fetch({
      commit: () => {
        hasLoaded = true;
        committed = request;
        requested = request;
      },
      // Only the current request reaches `failure` (superseded work settles silently),
      // so the desired request rolls back to what the published state still shows.
      failure: (previous, error) => {
        requested = committed;
        return { ...previous, error, loading: false, pendingParams: undefined };
      },
      load: (signal) => config.load({ ...request, signal }),
      pending: (previous) => ({
        ...previous,
        error: null,
        loading: true,
        ...(sameParams(request.params, previous.params) ? {} : { pendingParams: request.params }),
      }),
      success: (result) => ({
        error: null,
        items: [...result.items],
        loading: false,
        pagination: createPagePagination(request.page, request.pageSize, totalItems(result.totalItems)),
        params: request.params,
      }),
    });

  const normalizePage = (page: number): number =>
    hasLoaded
      ? Math.min(positiveInteger(page, 'page'), asyncSource.state.pagination.pageCount)
      : positiveInteger(page, 'page');

  const goTo = async (page: number): Promise<void> => {
    assertLive();
    const normalized = normalizePage(page);
    if (normalized === requested.page) {
      await ensureLoaded();
      return;
    }
    requested = { ...requested, page: normalized };
    await fetch(requested);
  };

  const source: PageSource<T, TParams> = {
    async apply(update) {
      assertLive();
      // An absent `params` means "not part of this update", which is how a source whose
      // TParams genuinely allows undefined keeps its params: use setParams for that.
      const params = update.params === undefined ? requested.params : update.params;

      if (!sameParams(params, requested.params)) {
        // The committed page count belongs to the previous params, so clamping here
        // would clamp to a stale bound. The requested page is validated and sent as
        // given; the response recomputes pagination from real totals.
        requested = {
          ...requested,
          page: update.page === undefined ? 1 : positiveInteger(update.page, 'page'),
          params,
        };
        await fetch(requested);
        return;
      }

      if (update.page !== undefined) {
        await goTo(update.page);
        return;
      }

      await ensureLoaded();
    },

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
      if (!hasLoaded) await goTo(1);
      else if (requested.page < asyncSource.state.pagination.pageCount) await goTo(requested.page + 1);
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
        await ensureLoaded();
        return;
      }
      requested = { ...requested, page: 1, pageSize: normalized };
      await fetch(requested);
    },

    async setParams(params) {
      assertLive();
      if (sameParams(params, requested.params)) {
        await ensureLoaded();
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
