import type { EffectHandle, Signal } from './types';

export type AsyncState<T> =
  | { readonly previous?: T; readonly status: 'pending' }
  | { readonly status: 'success'; readonly value: T }
  | { readonly error: unknown; readonly previous?: T; readonly status: 'error' };

export type Resource<T> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  readonly name?: string;
  peek(): AsyncState<T>;
  reload(): void;
  subscribe(listener: () => void): () => void;
  readonly value: AsyncState<T>;
};

export type ResourceOptions = {
  name?: string;
};

type AsyncRuntime = {
  effect(callback: () => undefined | (() => void), options?: { name?: string }): EffectHandle;
  signal<T>(initial: T, options?: { name?: string }): Signal<T>;
};

/** Resource only depends on primitive runtime methods; graph binding stays private. */
export const createResource =
  (runtime: AsyncRuntime) =>
  <Source, Value>(
    source: () => Source,
    loader: (source: Source, context: { readonly signal: AbortSignal }) => Promise<Value>,
    options?: ResourceOptions,
  ): Resource<Value> => {
    const state = runtime.signal<AsyncState<Value>>({ status: 'pending' }, { name: options?.name });
    const reloadEpoch = runtime.signal(0);
    let active: AbortController | undefined;
    let disposed = false;

    const run = (): void => {
      void reloadEpoch.value;
      active?.abort();

      const current = state.peek();
      const previous =
        current.status === 'success' ? current.value : 'previous' in current ? current.previous : undefined;
      let input: Source;

      try {
        input = source();
      } catch (error) {
        state.value = previous === undefined ? { error, status: 'error' } : { error, previous, status: 'error' };

        return;
      }

      const next = new AbortController();

      active = next;
      state.value = previous === undefined ? { status: 'pending' } : { previous, status: 'pending' };

      let request: Promise<Value>;

      try {
        request = Promise.resolve(loader(input, { signal: next.signal }));
      } catch (error) {
        request = Promise.reject(error);
      }

      void request.then(
        (value) => {
          if (!disposed && !next.signal.aborted) state.value = { status: 'success', value };
        },
        (error: unknown) => {
          if (!disposed && !next.signal.aborted) {
            state.value = previous === undefined ? { error, status: 'error' } : { error, previous, status: 'error' };
          }
        },
      );
    };

    const stop = runtime.effect(
      () => {
        run();

        return () => active?.abort();
      },
      { name: options?.name },
    );

    stop.disposalSignal.addEventListener(
      'abort',
      () => {
        disposed = true;
      },
      { once: true },
    );

    return {
      get disposalSignal() {
        return stop.disposalSignal;
      },
      dispose: () => stop.dispose(),
      get disposed() {
        return disposed;
      },
      get name() {
        return state.name;
      },
      peek: () => state.peek(),
      reload: () => {
        if (disposed) return;

        reloadEpoch.value = reloadEpoch.peek() + 1;
      },
      subscribe: (listener) => state.subscribe(listener),
      [Symbol.dispose]() {
        this.dispose();
      },
      get value() {
        return state.value;
      },
    };
  };
