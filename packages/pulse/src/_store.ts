import type { ExternalStore, Unsubscribe } from './types';

export type MutableStore<T> = ExternalStore<T> & {
  set(next: T): void;
};

export function createStore<T>(initial: T, onListenerError: (error: unknown) => void): MutableStore<T> {
  let current = initial;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => current,
    set(next) {
      if (Object.is(current, next)) return;
      current = next;

      for (const listener of [...listeners]) {
        try {
          listener();
        } catch (error) {
          onListenerError(error);
        }
      }
    },
    subscribe(listener): Unsubscribe {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
