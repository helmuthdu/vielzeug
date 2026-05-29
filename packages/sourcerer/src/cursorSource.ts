import type { CursorConfig, CursorMeta, CursorSource } from './types';

import { defaultKeyOf } from './utils';

const DEFAULTS = { debounceMs: 300, limit: 10 } as const;

/**
 * Creates a cursor-based data source backed by a remote fetch function.
 * Uses cursor tokens (e.g. opaque strings from the server) rather than page numbers.
 * Supports both forward (next) and backward (prev) navigation.
 *
 * @example
 * ```ts
 * const source = createCursorSource({
 *   fetch: async ({ after, limit }, signal) => {
 *     const res = await fetch(`/api/items?after=${after ?? ''}&limit=${limit}`, { signal });
 *     const { items, nextCursor, prevCursor, total } = await res.json();
 *     return { items, nextCursor, prevCursor, total };
 *   },
 * });
 *
 * await source.ready();
 * console.log(source.current, source.meta);
 * ```
 */
export function createCursorSource<T, TCursor = string>(cfg: CursorConfig<T, TCursor>): CursorSource<T> {
  const listeners = new Set<() => void>();
  const limitDefault = Math.max(1, cfg.limit ?? DEFAULTS.limit);
  const debounceMs = cfg.debounceMs ?? DEFAULTS.debounceMs;
  const keyOf = cfg.queryKey ?? defaultKeyOf;
  const autoFetch = cfg.autoFetch ?? true;

  let limit = limitDefault;
  let search = '';
  let after: TCursor | undefined;
  let before: TCursor | undefined;
  let nextCursor: TCursor | undefined;
  let prevCursor: TCursor | undefined;

  let items: readonly T[] = [];
  let total = 0;
  let error: string | null = null;
  let cachedMeta!: CursorMeta;
  let pendingCount = 0;
  let latestKey = '';
  let timer: ReturnType<typeof setTimeout> | undefined;

  const inflight = new Map<string, { controller: AbortController; promise: Promise<void> }>();

  const queryOf = () => ({
    after,
    before,
    limit,
    search: search || undefined,
  });

  const refreshMeta = () => {
    cachedMeta = {
      errorMessage: error,
      hasNextPage: nextCursor !== undefined,
      hasPrevPage: prevCursor !== undefined,
      isLoading: pendingCount > 0,
      isSearchPending: timer !== undefined,
      pageSize: limit,
      totalItems: total,
    };
  };

  const notify = () => {
    refreshMeta();

    for (const listener of listeners) {
      listener();
    }
  };

  const fetchQuery = async (q: ReturnType<typeof queryOf>): Promise<void> => {
    const key = keyOf(q);

    latestKey = key;

    // Abort superseded requests.
    for (const [k, entry] of inflight) {
      if (k !== key) {
        entry.controller.abort();
      }
    }

    if (inflight.has(key)) {
      pendingCount++;
      notify();

      try {
        await inflight.get(key)!.promise;
      } finally {
        pendingCount--;
        notify();
      }

      return;
    }

    const controller = new AbortController();

    pendingCount++;
    error = null;
    notify();

    const promise = cfg
      .fetch(q, controller.signal)
      .then((result) => {
        if (key === latestKey) {
          items = result.items;
          total = result.total ?? 0;
          nextCursor = result.nextCursor;
          prevCursor = result.prevCursor;
          error = null;
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;

        if (key === latestKey) {
          error = (reason as { message?: string })?.message ?? 'Request failed';
          items = [];
          total = 0;
          nextCursor = undefined;
          prevCursor = undefined;
        }
      })
      .finally(() => {
        inflight.delete(key);
        pendingCount--;
        notify();
      });

    inflight.set(key, { controller, promise });
    await promise;
  };

  const doUpdate = () => fetchQuery(queryOf());

  const debounced = () => {
    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      timer = undefined;
      void doUpdate();
    }, debounceMs);

    notify();
  };

  refreshMeta();

  if (autoFetch) {
    void doUpdate();
  }

  return {
    get current() {
      return items;
    },

    get meta() {
      return cachedMeta;
    },

    next(): Promise<void> {
      if (!nextCursor) return Promise.resolve();

      after = nextCursor;
      before = undefined;

      return doUpdate();
    },

    prev(): Promise<void> {
      if (!prevCursor) return Promise.resolve();

      before = prevCursor;
      after = undefined;

      return doUpdate();
    },

    ready(): Promise<void> {
      if (pendingCount === 0 && !timer) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        const checkReady = () => {
          if (pendingCount === 0 && !timer) {
            listeners.delete(checkReady);
            resolve();
          }
        };

        listeners.add(checkReady);
      });
    },

    refresh(): Promise<void> {
      return doUpdate();
    },

    reset(): Promise<void> {
      limit = limitDefault;
      search = '';
      after = undefined;
      before = undefined;
      nextCursor = undefined;
      prevCursor = undefined;

      return doUpdate();
    },

    search(q: string) {
      search = q;
      after = undefined;
      before = undefined;
      debounced();
    },

    searchNow(q: string): Promise<void> {
      search = q;
      after = undefined;
      before = undefined;

      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }

      return doUpdate();
    },

    setLimit(n: number): Promise<void> {
      limit = Math.max(1, Math.trunc(n));
      after = undefined;
      before = undefined;

      return doUpdate();
    },

    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };
}
