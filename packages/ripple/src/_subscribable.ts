import { EffectReadable } from './_handle';
import type { ReactiveRuntime } from './runtime';
import type { Disposable, Readable, Subscribable } from './types';

export type BridgedReadable<T> = Readable<T> & Disposable;
export type FromSubscribableOptions = { name?: string; signal?: AbortSignal };

export const createFromSubscribable =
  (runtime: ReactiveRuntime) =>
  <T>(source: Subscribable<T>, options?: FromSubscribableOptions): BridgedReadable<T> => {
    const state = runtime.signal<T>(source.getSnapshot(), { name: options?.name });
    // Untracked: the subscription is set up once and lives until disposal, whatever the source reads.
    const effect = runtime.effect(
      () =>
        runtime.untrack(() => {
          const sync = () => {
            state.value = source.getSnapshot();
          };
          const unsubscribe = source.subscribe(sync);

          try {
            // Catch a change made between the initial snapshot and the subscription.
            sync();
          } catch (error) {
            unsubscribe();
            throw error;
          }

          return unsubscribe;
        }),
      { name: options?.name },
    );

    if (options?.signal?.aborted) effect.dispose();
    else
      options?.signal?.addEventListener('abort', () => effect.dispose(), { once: true, signal: effect.disposalSignal });

    return new EffectReadable('bridge', state, effect);
  };
