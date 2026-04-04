import { stash, retry } from '@vielzeug/toolkit';

import type { RetryOptions } from './retry';
import type { QueryKey, QueryState, QueryStatus, Unsubscribe } from './types';

import { toError } from './errors';
import { DEFAULT_RETRY, getRetryConfig } from './retry';
import { stableStringify } from './serialize';
import { dispatch, makeState } from './state';

const DEFAULT_GC = 5 * 60_000;

export type QueryFnContext = {
  signal: AbortSignal;
};

type QueryExecutor<T> = (ctx: QueryFnContext) => Promise<T>;

export type QueryOptions<T> = {
  enabled?: boolean;
  fn: QueryExecutor<T>;
  gcTime?: number;
  key: QueryKey;
  onError?: (error: Error) => void;
  onSettled?: (data: T | undefined, error: Error | null) => void;
  onSuccess?: (data: T) => void;
  staleTime?: number;
} & RetryOptions;

export type QueryClientOptions = {
  gcTime?: number;
  staleTime?: number;
} & RetryOptions;

type CacheEntry<T = unknown> = {
  data: T | undefined;
  error: Error | null;
  gcTime: number;
  inflight: { controller: AbortController; promise: Promise<T> } | null;
  key: QueryKey;
  observers: Set<(state: QueryState<T>) => void>;
  status: QueryStatus;
  updatedAt: number;
};

export const STALE_TIMES = {
  always: 0,
  long: 5 * 60_000,
  never: Infinity,
  short: 30_000,
} as const;

export function createQuery(opts?: QueryClientOptions) {
  const staleTimeDefault = opts?.staleTime ?? Infinity;
  const gcTimeDefault = opts?.gcTime ?? DEFAULT_GC;
  const retryDefault = opts?.retry ?? DEFAULT_RETRY;
  const retryDelayDefault = opts?.retryDelay;
  const shouldRetryDefault = opts?.shouldRetry;
  let _disposed = false;

  const cache = stash<CacheEntry, QueryKey>({ hash: stableStringify });

  function makeEntry<T>(key: QueryKey, gcTime: number): CacheEntry<T> {
    return {
      data: undefined,
      error: null,
      gcTime,
      inflight: null,
      key,
      observers: new Set(),
      status: 'idle',
      updatedAt: 0,
    };
  }

  function ensureEntry<T>(key: QueryKey, gcTime = gcTimeDefault): CacheEntry<T> {
    let e = cache.get(key) as CacheEntry<T> | undefined;

    if (!e) {
      e = makeEntry<T>(key, gcTime);
      cache.set(key, e as CacheEntry<unknown>);
    }

    return e;
  }

  function notify<T>(entry: CacheEntry<T>) {
    dispatch(entry.observers, makeState(entry));
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

  function isKeyOrPrefix(entryKey: QueryKey, prefix: QueryKey): boolean {
    if (prefix.length > entryKey.length) return false;

    return prefix.every((seg, i) => stableStringify(seg) === stableStringify(entryKey[i]));
  }

  async function fetchQuery<T>(options: QueryOptions<T> & { enabled: false }): Promise<T | undefined>;
  async function fetchQuery<T>(options: QueryOptions<T>): Promise<T>;
  async function fetchQuery<T>(options: QueryOptions<T>): Promise<T | undefined> {
    if (_disposed) throw new Error('[fetchit] QueryClient has been disposed');

    const {
      enabled = true,
      fn: queryFn,
      gcTime = gcTimeDefault,
      key: queryKey,
      onError,
      onSettled,
      onSuccess,
      retry: retryCount = retryDefault,
      retryDelay = retryDelayDefault,
      shouldRetry = shouldRetryDefault,
      staleTime = staleTimeDefault,
    } = options;

    if (!enabled) return cache.get(queryKey)?.data as T | undefined;

    const entry = ensureEntry<T>(queryKey, gcTime);

    entry.gcTime = gcTime;

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
        const data = await retry(() => queryFn({ signal: controller.signal }), {
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
        // Callbacks belong to the call that initiated the fetch.
        // Concurrent callers sharing this inflight promise get the result but not callbacks.
        // For reactive state tracking across re-renders, use subscribe() instead.
        onSuccess?.(data);
        onSettled?.(data, null);

        return data;
      } catch (err) {
        const error = toError(err);
        const isAborted = controller.signal.aborted || error.name === 'AbortError';

        // cancel() already nulled entry.inflight and set the terminal state — don't override it
        if (isAborted && entry.inflight === null) throw error;

        if (isAborted) {
          entry.status = 'idle';
          entry.error = null;

          if (entry.observers.size === 0) {
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

        if (!isAborted) {
          onError?.(error);
          onSettled?.(undefined, error);
        }

        throw error;
      }
    })();

    entry.inflight = { controller, promise: p };

    return p;
  }

  async function prefetch<T>(options: Omit<QueryOptions<T>, 'enabled'>): Promise<T | undefined> {
    return fetchQuery<T>({ ...options, enabled: true }).catch(() => undefined);
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
    for (const [, entry] of cache.entries()) {
      if (isKeyOrPrefix(entry.key, key)) evictEntry(entry);
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

    return entry ? makeState(entry) : null;
  }

  function subscribe<T = unknown>(key: QueryKey, listener: (state: QueryState<T>) => void): Unsubscribe {
    const entry = ensureEntry<T>(key);

    cache.cancelGc(key);
    entry.observers.add(listener);
    listener(makeState(entry));

    return () => {
      entry.observers.delete(listener);

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

  return {
    cancel,
    clear: clearCache,
    dispose(): void {
      _disposed = true;
      for (const [, entry] of cache.entries()) {
        cleanupEntry(entry);
      }
      cache.clear();
    },
    get disposed() {
      return _disposed;
    },
    get,
    getState,
    invalidate,
    prefetch,
    query: fetchQuery,
    set,
    subscribe,
    [Symbol.dispose]() {
      this.dispose();
    },
  };
}

export type QueryClient = ReturnType<typeof createQuery>;
