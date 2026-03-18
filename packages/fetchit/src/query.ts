import { retry } from '@vielzeug/toolkit';

import type { RetryOptions } from './retry';
import type { QueryKey, QueryState, QueryStatus, Unsubscribe } from './types';

import { toError } from './errors';
import { DEFAULT_RETRY, getRetryConfig } from './retry';
import { stableStringify } from './serialize';
import { dispatch, makeState } from './types';

const DEFAULT_GC = 5 * 60_000;

export type QueryFnContext = {
  /** The cache key for the query that triggered this fetch. */
  key: QueryKey;
  signal: AbortSignal;
};

export type QueryOptions<T> = {
  enabled?: boolean;
  fn: (ctx: QueryFnContext) => Promise<T>;
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
  gcTimer: ReturnType<typeof setTimeout> | undefined;
  inflight: { controller: AbortController; promise: Promise<T> } | null;
  key: QueryKey;
  observers: Set<(state: QueryState<T>) => void>;
  status: QueryStatus;
  updatedAt: number;
};

export function createQuery(opts?: QueryClientOptions) {
  const staleTimeDefault = opts?.staleTime ?? 0;
  const gcTimeDefault = opts?.gcTime ?? DEFAULT_GC;
  const retryDefault = opts?.retry ?? DEFAULT_RETRY;
  const retryDelayDefault = opts?.retryDelay;
  const shouldRetryDefault = opts?.shouldRetry;
  let _disposed = false;

  const cache = new Map<string, CacheEntry>();

  function makeEntry<T>(key: QueryKey, gcTime: number): CacheEntry<T> {
    return {
      data: undefined,
      error: null,
      gcTime,
      gcTimer: undefined,
      inflight: null,
      key,
      observers: new Set(),
      status: 'idle',
      updatedAt: 0,
    };
  }

  function ensureEntry<T>(key: QueryKey, gcTime = gcTimeDefault): CacheEntry<T> {
    const id = stableStringify(key);
    let e = cache.get(id) as CacheEntry<T> | undefined;

    if (!e) {
      e = makeEntry<T>(key, gcTime);
      cache.set(id, e as CacheEntry<unknown>);
    }

    return e;
  }

  function notify<T>(entry: CacheEntry<T>) {
    dispatch(entry.observers, makeState(entry));
  }

  function cancelGcTimer(entry: Pick<CacheEntry, 'gcTimer'>) {
    if (entry.gcTimer) {
      clearTimeout(entry.gcTimer);
      entry.gcTimer = undefined;
    }
  }

  function scheduleGc<T>(id: string, entry: CacheEntry<T>, gcTime: number) {
    cancelGcTimer(entry);

    if (gcTime === 0) {
      cache.delete(id);
    } else if (gcTime > 0 && gcTime !== Number.POSITIVE_INFINITY) {
      entry.gcTimer = setTimeout(() => {
        entry.gcTimer = undefined;
        cache.delete(id);
      }, gcTime);
    }
  }

  function cleanupEntry(entry: CacheEntry) {
    entry.inflight?.controller.abort();
    cancelGcTimer(entry);
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

    if (!enabled) return cache.get(stableStringify(queryKey))?.data as T | undefined;

    const id = stableStringify(queryKey);
    const entry = ensureEntry<T>(queryKey, gcTime);

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
        scheduleGc(id, entry, gcTime);
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
        } else {
          entry.status = 'error';
          entry.error = error;
          entry.updatedAt = Date.now();
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

  function evictEntry(id: string, entry: CacheEntry) {
    cleanupEntry(entry);

    if (entry.observers.size > 0) {
      entry.status = 'idle';
      entry.data = undefined;
      entry.error = null;
      notify(entry);
    } else {
      cache.delete(id);
    }
  }

  function invalidate(key: QueryKey) {
    for (const [id, entry] of cache) {
      if (isKeyOrPrefix(entry.key, key)) evictEntry(id, entry);
    }
  }

  function clearCache() {
    for (const [id, entry] of cache) {
      evictEntry(id, entry);
    }
    // evictEntry intentionally keeps entries with active observers in the cache
    // (reset to idle). Do not call cache.clear() here — it would orphan live subscriptions.
  }

  function set<T>(key: QueryKey, data: T, opts?: { gcTime?: number }): void;
  function set<T>(key: QueryKey, updater: (old: T | undefined) => T, opts?: { gcTime?: number }): void;
  function set<T>(key: QueryKey, dataOrUpdater: T | ((old: T | undefined) => T), opts?: { gcTime?: number }) {
    const id = stableStringify(key);
    const entry = ensureEntry<T>(key);

    entry.data =
      typeof dataOrUpdater === 'function' ? (dataOrUpdater as (old: T | undefined) => T)(entry.data) : dataOrUpdater;
    entry.updatedAt = Date.now();
    entry.status = 'success';
    scheduleGc(id, entry, opts?.gcTime ?? entry.gcTime);
    notify(entry);
  }

  function get<T>(key: QueryKey): T | undefined {
    return cache.get(stableStringify(key))?.data as T | undefined;
  }

  function getState<T>(key: QueryKey): QueryState<T> | null {
    const entry = cache.get(stableStringify(key)) as CacheEntry<T> | undefined;

    return entry ? makeState(entry) : null;
  }

  function subscribe<T = unknown>(key: QueryKey, listener: (state: QueryState<T>) => void): Unsubscribe {
    const id = stableStringify(key);
    const entry = ensureEntry<T>(key);

    cancelGcTimer(entry);
    entry.observers.add(listener);
    listener(makeState(entry));

    return () => {
      entry.observers.delete(listener);

      if (entry.observers.size === 0 && entry.status === 'idle') {
        cache.delete(id);
      }
    };
  }

  function cancel(key: QueryKey) {
    const id = stableStringify(key);
    const entry = cache.get(id);

    if (!entry) return;

    entry.inflight?.controller.abort();
    entry.inflight = null;

    if (entry.status === 'pending') {
      entry.status = entry.data !== undefined ? 'success' : 'idle';

      if (entry.status === 'success') scheduleGc(id, entry, entry.gcTime);

      notify(entry);

      if (entry.status === 'idle' && entry.observers.size === 0) cache.delete(id);
    }
  }

  return {
    cancel,
    clear: clearCache,
    dispose(): void {
      _disposed = true;
      cache.forEach(cleanupEntry);
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
