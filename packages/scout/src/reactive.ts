import { ScoutConfigurationError, ScoutDisposedError } from './errors';
import { createIndex, type ScoutIndex } from './scout-index';
import type {
  CreateSearchOptions,
  ScoutEvent,
  ScoutIndexOptions,
  SearchResult,
  SearchSnapshot,
  SearchState,
  SearchSubscribeOptions,
} from './types';

export type ReactiveSearch<T> = SearchState<T> & { readonly index: ScoutIndex<T> };

const DEFAULT_DEBOUNCE = 200;

function notify(listeners: Set<() => void>): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (error) {
      queueMicrotask(() => {
        throw error;
      });
    }
  }
}

function emit<T>(tappers: Set<(event: ScoutEvent<T>) => void>, event: ScoutEvent<T>): void {
  if (tappers.size === 0) return;

  for (const tapper of [...tappers]) {
    try {
      tapper(event);
    } catch {}
  }
}

function subscribe<T>(
  listeners: Set<T>,
  listener: T,
  options: SearchSubscribeOptions | undefined,
  disposed: boolean,
  lifetimeSignal: AbortSignal,
): () => void {
  if (disposed || options?.signal?.aborted) return () => {};

  listeners.add(listener);
  const unsubscribe = (): void => {
    listeners.delete(listener);
    options?.signal?.removeEventListener('abort', unsubscribe);
  };
  options?.signal?.addEventListener('abort', unsubscribe, { once: true, signal: lifetimeSignal });
  return unsubscribe;
}

export function createSearch<T>(index: ScoutIndex<T>, options: CreateSearchOptions = {}): SearchState<T> {
  const { debounce: debounceMs = DEFAULT_DEBOUNCE, limit, minQueryLength, threshold } = options;

  if (!Number.isSafeInteger(debounceMs) || debounceMs < 0) {
    throw new ScoutConfigurationError('debounce must be a finite non-negative integer.');
  }

  const search = (query: string) => index.search(query, { limit, minQueryLength, threshold });
  const createSnapshot = (
    query: string,
    isSearching: boolean,
    results: ReadonlyArray<SearchResult<T>>,
  ): SearchSnapshot<T> => Object.freeze({ isSearching, query, results: Object.freeze(results) });
  const listeners = new Set<() => void>();
  const tappers = new Set<(event: ScoutEvent<T>) => void>();
  const controller = new AbortController();
  let snapshot = createSnapshot('', false, search(''));
  let committedQuery = '';
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const publish = (next: SearchSnapshot<T>): void => {
    snapshot = next;
    notify(listeners);
    emit(tappers, { snapshot: next, type: 'state-change' });
  };
  const commit = (query: string): void => {
    committedQuery = query;
    publish(createSnapshot(query, false, search(query)));
  };
  const unsubscribeIndex = index.onMutate(() => {
    publish(createSnapshot(snapshot.query, snapshot.isSearching, search(committedQuery)));
  });
  const assertActive = (method: string): void => {
    if (disposed) throw new ScoutDisposedError(`SearchState.${method}() called after dispose()`);
  };
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    unsubscribeIndex();
    emit(tappers, { type: 'dispose' });
    listeners.clear();
    tappers.clear();
    controller.abort();
  };

  return {
    clear() {
      assertActive('clear');
      if (snapshot.query === '' && !snapshot.isSearching) return;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      commit('');
    },
    get disposalSignal() {
      return controller.signal;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    getSnapshot() {
      return snapshot;
    },
    setQuery(query) {
      assertActive('setQuery');
      if (query === snapshot.query) return;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;

      if (query === committedQuery) {
        publish(createSnapshot(query, false, snapshot.results));
        return;
      }

      if (debounceMs === 0) {
        commit(query);
        return;
      }

      publish(createSnapshot(query, true, snapshot.results));
      timer = setTimeout(() => {
        timer = undefined;
        commit(query);
      }, debounceMs);
    },
    subscribe(listener, subscribeOptions) {
      return subscribe(listeners, listener, subscribeOptions, disposed, controller.signal);
    },
    tap(handler, tapOptions) {
      return subscribe(tappers, handler, tapOptions, disposed, controller.signal);
    },
    [Symbol.dispose]: dispose,
  };
}

export function createReactiveSearch<T>(
  items: T[],
  options: ScoutIndexOptions<T> & Pick<CreateSearchOptions, 'debounce'>,
): ReactiveSearch<T> {
  const index = createIndex(items, options);
  const state = createSearch(index, options);

  return {
    clear: state.clear,
    get disposalSignal() {
      return state.disposalSignal;
    },
    dispose: state.dispose,
    get disposed() {
      return state.disposed;
    },
    getSnapshot: state.getSnapshot,
    index,
    setQuery: state.setQuery,
    subscribe: state.subscribe,
    tap: state.tap,
    [Symbol.dispose]: state[Symbol.dispose],
  };
}
