import { RippleDisposedResourceError } from './errors';
import { REACTIVE } from './runtime';
import type { Disposable, EffectHandle, Readable, Signal } from './types';

export type AsyncState<T> =
  | { readonly previous?: T; readonly status: 'pending' }
  | { readonly status: 'success'; readonly value: T }
  | { readonly error: unknown; readonly previous?: T; readonly status: 'error' };

export interface Resource<T> extends Readable<AsyncState<T>>, Disposable {
  reload(): void;
}

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
    let hasPrevious = false;
    let previousValue: Value | undefined;

    const run = (): void => {
      void reloadEpoch.value;
      active?.abort();

      let input: Source;

      try {
        input = source();
      } catch (error) {
        state.value = hasPrevious
          ? { error, previous: previousValue as Value, status: 'error' }
          : { error, status: 'error' };

        return;
      }

      const next = new AbortController();

      active = next;
      state.value = hasPrevious ? { previous: previousValue as Value, status: 'pending' } : { status: 'pending' };

      let request: Promise<Value>;

      try {
        request = Promise.resolve(loader(input, { signal: next.signal }));
      } catch (error) {
        request = Promise.reject(error);
      }

      void request.then(
        (value) => {
          if (!stop.disposed && !next.signal.aborted) {
            hasPrevious = true;
            previousValue = value;
            state.value = { status: 'success', value };
          }
        },
        (error: unknown) => {
          if (!stop.disposed && !next.signal.aborted) {
            state.value = hasPrevious
              ? { error, previous: previousValue as Value, status: 'error' }
              : { error, status: 'error' };
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

    const assertActive = (): void => {
      if (stop.disposed) throw new RippleDisposedResourceError('Cannot use a disposed resource.');
    };
    const resource: Resource<Value> = {
      get disposalSignal() {
        return stop.disposalSignal;
      },
      dispose: () => stop.dispose(),
      get disposed() {
        return stop.disposed;
      },
      get name() {
        return state.name;
      },
      peek: () => state.peek(),
      reload: () => {
        assertActive();
        reloadEpoch.value = reloadEpoch.peek() + 1;
      },
      subscribe: (listener) => {
        assertActive();
        return state.subscribe(listener);
      },
      [Symbol.dispose]() {
        this.dispose();
      },
      get value() {
        return state.value;
      },
    };

    Object.defineProperty(resource, REACTIVE, { value: true });

    return resource;
  };
