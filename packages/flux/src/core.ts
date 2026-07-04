import type { Flux, Observer, Producer, Unsubscribe } from './types';

import { makeAsyncIterator } from './_iterator';
import { makePipe } from './_pipe';

const NOOP: Unsubscribe = () => {};

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
export function flux<T>(producer: Producer<T>): Flux<T> {
  const ac = new AbortController();

  const instance: Flux<T> = {
    get disposalSignal(): AbortSignal {
      return ac.signal;
    },

    dispose(): void {
      ac.abort();
    },

    get disposed(): boolean {
      return ac.signal.aborted;
    },

    pipe: makePipe(() => instance),

    subscribe(observerOrNext: Observer<T> | ((value: T) => void), signal?: AbortSignal): Unsubscribe {
      const observer: Observer<T> = typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

      if (ac.signal.aborted || signal?.aborted) {
        try {
          observer.complete?.();
        } catch {
          /* empty */
        }

        return NOOP;
      }

      let active = true;
      let producerCleanup: Unsubscribe | void;

      const deregister = (): void => {
        ac.signal.removeEventListener('abort', notifyComplete);

        if (signal) signal.removeEventListener('abort', unsubscribe);
      };

      const notifyComplete = (): void => {
        if (!active) return;

        active = false;
        deregister();

        try {
          observer.complete?.();
        } catch {
          /* empty */
        }

        try {
          producerCleanup?.();
        } catch {
          /* empty */
        }
      };

      const safeObserver: Observer<T> = {
        complete(): void {
          if (!active) return;

          active = false;
          deregister();

          try {
            observer.complete?.();
          } finally {
            producerCleanup?.();
          }
        },

        error(err: unknown): void {
          if (!active) return;

          active = false;
          deregister();

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

        return NOOP;
      }

      if (!active) {
        producerCleanup?.();

        return NOOP;
      }

      function unsubscribe(): void {
        if (!active) return;

        active = false;
        deregister();
        producerCleanup?.();
      }

      ac.signal.addEventListener('abort', notifyComplete, { once: true });

      if (signal) {
        signal.addEventListener('abort', unsubscribe, { once: true });
      }

      return (): void => {
        unsubscribe();
      };
    },

    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
      return makeAsyncIterator<T>((obs) => instance.subscribe(obs));
    },

    [Symbol.dispose](): void {
      instance.dispose();
    },
  };

  return instance;
}
