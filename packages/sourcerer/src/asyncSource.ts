import { abortable } from '@vielzeug/arsenal';

import { SourcererDisposedError } from './errors';
import { createRequestController, toError } from './requestController';
import { createSourceStore } from './sourceStore';

type FetchOptions<TState, TResult> = {
  load(signal: AbortSignal): Promise<TResult>;
  success(result: TResult): TState;
  /** Runs right before the successful state commits; only for the current request. */
  commit?(): void;
  pending(previous: TState): TState;
  failure(previous: TState, error: Error): TState;
};

type AsyncSource<TState> = Readonly<{
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  fetch<TResult>(options: FetchOptions<TState, TResult>): Promise<void>;
  readonly state: TState;
  subscribe(listener: (state: TState) => void): () => void;
}>;

/** Only the current request may commit; superseded work settles without changing source state. */
export function createAsyncSource<TState>(initial: TState): AsyncSource<TState> {
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
      if (store.disposed) throw new SourcererDisposedError();

      const request = requests.begin();
      const previous = store.value;
      store.set(options.pending(previous));

      try {
        const result = await abortable(options.load(request.signal), request.signal);
        if (!request.isCurrent() || store.disposed) return;

        const state = options.success(result);
        options.commit?.();
        store.set(state);
      } catch (reason: unknown) {
        if (!request.isCurrent() || store.disposed) return;

        const error = toError(reason);
        store.set(options.failure(previous, error));
        throw error;
      } finally {
        request.finish();
      }
    },

    get state() {
      return store.value;
    },

    subscribe: store.subscribe,
  };
}
