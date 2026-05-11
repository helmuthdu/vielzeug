import { stash, retry } from '@vielzeug/toolkit';

import type { RetryOptions } from './retry';
import type { QueryKey, QueryState, QueryStatus, Unsubscribe } from './types';

import { DEFAULT_RETRY, getRetryConfig } from './retry';
import { stableStringify } from './serialize';

const DEFAULT_GC = 5 * 60_000;

export type QueryFnContext = {
  key: QueryKey;
  signal: AbortSignal;
};

export type QueryOptions<T> = {
  /** When `false` the fetch is skipped and the entry stays `'idle'`. Defaults to `true`. */
  enabled?: boolean;
  fn: (ctx: QueryFnContext) => Promise<T>;
  gcTime?: number;
  /** Pre-seed the cache as a successful entry when no data exists. Subject to normal staleTime checks. */
  initialData?: T | (() => T | undefined);
  key: QueryKey;
  /** Shown as `data` while the entry is fetching. Not stored in cache. */
  placeholderData?: T | (() => T | undefined);
  staleTime?: number;
} & RetryOptions;

export type PrefetchOptions<T> = QueryOptions<T> & {
  throwOnError?: boolean;
};

export type QueryClientOptions = {
  gcTime?: number;
  /** Revalidate stale observed entries when the document regains focus. */
  refetchOnFocus?: boolean;
  /** Revalidate stale observed entries when the network comes back online. */
  refetchOnReconnect?: boolean;
  staleTime?: number;
} & RetryOptions;

type CacheEntry<T = unknown> = {
  data: T | undefined;
  error: Error | null;
  fn: ((ctx: QueryFnContext) => Promise<T>) | undefined;
  gcTime: number;
  inflight: { controller: AbortController; promise: Promise<T> } | null;
  key: QueryKey;
  observers: Set<(state: QueryState<T>) => void>;
  placeholderData: T | undefined;
  staleTime: number;
  status: QueryStatus;
  updatedAt: number;
};

export function createQuery(opts?: QueryClientOptions) {
  const staleTimeDefault = opts?.staleTime ?? 0;
  const gcTimeDefault = opts?.gcTime ?? DEFAULT_GC;
  const retryDefault = opts?.retry ?? DEFAULT_RETRY;
  const retryDelayDefault = opts?.retryDelay;
  const shouldRetryDefault = opts?.shouldRetry;
  let disposed = false;

  const cache = stash<CacheEntry, QueryKey>({
    hash: stableStringify,
    onError: (error) => {
      const name = error instanceof Error ? error.name : undefined;

      if (name === 'AbortError') {
        return;
      }

      console.error('[fetchit] Query cache GC scheduler error', error);
    },
  });

  function toState<T>(entry: CacheEntry<T>): QueryState<T> {
    return {
      data: entry.data !== undefined ? entry.data : entry.placeholderData,
      error: entry.error,
      status: entry.status,
      updatedAt: entry.updatedAt,
    };
  }

  function ensureEntry<T>(key: QueryKey, gcTime = gcTimeDefault): CacheEntry<T> {
    let e = cache.get(key) as CacheEntry<T> | undefined;

    if (!e) {
      e = {
        data: undefined,
        error: null,
        fn: undefined,
        gcTime,
        inflight: null,
        key,
        observers: new Set(),
        placeholderData: undefined,
        staleTime: staleTimeDefault,
        status: 'idle',
        updatedAt: 0,
      };
      cache.set(key, e as CacheEntry<unknown>);
    }

    return e;
  }

  function notify<T>(entry: CacheEntry<T>) {
    const state = toState(entry);

    entry.observers.forEach((listener) => listener(state));
  }

  function scheduleGc<T>(entry: CacheEntry<T>) {
    cache.cancelGc(entry.key);

    // Keep observed entries alive. GC is re-armed when the last observer unsubscribes.
    if (entry.observers.size > 0) {
      return;
    }

    cache.scheduleGc(entry.key, entry.gcTime);
  }

  function cleanupEntry(entry: CacheEntry) {
    entry.inflight?.controller.abort();
    cache.cancelGc(entry.key);
  }

  function isKeyOrPrefix(entryKey: QueryKey, prefixHash: readonly string[]): boolean {
    if (prefixHash.length > entryKey.length) return false;

    return prefixHash.every((seg, i) => seg === stableStringify(entryKey[i]));
  }

  function resolveValue<T>(v: T | (() => T | undefined) | undefined): T | undefined {
    return typeof v === 'function' ? (v as () => T | undefined)() : v;
  }

  async function fetchQuery<T>(options: QueryOptions<T>): Promise<T> {
    if (disposed) throw new Error('[fetchit] QueryClient has been disposed');

    const {
      enabled = true,
      fn: queryFn,
      gcTime = gcTimeDefault,
      initialData,
      key: queryKey,
      placeholderData,
      retry: retryCount = retryDefault,
      retryDelay = retryDelayDefault,
      shouldRetry = shouldRetryDefault,
      staleTime = staleTimeDefault,
    } = options;

    const entry = ensureEntry<T>(queryKey, gcTime);

    entry.gcTime = gcTime;
    entry.fn = queryFn;
    entry.staleTime = staleTime;

    // Seed cache from initialData if no data exists yet.
    if (initialData !== undefined && entry.data === undefined) {
      const initVal = resolveValue(initialData);

      if (initVal !== undefined) {
        entry.data = initVal;
        entry.status = 'success';
        entry.updatedAt = Date.now();
      }
    }

    // Attach placeholderData for visual fill while pending.
    if (placeholderData !== undefined) {
      entry.placeholderData = resolveValue(placeholderData);
    }

    // Skip fetch when explicitly disabled.
    if (!enabled) {
      return entry.data as T;
    }

    if (entry.status === 'success' && Date.now() - entry.updatedAt < staleTime) {
      return entry.data as T;
    }

    if (entry.inflight) return entry.inflight.promise;

    const controller = new AbortController();

    entry.status = 'pending';
    notify(entry);

    const retryOpts = getRetryConfig(retryCount, retryDelay, shouldRetry);

    const p = (async () => {
      try {
        const data = await retry(() => queryFn({ key: queryKey, signal: controller.signal }), {
          ...retryOpts,
          signal: controller.signal,
        });

        entry.data = data;
        entry.status = 'success';
        entry.updatedAt = Date.now();
        entry.error = null;
        entry.inflight = null;
        scheduleGc(entry);
        notify(entry);

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const isAborted = controller.signal.aborted || error.name === 'AbortError';

        // cancel() already cleared inflight and notified listeners.
        if (isAborted && entry.inflight === null) throw error;

        if (isAborted) {
          entry.status = entry.data !== undefined ? 'success' : 'idle';
          entry.error = null;

          if (entry.status === 'success') {
            scheduleGc(entry);
          } else if (entry.observers.size === 0) {
            cache.delete(queryKey);
          }
        } else {
          entry.status = 'error';
          entry.error = error;
          entry.updatedAt = Date.now();
          entry.gcTime = gcTime;
          scheduleGc(entry);
        }

        entry.inflight = null;
        notify(entry);

        throw error;
      }
    })();

    entry.inflight = { controller, promise: p };

    return p;
  }

  function evictEntry(entry: CacheEntry) {
    cleanupEntry(entry);

    if (entry.observers.size > 0) {
      entry.status = 'idle';
      entry.data = undefined;
      entry.error = null;
      notify(entry);
    } else {
      cache.delete(entry.key);
    }
  }

  function invalidate(key: QueryKey) {
    const prefixHash = key.map(stableStringify);

    for (const [, entry] of cache.entries()) {
      if (isKeyOrPrefix(entry.key, prefixHash)) evictEntry(entry);
    }
  }

  function clearCache() {
    for (const [, entry] of cache.entries()) {
      evictEntry(entry);
    }
    // evictEntry intentionally keeps entries with active observers in the cache
    // (reset to idle). Do not call cache.clear() here — it would orphan live subscriptions.
  }

  function set<T>(key: QueryKey, data: T, opts?: { gcTime?: number }): void;
  function set<T>(key: QueryKey, updater: (old: T | undefined) => T, opts?: { gcTime?: number }): void;
  function set<T>(key: QueryKey, dataOrUpdater: T | ((old: T | undefined) => T), opts?: { gcTime?: number }) {
    const entry = ensureEntry<T>(key);
    const gcTime = opts?.gcTime ?? entry.gcTime;

    entry.data =
      typeof dataOrUpdater === 'function' ? (dataOrUpdater as (old: T | undefined) => T)(entry.data) : dataOrUpdater;
    entry.updatedAt = Date.now();
    entry.status = 'success';
    entry.gcTime = gcTime;
    scheduleGc(entry);
    notify(entry);
  }

  function get<T>(key: QueryKey): T | undefined {
    return cache.get(key)?.data as T | undefined;
  }

  function getState<T>(key: QueryKey): QueryState<T> | null {
    const entry = cache.get(key) as CacheEntry<T> | undefined;

    return entry ? toState(entry) : null;
  }

  function subscribe<T = unknown, S = T>(
    key: QueryKey,
    listener: (state: QueryState<S>) => void,
    opts?: { select?: (data: T | undefined) => S | undefined },
  ): Unsubscribe {
    const entry = ensureEntry<T>(key);
    const select = opts?.select;

    cache.cancelGc(key);

    let internalListener: (state: QueryState<T>) => void;

    if (select) {
      // Wrap listener: only fire when the selected value, status, or error changes.
      let prevSelected: S | undefined = select(entry.data);
      let prevStatus = entry.status;
      let prevError = entry.error;

      internalListener = (state: QueryState<T>) => {
        const selected = select(state.data);

        if (Object.is(selected, prevSelected) && state.status === prevStatus && Object.is(state.error, prevError)) {
          return;
        }

        prevSelected = selected;
        prevStatus = state.status;
        prevError = state.error;
        listener({ ...state, data: selected } as unknown as QueryState<S>);
      };

      // Fire immediately with the initial selected state.
      const init = toState(entry);

      listener({ ...init, data: select(init.data) } as unknown as QueryState<S>);
    } else {
      internalListener = listener as unknown as (state: QueryState<T>) => void;
      listener(toState(entry) as unknown as QueryState<S>);
    }

    entry.observers.add(internalListener as unknown as (state: QueryState<unknown>) => void);

    return () => {
      entry.observers.delete(internalListener as unknown as (state: QueryState<unknown>) => void);

      if (entry.observers.size === 0 && entry.status === 'idle') {
        cache.delete(key);
      } else if (entry.observers.size === 0) {
        scheduleGc(entry);
      }
    };
  }

  function cancel(key: QueryKey) {
    const entry = cache.get(key);

    if (!entry) return;

    entry.inflight?.controller.abort();
    entry.inflight = null;

    if (entry.status === 'pending') {
      entry.status = entry.data !== undefined ? 'success' : 'idle';

      if (entry.status === 'success') {
        scheduleGc(entry);
      }

      notify(entry);

      if (entry.status === 'idle' && entry.observers.size === 0) cache.delete(key);
    }
  }

  async function prefetchQuery<T>(options: PrefetchOptions<T>): Promise<void> {
    const { throwOnError = false, ...queryOptions } = options;

    try {
      await fetchQuery(queryOptions);
    } catch (error) {
      if (throwOnError) throw error;
    }
  }

  function refetchStaleEntries() {
    for (const [, entry] of cache.entries()) {
      if (
        entry.observers.size > 0 &&
        entry.fn !== undefined &&
        entry.status === 'success' &&
        Date.now() - entry.updatedAt >= entry.staleTime
      ) {
        fetchQuery({ fn: entry.fn as (ctx: QueryFnContext) => Promise<unknown>, key: entry.key, staleTime: 0 }).catch(
          () => {},
        );
      }
    }
  }

  // refetchOnFocus / refetchOnReconnect event wiring.
  let focusHandler: (() => void) | null = null;
  let reconnectHandler: (() => void) | null = null;

  if (opts?.refetchOnFocus && typeof document !== 'undefined') {
    focusHandler = () => {
      if (document.visibilityState === 'visible') refetchStaleEntries();
    };
    document.addEventListener('visibilitychange', focusHandler);
  }

  if (opts?.refetchOnReconnect && typeof window !== 'undefined') {
    reconnectHandler = refetchStaleEntries;
    window.addEventListener('online', reconnectHandler);
  }

  return {
    cancel,
    clear: clearCache,
    dispose(): void {
      disposed = true;

      if (focusHandler) document.removeEventListener('visibilitychange', focusHandler);

      if (reconnectHandler) window.removeEventListener('online', reconnectHandler);

      for (const [, entry] of cache.entries()) {
        cleanupEntry(entry);
      }
      cache.clear();
    },
    get disposed() {
      return disposed;
    },
    get,
    getState,
    invalidate,
    prefetch: prefetchQuery,
    query: fetchQuery,
    set,
    subscribe,
    [Symbol.dispose]() {
      this.dispose();
    },
  };
}

export type QueryClient = ReturnType<typeof createQuery>;
