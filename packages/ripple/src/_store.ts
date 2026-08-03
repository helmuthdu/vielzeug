import type { Signal } from './types';

export type Store<T> = {
  readonly name?: string;
  peek(): T;
  set(value: T): void;
  subscribe(listener: () => void): () => void;
  update(updater: (value: T) => T): void;
  readonly value: T;
};

export type StoreOptions = {
  name?: string;
};

type StoreRuntime = {
  signal<T>(initial: T, options?: { name?: string }): Signal<T>;
};

export const createStore =
  (runtime: StoreRuntime) =>
  <T>(initial: T, options?: StoreOptions): Store<T> => {
    const state = runtime.signal(initial, { name: options?.name });

    return {
      get name() {
        return state.name;
      },
      peek: () => state.peek(),
      set: (value) => {
        state.value = value;
      },
      subscribe: (listener) => state.subscribe(listener),
      update: (updater) => {
        state.value = updater(state.peek());
      },
      get value() {
        return state.value;
      },
    };
  };
