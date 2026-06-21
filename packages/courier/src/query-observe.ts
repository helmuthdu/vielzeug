import type { CacheContext, CacheEntry } from './query-cache';
import type { AsyncState, QueryState, SyncStore, Unsubscribe } from './types';

import { cancelGc, ensureEntry, hashKey, scheduleGc } from './query-cache';

export type QueryObserver<T, S> = {
  listener: () => void;
  placeholderData?: S | (() => S | undefined);
  previous?: QueryState<S>;
  select?: (data: T | undefined) => S | undefined;
};

const LOADING_STATE: AsyncState<unknown> = Object.freeze({
  data: undefined,
  error: null,
  isFetching: false,
  isLoading: true,
  status: 'loading',
  updatedAt: undefined,
});

function resolveValue<T>(v: T | (() => T | undefined) | undefined): T | undefined {
  return typeof v === 'function' ? (v as () => T | undefined)() : v;
}

export function toBaseState<T>(entry: CacheEntry<T>): QueryState<T> {
  if (entry.status === 'loading') {
    return {
      data: undefined,
      error: null,
      isFetching: entry.isFetching,
      isLoading: true,
      status: 'loading',
      updatedAt: undefined,
    } as QueryState<T>;
  }

  if (entry.status === 'success') {
    return {
      data: entry.data as T,
      error: null,
      isFetching: entry.isFetching,
      isLoading: false,
      status: 'success',
      updatedAt: entry.updatedAt as number,
    };
  }

  return {
    data: entry.data,
    error: entry.error as Error,
    isFetching: entry.isFetching,
    isLoading: false,
    status: 'error',
    updatedAt: entry.updatedAt as number,
  };
}

export function toObserverState<T, S>(entry: CacheEntry<T>, observer: QueryObserver<T, S>): QueryState<S> {
  const base = toBaseState(entry);

  if (base.status === 'loading') {
    const placeholder = resolveValue(observer.placeholderData as S | (() => S | undefined) | undefined);

    return { ...base, data: placeholder } as QueryState<S>;
  }

  const selected = observer.select ? observer.select(base.data as T | undefined) : (base.data as S | undefined);

  return { ...base, data: selected } as QueryState<S>;
}

export function notify<T>(entry: CacheEntry<T>): void {
  for (const observer of entry.observers) {
    const typed = observer as QueryObserver<T, unknown>;
    const next = toObserverState(entry, typed);
    const prev = typed.previous;

    const dataUnchanged = Object.is(prev?.data, next.data);
    const metaUnchanged =
      !!prev && prev.status === next.status && prev.isFetching === next.isFetching && Object.is(prev.error, next.error);

    const shouldSkip = typed.select
      ? metaUnchanged && dataUnchanged
      : metaUnchanged && prev?.updatedAt === next.updatedAt && dataUnchanged;

    if (shouldSkip) continue;

    typed.previous = next;
    typed.listener();
  }
}

export function watchInternal<T = unknown, S = T>(
  ctx: CacheContext,
  key: Parameters<typeof ensureEntry>[1],
  opts?: { placeholderData?: S | (() => S | undefined); select?: (data: T | undefined) => S | undefined },
): SyncStore<QueryState<S>> {
  const peekObserver: QueryObserver<T, S> = { listener: () => {}, ...opts };

  return {
    peek(): QueryState<S> {
      const entry = ctx.entries.get(hashKey(key)) as CacheEntry<T> | undefined;

      if (!entry) return LOADING_STATE as QueryState<S>;

      return toObserverState(entry, peekObserver);
    },

    subscribe(onStoreChange: () => void): Unsubscribe {
      const entry = ensureEntry<T>(ctx, key);

      cancelGc(ctx, entry.hash);

      const observer: QueryObserver<T, S> = {
        ...opts,
        listener: onStoreChange,
        previous: toObserverState(entry, peekObserver),
      };

      entry.observers.add(observer as QueryObserver<unknown, unknown>);

      return () => {
        entry.observers.delete(observer as QueryObserver<unknown, unknown>);

        if (entry.observers.size === 0) {
          scheduleGc(ctx, entry, entry.lastConfig?.gcTime ?? ctx.gcTimeDefault);
        }
      };
    },
  };
}
