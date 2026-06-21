import { isAbortError, retry } from '@vielzeug/arsenal';

import type { RetryOptions } from './retry';
import type { QueryKey } from './types';

import { DEFAULT_TIMES, resolveRetryDelay } from './retry';
import { hash } from './serialize';

export const DEFAULT_GC = 5 * 60_000;

export type QueryFn<T> = (ctx: QueryFnContext) => Promise<T>;

export type QueryFnContext = {
  key: QueryKey;
  signal: AbortSignal;
};

export type FetchConfig<T = unknown> = {
  delay: RetryOptions['delay'];
  fn: QueryFn<T>;
  gcTime: number;
  shouldRetry: RetryOptions['shouldRetry'];
  staleTime: number;
  times: number;
};

export type EntryStatus = 'loading' | 'success' | 'error';

export type CacheEntry<T = unknown> = {
  data: T | undefined;
  error: Error | null;
  hash: string;
  inflight: { controller: AbortController; promise: Promise<T> } | null;
  isFetching: boolean;
  key: QueryKey;
  lastConfig: FetchConfig<T> | undefined;
  observers: Set<import('./query-observe').QueryObserver<unknown, unknown>>;
  segmentHashes: readonly string[];
  status: EntryStatus;
  updatedAt: number | undefined;
};

export type EntrySnapshot<T> = {
  data: T | undefined;
  error: Error | null;
  status: EntryStatus;
  updatedAt: number | undefined;
};

export type CacheContext = {
  delayDefault: RetryOptions['delay'];
  disposed: boolean;
  entries: Map<string, CacheEntry>;
  gcTimeDefault: number;
  gcTimers: Map<string, ReturnType<typeof setTimeout>>;
  notify: (entry: CacheEntry) => void;
  shouldRetryDefault: RetryOptions['shouldRetry'];
  staleTimeDefault: number;
  timesDefault: number;
};

export function makeLoadingState(): {
  data: undefined;
  error: null;
  isFetching: true;
  isLoading: true;
  status: 'loading';
  updatedAt: undefined;
} {
  return {
    data: undefined,
    error: null,
    isFetching: true,
    isLoading: true,
    status: 'loading',
    updatedAt: undefined,
  };
}

export function resolveValue<T>(v: T | (() => T | undefined) | undefined): T | undefined {
  return typeof v === 'function' ? (v as () => T | undefined)() : v;
}

export function hashKey(key: QueryKey): string {
  return hash(key);
}

export function hashAtom(atom: QueryKey[number]): string {
  return hash(atom);
}

export function ensureEntry<T>(ctx: CacheContext, key: QueryKey): CacheEntry<T> {
  const entryHash = hash(key);
  let entry = ctx.entries.get(entryHash) as CacheEntry<T> | undefined;

  if (!entry) {
    entry = {
      data: undefined,
      error: null,
      hash: entryHash,
      inflight: null,
      isFetching: false,
      key,
      lastConfig: undefined,
      observers: new Set(),
      segmentHashes: key.map((k) => hash(k)),
      status: 'loading',
      updatedAt: undefined,
    };
    ctx.entries.set(entryHash, entry as CacheEntry<unknown>);
  }

  return entry;
}

export function cancelGc(ctx: CacheContext, entryHash: string): void {
  const timer = ctx.gcTimers.get(entryHash);

  if (!timer) return;

  clearTimeout(timer);
  ctx.gcTimers.delete(entryHash);
}

export function scheduleGc<T>(ctx: CacheContext, entry: CacheEntry<T>, gcTime: number): void {
  if (ctx.disposed) return;

  cancelGc(ctx, entry.hash);

  if (entry.observers.size > 0) return;

  if (gcTime === 0) {
    ctx.entries.delete(entry.hash);

    return;
  }

  const timer = setTimeout(() => {
    const current = ctx.entries.get(entry.hash);

    if (!current || current.observers.size > 0 || current.isFetching) return;

    ctx.entries.delete(entry.hash);
    ctx.gcTimers.delete(entry.hash);
  }, gcTime);

  ctx.gcTimers.set(entry.hash, timer);
}

export function deleteEntry<T>(ctx: CacheContext, entry: CacheEntry<T>): void {
  entry.inflight?.controller.abort();
  cancelGc(ctx, entry.hash);
  ctx.entries.delete(entry.hash);
}

export function isKeyOrPrefix(entry: CacheEntry, prefixHash: readonly string[]): boolean {
  if (prefixHash.length > entry.segmentHashes.length) return false;

  return prefixHash.every((seg, i) => seg === entry.segmentHashes[i]);
}

export function markFetching<T>(ctx: CacheContext, entry: CacheEntry<T>): void {
  entry.isFetching = true;
  entry.status = 'loading';
  entry.error = null;
  ctx.notify(entry);
}

export function commitSuccess<T>(ctx: CacheContext, entry: CacheEntry<T>, data: T, gcTime: number): void {
  entry.data = data;
  entry.error = null;
  entry.status = 'success';
  entry.updatedAt = Date.now();
  entry.isFetching = false;
  entry.inflight = null;
  scheduleGc(ctx, entry, gcTime);
  ctx.notify(entry);
}

export function commitError<T>(ctx: CacheContext, entry: CacheEntry<T>, error: Error, gcTime: number): void {
  entry.error = error;
  entry.status = 'error';
  entry.updatedAt = Date.now();
  entry.isFetching = false;
  entry.inflight = null;
  scheduleGc(ctx, entry, gcTime);
  ctx.notify(entry);
}

export function rollback<T>(ctx: CacheContext, entry: CacheEntry<T>, previous: EntrySnapshot<T>, gcTime: number): void {
  entry.data = previous.data;
  entry.error = previous.error;
  entry.status = previous.status;
  entry.updatedAt = previous.updatedAt;
  entry.isFetching = false;
  entry.inflight = null;

  if (entry.observers.size === 0 && entry.status === 'loading' && entry.data === undefined) {
    deleteEntry(ctx, entry);

    return;
  }

  scheduleGc(ctx, entry, gcTime);
  ctx.notify(entry);
}

export function evictEntry<T>(ctx: CacheContext, entry: CacheEntry<T>): void {
  entry.inflight?.controller.abort();

  if (entry.observers.size > 0) {
    entry.inflight = null;
    entry.isFetching = false;
    entry.status = 'loading';
    entry.data = undefined;
    entry.error = null;
    entry.updatedAt = undefined;
    ctx.notify(entry);

    return;
  }

  deleteEntry(ctx, entry);
}

export function startFetch<T>(ctx: CacheContext, entry: CacheEntry<T>, config: FetchConfig<T>): Promise<T> {
  if (entry.inflight) return entry.inflight.promise;

  const { delay, fn, gcTime, shouldRetry, times } = config;
  const controller = new AbortController();
  const prev: EntrySnapshot<T> = {
    data: entry.data,
    error: entry.error,
    status: entry.status,
    updatedAt: entry.updatedAt,
  };

  const promise = (async () => {
    try {
      const data = await retry(() => fn({ key: entry.key, signal: controller.signal }), {
        delay: (attempt) => resolveRetryDelay(attempt, delay),
        shouldRetry,
        signal: controller.signal,
        times,
      });

      commitSuccess(ctx, entry, data, gcTime);

      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const isAborted = controller.signal.aborted || isAbortError(error);

      if (isAborted) {
        rollback(ctx, entry, prev, gcTime);
      } else {
        commitError(ctx, entry, error, gcTime);
      }

      throw error;
    }
  })();

  entry.inflight = { controller, promise };
  markFetching(ctx, entry);

  return promise;
}

export function makeFetchConfig<T>(
  ctx: CacheContext,
  options: {
    delay?: RetryOptions['delay'];
    fn: QueryFn<T>;
    gcTime?: number;
    shouldRetry?: RetryOptions['shouldRetry'];
    staleTime?: number;
    times?: number;
  },
): FetchConfig<T> {
  return {
    delay: options.delay ?? ctx.delayDefault,
    fn: options.fn,
    gcTime: options.gcTime ?? ctx.gcTimeDefault,
    shouldRetry: options.shouldRetry ?? ctx.shouldRetryDefault,
    staleTime: options.staleTime ?? ctx.staleTimeDefault,
    times: options.times ?? ctx.timesDefault,
  };
}

export function buildCacheContext(
  opts: {
    delay?: RetryOptions['delay'];
    gcTime?: number;
    shouldRetry?: RetryOptions['shouldRetry'];
    staleTime?: number;
    times?: number;
  },
  entries: Map<string, CacheEntry>,
  gcTimers: Map<string, ReturnType<typeof setTimeout>>,
  notify: (entry: CacheEntry) => void,
): CacheContext {
  return {
    delayDefault: opts.delay,
    disposed: false,
    entries,
    gcTimeDefault: opts.gcTime ?? DEFAULT_GC,
    gcTimers,
    notify,
    shouldRetryDefault: opts.shouldRetry,
    staleTimeDefault: opts.staleTime ?? 0,
    timesDefault: opts.times ?? DEFAULT_TIMES,
  };
}
