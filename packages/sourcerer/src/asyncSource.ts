import type { AnyPagination, SourceSnapshot } from './types';

import { createRequestController, toError } from './requestController';
import { createSourceStore } from './sourceStore';

type AsyncSource<T, TQuery, TPagination extends AnyPagination> = Readonly<{
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  fetch<TResult>(options: {
    failure(previous: SourceSnapshot<T, TQuery, TPagination>, error: Error): SourceSnapshot<T, TQuery, TPagination>;
    load(signal: AbortSignal): Promise<TResult>;
    pending(previous: SourceSnapshot<T, TQuery, TPagination>): SourceSnapshot<T, TQuery, TPagination>;
    success(result: TResult): SourceSnapshot<T, TQuery, TPagination>;
  }): Promise<void>;
  readonly snapshot: SourceSnapshot<T, TQuery, TPagination>;
  subscribe(listener: (snapshot: SourceSnapshot<T, TQuery, TPagination>) => void): () => void;
}>;

/** Request failures and observer failures stay separate so observers cannot corrupt source state. */
export function createAsyncSource<T, TQuery, TPagination extends AnyPagination>(
  initial: SourceSnapshot<T, TQuery, TPagination>,
): AsyncSource<T, TQuery, TPagination> {
  const store = createSourceStore(initial);
  const requests = createRequestController();

  return {
    get disposalSignal() {
      return store.disposalSignal;
    },

    dispose() {
      requests.dispose();
      store.dispose();
    },

    get disposed() {
      return store.disposed;
    },

    async fetch(options) {
      if (store.disposed) return;

      const request = requests.begin();
      const previous = store.value;

      store.set(options.pending(previous));

      let next: SourceSnapshot<T, TQuery, TPagination>;

      try {
        next = options.success(await options.load(request.signal));
      } catch (reason: unknown) {
        if (!request.isCurrent() || store.disposed) return;

        const error = toError(reason);

        store.set(options.failure(previous, error));
        throw error;
      } finally {
        request.finish();
      }

      if (!request.isCurrent() || store.disposed) return;

      store.set(next);
    },

    get snapshot() {
      return store.value;
    },

    subscribe: store.subscribe,
  };
}
