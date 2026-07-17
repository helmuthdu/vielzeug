import type { CursorConfig, CursorMeta, CursorSource, CursorSourceQuery, SearchOptions } from './types';

import { defaultKeyOf, extractError, retry } from './_utils';
import { createAsyncSearchCoordinator } from './asyncSearch';
import { createAsyncSource } from './asyncSource';
import { SourcererError } from './errors';

/** Creates a cursor-based (keyset-pagination) source that fetches data from a network endpoint. */
export function createCursorSource<T, TCursor = string>(cfg: CursorConfig<T, TCursor>): CursorSource<T, TCursor> {
  const keyOf = cfg.queryKey ?? defaultKeyOf;

  // ── Mutable state ───────────────────────────────────────────────────────────
  let limit = Math.max(1, Math.trunc(cfg.limit ?? 20));
  let search = '';
  let afterCursor: TCursor | undefined;
  let beforeCursor: TCursor | undefined;
  let nextCursor: TCursor | undefined;
  let prevCursor: TCursor | undefined;
  let items: readonly T[] = [];
  let total = 0;
  let error: SourcererError | null = null;

  // ── Cached accessors ────────────────────────────────────────────────────────
  let cachedCurrent: readonly T[] = [];
  let cachedMeta: CursorMeta = {
    error: null,
    hasNextPage: false,
    hasPrevPage: false,
    isLoading: false,
    isSearchPending: false,
    pageSize: limit,
    totalItems: 0,
  };

  const refreshMeta = () => {
    cachedCurrent = items;
    cachedMeta = {
      error,
      hasNextPage: nextCursor !== undefined,
      hasPrevPage: prevCursor !== undefined,
      isLoading: base.pendingCount() > 0,
      isSearchPending: base.core.isScheduled,
      pageSize: limit,
      totalItems: total,
    };
  };

  // onBeforeNotify ensures refreshMeta() runs before any subscriber observes the new state,
  // eliminating the need for a parallel listeners Set.
  const base = createAsyncSource<CursorSourceQuery<TCursor>>(cfg, keyOf, refreshMeta);
  const { autoFetch, debounceMs, retryAttempts, retryDelay } = base;

  refreshMeta();

  const notifyListeners = () => {
    if (base.disposed) return;

    base.core.notify();
  };
  const searchCoordinator = createAsyncSearchCoordinator(base.core, notifyListeners);

  // ── Core fetch ──────────────────────────────────────────────────────────────
  const toRemoteQuery = (): CursorSourceQuery<TCursor> => ({
    ...(afterCursor !== undefined && { after: afterCursor }),
    ...(beforeCursor !== undefined && { before: beforeCursor }),
    ...(search && { search }),
    limit,
  });

  const fetchQuery = (q: CursorSourceQuery<TCursor>): Promise<void> => {
    error = null;

    return base.fetch(
      q,
      async (q, signal, isLatest) => {
        const startTime = Date.now();

        try {
          const result = await retry((sig) => cfg.fetch(q, sig!), {
            delay: retryDelay,
            signal,
            times: retryAttempts + 1,
          });

          if (isLatest()) {
            items = result.items;
            total = result.total ?? result.items.length;
            nextCursor = result.nextCursor;
            prevCursor = result.prevCursor;
            error = null;
            cfg.onFetch?.({ durationMs: Date.now() - startTime, query: q, status: 'success' });
          }
        } catch (reason: unknown) {
          if (signal.aborted) return;

          if (isLatest()) {
            items = [];
            total = 0;
            nextCursor = undefined;
            prevCursor = undefined;
            error = new SourcererError(extractError(reason), {
              cause: reason,
              context: { kind: 'cursor', limit: q.limit, ...(q.search && { search: q.search }) },
            });
            cfg.onFetch?.({ durationMs: Date.now() - startTime, error, query: q, status: 'error' });
          }
        }
      },
      () => {
        notifyListeners();

        searchCoordinator.settleIfIdle(base.pendingCount());
      },
    );
  };

  const doUpdate = () => fetchQuery(toRemoteQuery());

  // ── Auto-fetch + refresh interval ───────────────────────────────────────────
  if (autoFetch) void doUpdate();

  base.startRefreshInterval(() => void doUpdate());

  // ── Public API ──────────────────────────────────────────────────────────────
  return {
    get current() {
      return cachedCurrent;
    },

    get disposalSignal() {
      return base.disposalSignal;
    },

    dispose: () => {
      searchCoordinator.cancel();
      searchCoordinator.dispose();
      base.dispose();
    },

    get disposed() {
      return base.disposed;
    },

    get meta() {
      return cachedMeta;
    },

    next() {
      if (!nextCursor) return Promise.resolve();

      afterCursor = nextCursor;
      beforeCursor = undefined;

      return doUpdate();
    },

    patch(changes) {
      let changed = false;

      if (changes.limit !== undefined) {
        const next = Math.max(1, Math.trunc(changes.limit));

        if (next !== limit) {
          limit = next;
          afterCursor = undefined;
          beforeCursor = undefined;
          changed = true;
        }
      }

      // `|| base.core.isScheduled` also catches patching in the same search text as an already-pending
      // debounced search() call — that still needs flushing, not silently dropping as a no-op.
      if ('search' in changes && (changes.search !== search || base.core.isScheduled)) {
        search = changes.search ?? '';
        afterCursor = undefined;
        beforeCursor = undefined;
        changed = true;
      }

      if (!changed) return Promise.resolve();

      // patch() is documented as a single atomic fetch — cancel any debounced search()
      // still pending so it doesn't fire a second, redundant fetch afterwards.
      searchCoordinator.cancel();

      return doUpdate();
    },

    prev() {
      if (!prevCursor) return Promise.resolve();

      beforeCursor = prevCursor;
      afterCursor = undefined;

      return doUpdate();
    },

    get query() {
      return {
        ...(afterCursor !== undefined && { after: afterCursor }),
        ...(beforeCursor !== undefined && { before: beforeCursor }),
        ...(search && { search }),
        limit,
      };
    },

    ready(timeout) {
      return base.ready(timeout);
    },

    refresh() {
      return doUpdate();
    },

    reset() {
      searchCoordinator.cancel();
      search = '';
      afterCursor = undefined;
      beforeCursor = undefined;

      return doUpdate();
    },

    search(q, opts?: SearchOptions): Promise<void> {
      if (opts?.immediate) {
        // A pending debounced search for this same text still needs flushing —
        // `q === search` alone doesn't mean the fetch already happened.
        if (q === search && !base.core.isScheduled) return Promise.resolve();

        searchCoordinator.cancel();
        search = q;
        afterCursor = undefined;
        beforeCursor = undefined;

        return doUpdate();
      }

      if (q === search) return Promise.resolve();

      search = q;
      afterCursor = undefined;
      beforeCursor = undefined;

      return searchCoordinator.schedule(() => void doUpdate(), debounceMs);
    },

    subscribe: (listener) => base.core.subscribe(listener),

    [Symbol.dispose]: () => {
      searchCoordinator.cancel();
      searchCoordinator.dispose();
      base.dispose();
    },
  };
}
