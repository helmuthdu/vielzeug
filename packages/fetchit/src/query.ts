import type { RetryOptions } from './retry';
import type { QueryKey, QueryState, Unsubscribe } from './types';

import { DEFAULT_ATTEMPTS, runWithRetry } from './retry';
import { stableStringify } from './serialize';

const DEFAULT_GC = 5 * 60_000;

type EntryStatus = 'idle' | 'success' | 'error';

export type QueryFnContext = {
  key: QueryKey;
  signal: AbortSignal;
};

export type QueryOptions<T> = {
  /** When `false` the fetch is skipped and the entry stays in its current state. Defaults to `true`. */
  enabled?: boolean;
  fn: (ctx: QueryFnContext) => Promise<T>;
  gcTime?: number;
  /** Pre-seed the cache as a successful entry when no data exists. Subject to normal staleTime checks. */
  initialData?: T | (() => T | undefined);
  key: QueryKey;
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

type QueryObserver<T, S> = {
  listener: (state: QueryState<S>) => void;
  placeholderData?: S | (() => S | undefined);
  previous?: QueryState<S>;
  select?: (data: T | undefined) => S | undefined;
};

type CacheEntry<T = unknown> = {
  data: T | undefined;
  error: Error | null;
  fn: ((ctx: QueryFnContext) => Promise<T>) | undefined;
  gcTime: number;
  hash: string;
  inflight: { controller: AbortController; promise: Promise<T> } | null;
  isFetching: boolean;
  key: QueryKey;
  observers: Set<QueryObserver<T, unknown>>;
  staleTime: number;
  status: EntryStatus;
  updatedAt: number | undefined;
};

function resolveValue<T>(v: T | (() => T | undefined) | undefined): T | undefined {
  return typeof v === 'function' ? (v as () => T | undefined)() : v;
}

export function createQuery(opts?: QueryClientOptions) {
  const staleTimeDefault = opts?.staleTime ?? 0;
  const gcTimeDefault = opts?.gcTime ?? DEFAULT_GC;
  const attemptsDefault = opts?.attempts ?? DEFAULT_ATTEMPTS;
  const retryDelayDefault = opts?.retryDelay;
  const shouldRetryDefault = opts?.shouldRetry;

  let disposed = false;

  const entries = new Map<string, CacheEntry>();
  const gcTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function toBaseState<T>(entry: CacheEntry<T>): QueryState<T> {
    if (entry.status === 'success') {
      return {
        data: entry.data as T,
        error: null,
        isFetching: entry.isFetching,
        status: 'success',
        updatedAt: entry.updatedAt as number,
      };
    }

    if (entry.status === 'error') {
      return {
        data: entry.data,
        error: entry.error as Error,
        isFetching: entry.isFetching,
        status: 'error',
        updatedAt: entry.updatedAt as number,
      };
    }

    if (entry.isFetching) {
      return {
        data: undefined,
        error: null,
        isFetching: true,
        status: 'pending',
        updatedAt: undefined,
      };
    }

    return {
      data: undefined,
      error: null,
      isFetching: false,
      status: 'idle',
      updatedAt: undefined,
    };
  }

  function toObserverState<T, S>(entry: CacheEntry<T>, observer: QueryObserver<T, S>): QueryState<S> {
    const base = toBaseState(entry);
    const selected = observer.select ? observer.select(base.data as T | undefined) : (base.data as S | undefined);
    const data =
      selected !== undefined || base.status !== 'pending'
        ? selected
        : resolveValue(observer.placeholderData as S | (() => S | undefined) | undefined);

    return { ...base, data } as QueryState<S>;
  }

  function notify<T>(entry: CacheEntry<T>) {
    for (const observer of entry.observers) {
      const typed = observer as QueryObserver<T, unknown>;
      const next = toObserverState(entry, typed);
      const prev = typed.previous;

      if (
        prev &&
        prev.status === next.status &&
        prev.isFetching === next.isFetching &&
        prev.updatedAt === next.updatedAt &&
        Object.is(prev.error, next.error) &&
        Object.is(prev.data, next.data)
      ) {
        continue;
      }

      typed.previous = next;
      typed.listener(next);
    }
  }

  function getHash(key: QueryKey): string {
    return stableStringify(key);
  }

  function cancelGc(hash: string) {
    const timer = gcTimers.get(hash);

    if (!timer) return;

    clearTimeout(timer);
    gcTimers.delete(hash);
  }

  function scheduleGc<T>(entry: CacheEntry<T>) {
    cancelGc(entry.hash);

    if (entry.observers.size > 0) {
      return;
    }

    if (entry.gcTime === 0) {
      entries.delete(entry.hash);

      return;
    }

    const timer = setTimeout(() => {
      const current = entries.get(entry.hash);

      if (!current || current.observers.size > 0 || current.isFetching) {
        return;
      }

      entries.delete(entry.hash);
      gcTimers.delete(entry.hash);
    }, entry.gcTime);

    gcTimers.set(entry.hash, timer);
  }

  function ensureEntry<T>(key: QueryKey, gcTime = gcTimeDefault): CacheEntry<T> {
    const hash = getHash(key);
    let entry = entries.get(hash) as CacheEntry<T> | undefined;

    if (!entry) {
      entry = {
        data: undefined,
        error: null,
        fn: undefined,
        gcTime,
        hash,
        inflight: null,
        isFetching: false,
        key,
        observers: new Set(),
        staleTime: staleTimeDefault,
        status: 'idle',
        updatedAt: undefined,
      };
      entries.set(hash, entry as CacheEntry<unknown>);
    }

    return entry;
  }

  function deleteEntry<T>(entry: CacheEntry<T>) {
    entry.inflight?.controller.abort();
    cancelGc(entry.hash);
    entries.delete(entry.hash);
  }

  function isKeyOrPrefix(entryKey: QueryKey, prefixHash: readonly string[]): boolean {
    if (prefixHash.length > entryKey.length) return false;

    return prefixHash.every((seg, i) => seg === stableStringify(entryKey[i]));
  }

  async function fetchQuery<T>(options: QueryOptions<T>): Promise<T> {
    if (disposed) throw new Error('[fetchit] QueryClient has been disposed');

    const {
      attempts = attemptsDefault,
      enabled = true,
      fn: queryFn,
      gcTime = gcTimeDefault,
      initialData,
      key: queryKey,
      retryDelay = retryDelayDefault,
      shouldRetry = shouldRetryDefault,
      staleTime = staleTimeDefault,
    } = options;

    const entry = ensureEntry<T>(queryKey, gcTime);

    entry.gcTime = gcTime;
    entry.fn = queryFn;
    entry.staleTime = staleTime;

    if (initialData !== undefined && entry.data === undefined) {
      const initVal = resolveValue(initialData);

      if (initVal !== undefined) {
        entry.data = initVal;
        entry.error = null;
        entry.status = 'success';
        entry.updatedAt = Date.now();
      }
    }

    if (!enabled) {
      return entry.data as T;
    }

    if (
      entry.status === 'success' &&
      entry.updatedAt !== undefined &&
      Date.now() - entry.updatedAt < staleTime &&
      !entry.isFetching
    ) {
      return entry.data as T;
    }

    if (entry.inflight) return entry.inflight.promise;

    const controller = new AbortController();
    const prev = {
      data: entry.data,
      error: entry.error,
      status: entry.status,
      updatedAt: entry.updatedAt,
    };

    entry.isFetching = true;
    notify(entry);

    const promise = (async () => {
      try {
        const data = await runWithRetry(
          () => queryFn({ key: queryKey, signal: controller.signal }),
          attempts,
          retryDelay,
          shouldRetry,
          controller.signal,
        );

        entry.data = data;
        entry.error = null;
        entry.status = 'success';
        entry.updatedAt = Date.now();
        entry.isFetching = false;
        entry.inflight = null;
        scheduleGc(entry);
        notify(entry);

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const isAborted = controller.signal.aborted || error.name === 'AbortError';

        if (isAborted) {
          entry.data = prev.data;
          entry.error = prev.error;
          entry.status = prev.status;
          entry.updatedAt = prev.updatedAt;
        } else {
          entry.error = error;
          entry.status = 'error';
          entry.updatedAt = Date.now();
        }

        entry.isFetching = false;
        entry.inflight = null;

        if (entry.observers.size === 0 && entry.status === 'idle' && entry.data === undefined) {
          deleteEntry(entry);
        } else {
          scheduleGc(entry);
          notify(entry);
        }

        throw error;
      }
    })();

    entry.inflight = { controller, promise };

    return promise;
  }

  function evictEntry<T>(entry: CacheEntry<T>) {
    entry.inflight?.controller.abort();

    if (entry.observers.size > 0) {
      entry.inflight = null;
      entry.isFetching = false;
      entry.status = 'idle';
      entry.data = undefined;
      entry.error = null;
      entry.updatedAt = undefined;
      notify(entry);

      return;
    }

    deleteEntry(entry);
  }

  function invalidate(key: QueryKey) {
    const prefixHash = key.map(stableStringify);

    for (const [, entry] of entries) {
      if (isKeyOrPrefix(entry.key, prefixHash)) {
        evictEntry(entry);
      }
    }
  }

  function clearCache() {
    for (const [, entry] of entries) {
      evictEntry(entry);
    }
  }

  function set<T>(key: QueryKey, data: T, opts?: { gcTime?: number }): void;
  function set<T>(key: QueryKey, updater: (old: T | undefined) => T, opts?: { gcTime?: number }): void;
  function set<T>(key: QueryKey, dataOrUpdater: T | ((old: T | undefined) => T), opts?: { gcTime?: number }) {
    const entry = ensureEntry<T>(key);
    const gcTime = opts?.gcTime ?? entry.gcTime;

    entry.data =
      typeof dataOrUpdater === 'function' ? (dataOrUpdater as (old: T | undefined) => T)(entry.data) : dataOrUpdater;
    entry.error = null;
    entry.status = 'success';
    entry.updatedAt = Date.now();
    entry.gcTime = gcTime;
    scheduleGc(entry);
    notify(entry);
  }

  function get<T>(key: QueryKey): T | undefined {
    return (entries.get(getHash(key))?.data as T | undefined) ?? undefined;
  }

  function getState<T>(key: QueryKey): QueryState<T> | null {
    const entry = entries.get(getHash(key)) as CacheEntry<T> | undefined;

    if (!entry) return null;

    return toBaseState(entry);
  }

  function subscribe<T = unknown, S = T>(
    key: QueryKey,
    listener: (state: QueryState<S>) => void,
    opts?: { placeholderData?: S | (() => S | undefined); select?: (data: T | undefined) => S | undefined },
  ): Unsubscribe {
    const entry = ensureEntry<T>(key);
    const observer: QueryObserver<T, S> = {
      listener,
      placeholderData: opts?.placeholderData,
      select: opts?.select,
    };

    cancelGc(entry.hash);

    observer.previous = toObserverState(entry, observer);
    listener(observer.previous);

    entry.observers.add(observer as QueryObserver<T, unknown>);

    return () => {
      entry.observers.delete(observer as QueryObserver<T, unknown>);

      if (entry.observers.size === 0 && entry.status === 'idle' && !entry.isFetching && entry.data === undefined) {
        deleteEntry(entry);
      } else if (entry.observers.size === 0) {
        scheduleGc(entry);
      }
    };
  }

  function cancel(key: QueryKey) {
    const entry = entries.get(getHash(key));

    if (!entry?.inflight) return;

    entry.inflight.controller.abort();
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
    for (const [, entry] of entries) {
      if (
        entry.observers.size > 0 &&
        entry.fn !== undefined &&
        !entry.isFetching &&
        entry.status === 'success' &&
        entry.updatedAt !== undefined &&
        Date.now() - entry.updatedAt >= entry.staleTime
      ) {
        fetchQuery({
          fn: entry.fn as (ctx: QueryFnContext) => Promise<unknown>,
          key: entry.key,
          staleTime: 0,
        }).catch(() => {});
      }
    }
  }

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

      for (const [, entry] of entries) {
        entry.inflight?.controller.abort();
      }

      for (const [, timer] of gcTimers) {
        clearTimeout(timer);
      }

      gcTimers.clear();
      entries.clear();
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
  };
}

export type QueryClient = ReturnType<typeof createQuery>;
