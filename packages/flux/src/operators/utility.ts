import type { Flux, Operator, Unsubscribe } from '../types';

import { flux } from '../core';
import { FluxBufferOverflowError, FluxTimeoutError } from '../errors';

export type ShareOptions = {
  bufferSize?: number;
  overflow?: 'drop-newest' | 'drop-oldest' | 'error';
};

/**
 * Multicast a cold `Flux` to multiple subscribers. The first subscriber starts
 * the source; the last unsubscribe stops it.
 *
 * Pass `bufferSize` to replay buffered values to late subscribers.
 */
export function share<T>(opts?: ShareOptions): Operator<T, T> {
  return (source) => {
    const subscribers = new Set<{ complete?: () => void; error?: (e: unknown) => void; next: (v: T) => void }>();
    const buffer: T[] = [];
    let sourceUnsub: Unsubscribe | undefined;
    let sourceDone = false;
    let sourceError: unknown;
    let hasError = false;

    return flux<T>((observer) => {
      if (hasError) {
        observer.error?.(sourceError);

        return;
      }

      if (sourceDone) {
        for (const v of buffer) observer.next(v);

        observer.complete?.();

        return;
      }

      for (const v of buffer) observer.next(v);

      const entry = {
        complete: observer.complete,
        error: observer.error,
        next: observer.next,
      };

      subscribers.add(entry);

      if (subscribers.size === 1) {
        sourceUnsub = source.subscribe({
          complete() {
            sourceDone = true;

            for (const s of [...subscribers]) s.complete?.();

            subscribers.clear();
          },
          error(err) {
            hasError = true;
            sourceError = err;

            for (const s of [...subscribers]) s.error?.(err);

            subscribers.clear();
          },
          next(v) {
            const bufSize = opts?.bufferSize;

            if (bufSize) {
              if (buffer.length >= bufSize) {
                const strategy = opts?.overflow ?? 'drop-oldest';

                if (strategy === 'drop-oldest') {
                  buffer.shift();
                } else if (strategy === 'drop-newest') {
                  return;
                } else {
                  const err = new FluxBufferOverflowError(strategy);

                  for (const s of [...subscribers]) s.error?.(err);

                  subscribers.clear();
                  sourceUnsub?.();

                  return;
                }
              }

              buffer.push(v);
            }

            for (const s of [...subscribers]) s.next(v);
          },
        });
      }

      return () => {
        subscribers.delete(entry);

        if (subscribers.size === 0) {
          sourceUnsub?.();
          sourceUnsub = undefined;
        }
      };
    });
  };
}

/**
 * Like `share()` but always replays the last `bufferSize` values to new subscribers.
 *
 * @example
 * const hot$ = cold$.pipe(shareReplay(1)); // last value replayed to late subs
 */
export function shareReplay<T>(bufferSize: number): Operator<T, T> {
  return share({ bufferSize, overflow: 'drop-oldest' });
}

/** Run a side effect on each emission without modifying the value. */
export function tap<T>(fn: (value: T) => void): Operator<T, T> {
  return (source) =>
    flux<T>((observer) =>
      source.subscribe({
        complete: observer.complete,
        error: observer.error,
        next(v) {
          fn(v);
          observer.next(v);
        },
      }),
    );
}

/** Delay each emission by `ms` milliseconds. */
export function delay<T>(ms: number): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      const timers: ReturnType<typeof setTimeout>[] = [];

      const unsub = source.subscribe({
        complete() {
          const id = setTimeout(() => {
            observer.complete?.();
          }, ms);

          timers.push(id);
        },
        error: observer.error,
        next(v) {
          const id = setTimeout(() => {
            observer.next(v);
          }, ms);

          timers.push(id);
        },
      });

      return () => {
        unsub();

        for (const id of timers) clearTimeout(id);
      };
    });
}

/**
 * Error if no value is emitted within `ms` milliseconds since the last emission
 * (or since subscription, for the first value). The timer resets on each emission —
 * this is an inactivity timeout, not a time-to-first-value or total-duration timeout.
 *
 * @example
 * source$.pipe(timeout(5000)); // throws FluxTimeoutError after 5s of silence
 */
export function timeout<T>(ms: number): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      let timerId = setTimeout(() => {
        observer.error?.(new FluxTimeoutError(ms));
        unsub();
      }, ms);

      const reset = (): void => {
        clearTimeout(timerId);
        timerId = setTimeout(() => {
          observer.error?.(new FluxTimeoutError(ms));
          unsub();
        }, ms);
      };

      const unsub = source.subscribe({
        complete() {
          clearTimeout(timerId);
          observer.complete?.();
        },
        error(err) {
          clearTimeout(timerId);
          observer.error?.(err);
        },
        next(v) {
          reset();
          observer.next(v);
        },
      });

      return () => {
        clearTimeout(timerId);
        unsub();
      };
    });
}

/**
 * Recover from an error by returning a new `Flux` to continue with.
 *
 * @example
 * source$.pipe(catchError((err) => of('fallback')));
 */
export function catchError<T>(handler: (err: unknown) => Flux<T>): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      let fallbackUnsub: Unsubscribe | undefined;

      const sourceUnsub = source.subscribe({
        complete: observer.complete,
        error(err) {
          fallbackUnsub = handler(err).subscribe({
            complete: observer.complete,
            error: observer.error,
            next: observer.next,
          });
        },
        next: observer.next,
      });

      return () => {
        sourceUnsub();
        fallbackUnsub?.();
      };
    });
}

/**
 * Re-subscribe to the source up to `count` times on error.
 *
 * @example
 * fetchStream$.pipe(retry(3)); // retry up to 3 times on error
 */
export function retry<T>(count: number): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      let attempts = 0;
      let currentUnsub: Unsubscribe | undefined;

      function attempt(): void {
        currentUnsub = source.subscribe({
          complete: observer.complete,
          error(err) {
            if (attempts < count) {
              attempts++;
              attempt();
            } else {
              observer.error?.(err);
            }
          },
          next: observer.next,
        });
      }

      attempt();

      return () => currentUnsub?.();
    });
}

/**
 * Run `fn` when the stream ends — whether by completion, error, or unsubscription.
 *
 * @example
 * source$.pipe(finalize(() => console.log('stream ended')));
 */
export function finalize<T>(fn: () => void): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      let called = false;

      const call = (): void => {
        if (called) return;

        called = true;
        fn();
      };

      const unsub = source.subscribe({
        complete() {
          call();
          observer.complete?.();
        },
        error(err) {
          call();
          observer.error?.(err);
        },
        next: observer.next,
      });

      return () => {
        call();
        unsub();
      };
    });
}

/**
 * Convert a `Flux` to a `Promise` that resolves with the last emitted value
 * when the source completes, or rejects on error.
 *
 * @example
 * const result = await toPromise(source$);
 */
export function toPromise<T>(source: Flux<T>): Promise<T | undefined> {
  return new Promise<T | undefined>((resolve, reject) => {
    let last: T | undefined;

    source.subscribe({
      complete() {
        resolve(last);
      },
      error: reject,
      next(v) {
        last = v;
      },
    });
  });
}

/**
 * Collect all emitted values into an array resolved when the source completes.
 *
 * @example
 * const all = await toArray(of(1, 2, 3));
 */
export function toArray<T>(source: Flux<T>): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const results: T[] = [];

    source.subscribe({
      complete() {
        resolve(results);
      },
      error: reject,
      next(v) {
        results.push(v);
      },
    });
  });
}
