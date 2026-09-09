import { createAsyncSource } from './asyncSource';
import { SourcererConfigurationError, SourcererDisposedError } from './errors';
import { positiveInteger, totalItems } from './pagination';
import type { CursorPagination, CursorResult, CursorSource, CursorSourceConfig, CursorSourceState } from './types';

type Request<TParams, TCursor> = Readonly<{
  after?: TCursor;
  before?: TCursor;
  pageSize: number;
  params: TParams;
}>;

const createPagination = <TCursor>(
  pageSize: number,
  result?: CursorResult<unknown, TCursor>,
): CursorPagination<TCursor> => ({
  ...(result?.nextCursor !== undefined && { nextCursor: result.nextCursor }),
  pageSize,
  ...(result?.previousCursor !== undefined && { previousCursor: result.previousCursor }),
  ...(result?.totalItems !== undefined && { totalItems: totalItems(result.totalItems) }),
});

/** Cursor sources retain committed items and cursors while replacement work is pending. */
export function createCursorSource<T, TParams = undefined, TCursor = string>(
  config: CursorSourceConfig<T, TParams, TCursor>,
): CursorSource<T, TParams, TCursor> {
  if (config.after !== undefined && config.before !== undefined) {
    throw new SourcererConfigurationError('Cursor source cannot start with both after and before');
  }

  let requested: Request<TParams, TCursor> = {
    ...(config.after !== undefined && { after: config.after }),
    ...(config.before !== undefined && { before: config.before }),
    pageSize: positiveInteger(config.pageSize ?? 20, 'pageSize'),
    params: config.params as TParams,
  };
  const asyncSource = createAsyncSource<CursorSourceState<T, TParams, TCursor>>({
    error: null,
    items: [],
    loading: false,
    pagination: createPagination(requested.pageSize),
    params: requested.params,
  });
  const assertLive = (): void => {
    if (asyncSource.disposed) throw new SourcererDisposedError();
  };

  const fetch = (request: Request<TParams, TCursor>): Promise<void> =>
    asyncSource.fetch({
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
        pagination: createPagination(request.pageSize, result),
        params: request.params,
      }),
    });

  const source: CursorSource<T, TParams, TCursor> = {
    get disposalSignal() {
      return asyncSource.disposalSignal;
    },

    dispose: asyncSource.dispose,

    get disposed() {
      return asyncSource.disposed;
    },

    async next() {
      assertLive();
      const cursor = asyncSource.state.pagination.nextCursor;
      if (asyncSource.state.loading || cursor === undefined) return;
      requested = { after: cursor, pageSize: requested.pageSize, params: requested.params };
      await fetch(requested);
    },

    async previous() {
      assertLive();
      const cursor = asyncSource.state.pagination.previousCursor;
      if (asyncSource.state.loading || cursor === undefined) return;
      requested = { before: cursor, pageSize: requested.pageSize, params: requested.params };
      await fetch(requested);
    },

    reload() {
      return fetch(requested);
    },

    async setPageSize(pageSize) {
      assertLive();
      const normalized = positiveInteger(pageSize, 'pageSize');
      if (normalized === requested.pageSize && requested.after === undefined && requested.before === undefined) {
        if (
          asyncSource.state.loading ||
          (asyncSource.state.pagination.pageSize === normalized &&
            Object.is(asyncSource.state.params, requested.params))
        )
          return;
        await fetch(requested);
        return;
      }
      requested = { pageSize: normalized, params: requested.params };
      await fetch(requested);
    },

    async setParams(params) {
      assertLive();
      if (Object.is(params, requested.params)) {
        if (!asyncSource.state.loading && !Object.is(params, asyncSource.state.params)) await fetch(requested);
        return;
      }
      requested = { pageSize: requested.pageSize, params };
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
