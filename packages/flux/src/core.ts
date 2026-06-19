import type { Flux, FluxOptions, Observer, Operator, Producer, Unsubscribe } from './types';

import { FluxDisposedError } from './errors';

/**
 * Creates a cold `Flux<T>` stream from a producer function.
 *
 * The producer is called once per `subscribe()` invocation (cold by default).
 * Return a cleanup function from the producer to run when the subscriber
 * unsubscribes, errors, or the stream is disposed.
 *
 * @example
 * const ticker = flux<number>((observer) => {
 *   let i = 0;
 *   const id = setInterval(() => observer.next(i++), 1000);
 *   return () => clearInterval(id);
 * });
 */
export function flux<T>(producer: Producer<T>, _options?: FluxOptions): Flux<T> {
  const ac = new AbortController();
  const activeCleanups = new Set<() => void>();

  const instance: Flux<T> = {
    get disposalSignal(): AbortSignal {
      return ac.signal;
    },

    dispose(): void {
      if (ac.signal.aborted) return;

      ac.abort();

      for (const cleanup of activeCleanups) {
        try {
          cleanup();
        } catch {
          // swallow cleanup errors
        }
      }

      activeCleanups.clear();
    },

    get disposed(): boolean {
      return ac.signal.aborted;
    },

    pipe(...operators: Operator[]): Flux<unknown> {
      return operators.reduce((f: Flux<unknown>, op) => op(f), this as Flux<unknown>);
    },

    subscribe(observerOrNext: Observer<T> | ((value: T) => void)): Unsubscribe {
      if (ac.signal.aborted) throw new FluxDisposedError();

      const observer: Observer<T> = typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

      let active = true;
      let producerCleanup: Unsubscribe | void;

      const safeObserver: Observer<T> = {
        complete(): void {
          if (!active) return;

          active = false;
          activeCleanups.delete(unsubscribe);

          try {
            observer.complete?.();
          } finally {
            producerCleanup?.();
          }
        },

        error(err: unknown): void {
          if (!active) return;

          active = false;
          activeCleanups.delete(unsubscribe);

          try {
            observer.error?.(err);
          } finally {
            producerCleanup?.();
          }
        },

        next(value: T): void {
          if (active) observer.next(value);
        },
      };

      try {
        producerCleanup = producer(safeObserver);
      } catch (err) {
        active = false;
        observer.error?.(err);

        return () => {};
      }

      function unsubscribe(): void {
        if (!active) return;

        active = false;
        activeCleanups.delete(unsubscribe);
        producerCleanup?.();
      }

      if (!active) {
        producerCleanup?.();

        return () => {};
      }

      activeCleanups.add(unsubscribe);

      const abortUnsub = (): void => {
        unsubscribe();
      };

      ac.signal.addEventListener('abort', abortUnsub, { once: true });

      return (): void => {
        ac.signal.removeEventListener('abort', abortUnsub);
        unsubscribe();
      };
    },

    [Symbol.dispose](): void {
      this.dispose();
    },
  };

  return instance;
}
