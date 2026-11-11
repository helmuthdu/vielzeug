import { EffectReadable } from './_handle';
import type { ReactiveRuntime } from './runtime';
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

class ResourceHandle<T> extends EffectReadable<AsyncState<T>> implements Resource<T> {
  private readonly reloads: Signal<number>;

  constructor(state: Signal<AsyncState<T>>, effect: EffectHandle, reloads: Signal<number>) {
    super('resource', state, effect);
    this.reloads = reloads;
  }

  reload(): void {
    this.assertActive();
    this.reloads.update((count) => count + 1);
  }
}

export const createResource =
  (runtime: ReactiveRuntime) =>
  <Source, Value>(
    source: () => Source,
    loader: (source: Source, context: { readonly signal: AbortSignal }) => Promise<Value>,
    options?: ResourceOptions,
  ): Resource<Value> => {
    const state = runtime.signal<AsyncState<Value>>({ status: 'pending' }, { name: options?.name });
    const reloads = runtime.signal(0);
    let last: { value: Value } | undefined;

    const pending = (): AsyncState<Value> =>
      last ? { previous: last.value, status: 'pending' } : { status: 'pending' };
    const failed = (error: unknown): AsyncState<Value> =>
      last ? { error, previous: last.value, status: 'error' } : { error, status: 'error' };

    const effect = runtime.effect(
      () => {
        void reloads.value;

        let input: Source;

        try {
          input = source();
        } catch (error) {
          state.value = failed(error);

          return;
        }

        // Aborted by the effect cleanup: on the next run, a reload, or disposal.
        const controller = new AbortController();

        let request: Promise<Value>;

        try {
          // Only `source()` is tracked: reads in the loader must not trigger reloads.
          request = Promise.resolve(runtime.untrack(() => loader(input, { signal: controller.signal })));
        } catch (error) {
          request = Promise.reject(error);
        }

        state.value = pending();
        void request.then(
          (value) => {
            if (controller.signal.aborted) return;
            last = { value };
            state.value = { status: 'success', value };
          },
          (error: unknown) => {
            if (!controller.signal.aborted) state.value = failed(error);
          },
        );

        return () => controller.abort();
      },
      { name: options?.name },
    );

    return new ResourceHandle(state, effect, reloads);
  };
