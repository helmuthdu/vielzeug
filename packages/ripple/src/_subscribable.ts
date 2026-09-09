import { RippleError } from './errors';
import { REACTIVE } from './runtime';
import type { Disposable, EffectHandle, Readable, Signal, Subscribable } from './types';

type BridgeRuntime = {
  effect(callback: () => undefined | (() => void), options?: { name?: string }): EffectHandle;
  signal<T>(initial: T, options?: { name?: string }): Signal<T>;
};

export type BridgedReadable<T> = Readable<T> & Disposable;
export type FromSubscribableOptions = { name?: string; signal?: AbortSignal };

export const createFromSubscribable =
  (runtime: BridgeRuntime) =>
  <T>(source: Subscribable<T>, options?: FromSubscribableOptions): BridgedReadable<T> => {
    const node = runtime.signal<T>(source.getSnapshot(), { name: options?.name });
    const stop = runtime.effect(
      () => {
        const sync = () => {
          node.value = source.getSnapshot();
        };
        let unsubscribe: (() => void) | undefined;

        try {
          unsubscribe = source.subscribe(sync);
          sync();
        } catch (error) {
          unsubscribe?.();
          throw error;
        }

        return unsubscribe;
      },
      { name: options?.name },
    );
    const abort = () => stop.dispose();

    options?.signal?.addEventListener('abort', abort, { once: true });
    if (options?.signal?.aborted) stop.dispose();

    const assertActive = (): void => {
      if (stop.disposed) throw new RippleError('Cannot subscribe to a disposed bridge.');
    };
    const dispose = (): void => {
      options?.signal?.removeEventListener('abort', abort);
      stop.dispose();
    };
    const readable: BridgedReadable<T> = {
      get disposalSignal() {
        return stop.disposalSignal;
      },
      dispose,
      get disposed() {
        return stop.disposed;
      },
      get name() {
        return node.name;
      },
      peek: () => node.peek(),
      subscribe(listener) {
        assertActive();
        return node.subscribe(listener);
      },
      [Symbol.dispose]: dispose,
      get value() {
        return node.value;
      },
    };

    Object.defineProperty(readable, REACTIVE, { value: true });
    return readable;
  };
