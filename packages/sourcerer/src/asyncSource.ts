import { abortError } from '@vielzeug/arsenal';

import { SourcererDisposedError } from './errors';
import { createRequestController, toError } from './requestController';
import { createSourceStore } from './sourceStore';

const loadWithSignal = <T>(load: (signal: AbortSignal) => Promise<T>, signal: AbortSignal): Promise<T> =>
  new Promise((resolve, reject) => {
    const abort = (): void => reject(abortError(signal, 'The operation was aborted.'));
    if (signal.aborted) {
      abort();
      return;
    }

    signal.addEventListener('abort', abort, { once: true });
    let result: Promise<T>;
    try {
      result = load(signal);
    } catch (error) {
      signal.removeEventListener('abort', abort);
      reject(error);
      return;
    }

    result.then(
      (value) => {
        signal.removeEventListener('abort', abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', abort);
        reject(error);
      },
    );
  });

type FetchOptions<TState, TResult> = {
  load(signal: AbortSignal): Promise<TResult>;
  success(result: TResult): TState;
  commit?(state: TState, result: TResult): void;
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
        const result = await loadWithSignal(options.load, request.signal);
        if (!request.isCurrent() || store.disposed) return;

        const state = options.success(result);
        options.commit?.(state, result);
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
