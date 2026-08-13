import { warn } from './_dev';
import { createAsyncSource } from './asyncSource';
import { positiveInteger, sameQuery, totalItems } from './pagination';
import type { CursorPagination, CursorQuery, CursorQueryPatch, CursorSource, CursorSourceConfig } from './types';

const createPagination = <TCursor>(result?: {
  nextCursor?: TCursor;
  previousCursor?: TCursor;
  total?: number;
}): CursorPagination<TCursor> => ({
  hasNext: result?.nextCursor !== undefined,
  hasPrevious: result?.previousCursor !== undefined,
  kind: 'cursor',
  ...(result?.nextCursor !== undefined && { nextCursor: result.nextCursor }),
  ...(result?.previousCursor !== undefined && { previousCursor: result.previousCursor }),
  ...(result?.total !== undefined && { total: totalItems(result.total) }),
});

const normalizeQuery = <TCursor>(
  current: CursorQuery<TCursor>,
  patch: CursorQueryPatch<TCursor> = {},
): CursorQuery<TCursor> => {
  if (patch.after !== undefined && patch.before !== undefined) {
    throw new RangeError('Cursor query cannot include both after and before');
  }

  const resetsCursor = patch.pageSize !== undefined || patch.search !== undefined;
  const after = resetsCursor || 'before' in patch ? undefined : 'after' in patch ? patch.after : current.after;
  const before = resetsCursor || 'after' in patch ? undefined : 'before' in patch ? patch.before : current.before;

  return {
    ...(after !== undefined && { after }),
    ...(before !== undefined && { before }),
    pageSize: positiveInteger(patch.pageSize ?? current.pageSize, 'pageSize'),
    search: patch.search ?? current.search,
  };
};

/** Cursor sources retain loaded cursors while pendingQuery records newer navigation. */
export function createCursorSource<T, TCursor = string>(
  config: CursorSourceConfig<T, TCursor>,
): CursorSource<T, TCursor> {
  const initialQuery: CursorQuery<TCursor> = { pageSize: 20, search: '' };
  let requestedQuery = normalizeQuery(initialQuery, config.initialQuery);
  const asyncSource = createAsyncSource<T, CursorQuery<TCursor>, CursorPagination<TCursor>>({
    data: [],
    error: null,
    isFetching: false,
    pagination: createPagination(),
    query: requestedQuery,
  });

  const fetch = (query: CursorQuery<TCursor>): Promise<void> =>
    asyncSource.fetch({
      failure: (previous, error) => ({ ...previous, error, isFetching: false, pendingQuery: undefined }),
      load: (signal) => config.load({ query, signal }),
      pending: (previous) => ({ ...previous, error: null, isFetching: true, pendingQuery: query }),
      success: (result) => ({
        data: result.data,
        error: null,
        isFetching: false,
        pagination: createPagination(result),
        query,
      }),
    });

  const reload = (): Promise<void> => fetch(requestedQuery);

  const setQuery = async (patch: CursorQueryPatch<TCursor>): Promise<void> => {
    const current = asyncSource.snapshot.pendingQuery ?? asyncSource.snapshot.query;
    const next = normalizeQuery(current, patch);

    if (sameQuery(next, requestedQuery)) return;

    requestedQuery = next;
    await fetch(next);
  };

  const source: CursorSource<T, TCursor> = {
    get disposalSignal() {
      return asyncSource.disposalSignal;
    },

    dispose: asyncSource.dispose,

    get disposed() {
      return asyncSource.disposed;
    },

    page: {
      next() {
        const cursor = asyncSource.snapshot.pagination.nextCursor;

        return asyncSource.snapshot.isFetching || cursor === undefined
          ? Promise.resolve()
          : setQuery({ after: cursor });
      },

      previous() {
        const cursor = asyncSource.snapshot.pagination.previousCursor;

        return asyncSource.snapshot.isFetching || cursor === undefined
          ? Promise.resolve()
          : setQuery({ before: cursor });
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
