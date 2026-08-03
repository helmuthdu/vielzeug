import type { Disposable } from './types';

type SourceStore<T> = Disposable & {
  set(value: T): void;
  subscribe(listener: (value: T) => void): () => void;
  readonly value: T;
};

/** Store commits source state before notifying; observer failures cannot rewrite committed state. */
export function createSourceStore<T>(initialValue: T): SourceStore<T> {
  const controller = new AbortController();
  const listeners = new Set<(value: T) => void>();
  let disposed = false;
  let value = initialValue;

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    listeners.clear();
    controller.abort();
  };

  return {
    get disposalSignal() {
      return controller.signal;
    },

    dispose,

    get disposed() {
      return disposed;
    },

    set(nextValue) {
      if (disposed) return;

      value = nextValue;

      for (const listener of listeners) {
        try {
          listener(value);
        } catch (error) {
          queueMicrotask(() => {
            throw error;
          });
        }
      }
    },

    subscribe(listener) {
      if (disposed) return () => {};

      listeners.add(listener);

      return () => listeners.delete(listener);
    },

    [Symbol.dispose]: dispose,

    get value() {
      return value;
    },
  };
}
