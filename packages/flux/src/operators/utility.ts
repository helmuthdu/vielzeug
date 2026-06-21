import type { Flux, Operator, Scheduler, Unsubscribe } from '../types';

import { DEFAULT_SCHEDULER } from '../_scheduler';
import { flux } from '../core';
import { FluxTimeoutError } from '../errors';

type SharedEntry<T> = { complete?: () => void; error?: (e: unknown) => void; next: (v: T) => void };

function makeMulticast<T>(source: Flux<T>, maxBuffer: number): Flux<T> {
  const subscribers = new Set<SharedEntry<T>>();
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

    for (const v of buffer) observer.next(v);

    if (sourceDone) {
      observer.complete?.();

      return;
    }

    const entry: SharedEntry<T> = {
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
          if (maxBuffer > 0) {
            if (buffer.length >= maxBuffer) buffer.shift();

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
}

/**
 * Multicast a cold `Flux` to multiple subscribers. The first subscriber starts
 * the source; the last to unsubscribe stops it.
 *
 * @example
 * const hot$ = cold$.pipe(share()); // one source, many subscribers
 */
export function share<T>(): Operator<T, T> {
  return (source) => makeMulticast(source, 0);
}

/**
 * Multicast a cold `Flux` and replay the last `bufferSize` values (default: 1)
 * to any new subscriber.
 *
 * @example
 * const hot$ = cold$.pipe(shareReplay(1)); // last value replayed to late subs
 */
export function shareReplay<T>(bufferSize = 1): Operator<T, T> {
  return (source) => makeMulticast(source, Math.max(1, Math.floor(bufferSize)));
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

/** Delay each emission by `ms` milliseconds. Pass a custom `scheduler` to control time in tests. */
export function delay<T>(ms: number, scheduler: Scheduler = DEFAULT_SCHEDULER): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      const cancels: Array<() => void> = [];

      const unsub = source.subscribe({
        complete() {
          cancels.push(scheduler.delay(() => observer.complete?.(), ms));
        },
        error: observer.error,
        next(v) {
          cancels.push(scheduler.delay(() => observer.next(v), ms));
        },
      });

      return () => {
        unsub();
        for (const cancel of cancels) cancel();
      };
    });
}

/**
 * Error if no value is emitted within `ms` milliseconds since the last emission
 * (or since subscription, for the first value). The timer resets on each emission —
 * this is an inactivity timeout, not a time-to-first-value or total-duration timeout.
 * Pass a custom `scheduler` to control time in tests.
 *
 * @example
 * source$.pipe(timeout(5000)); // throws FluxTimeoutError after 5s of silence
 */
export function timeout<T>(ms: number, scheduler: Scheduler = DEFAULT_SCHEDULER): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      let cancelTimer!: () => void;

      const startTimer = (): void => {
        cancelTimer = scheduler.delay(() => {
          observer.error?.(new FluxTimeoutError(ms));
        }, ms);
      };

      startTimer();

      const unsub = source.subscribe({
        complete() {
          cancelTimer();
          observer.complete?.();
        },
        error(err) {
          cancelTimer();
          observer.error?.(err);
        },
        next(v) {
          cancelTimer();
          startTimer();
          observer.next(v);
        },
      });

      return () => {
        cancelTimer();
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
 * Pass `delayMs` as a fixed number or `(attempt) => number` function for backoff.
 * Pass a custom `scheduler` to control time in tests.
 *
 * @example
 * fetchStream$.pipe(retry(3));
 * fetchStream$.pipe(retry(3, (n) => Math.min(1000 * 2 ** n, 30_000))); // exponential backoff
 */
export function retry<T>(
  count: number,
  delayMs?: number | ((attempt: number) => number),
  scheduler: Scheduler = DEFAULT_SCHEDULER,
): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      let attempts = 0;
      let currentUnsub: Unsubscribe | undefined;
      let cancelDelay: (() => void) | undefined;

      function attempt(): void {
        currentUnsub = source.subscribe({
          complete: observer.complete,
          error(err) {
            if (attempts < count) {
              const n = attempts++;

              if (delayMs !== undefined) {
                const ms = typeof delayMs === 'function' ? delayMs(n) : delayMs;

                cancelDelay = scheduler.delay(attempt, Math.max(0, ms));
              } else {
                attempt();
              }
            } else {
              observer.error?.(err);
            }
          },
          next: observer.next,
        });
      }

      attempt();

      return () => {
        cancelDelay?.();
        currentUnsub?.();
      };
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

/**
 * Compose multiple operators into a single reusable operator.
 * Provides full type safety at any pipeline depth — use instead of
 * `pipe()` overloads when chaining more than 4 operators.
 *
 * @example
 * const pipeline = flow(
 *   filter((n) => n % 2 === 0),
 *   map((n) => n * 10),
 *   take(5),
 * );
 * source$.pipe(pipeline).subscribe(console.log);
 */
export function flow<A, B>(op1: Operator<A, B>): Operator<A, B>;
export function flow<A, B, C>(op1: Operator<A, B>, op2: Operator<B, C>): Operator<A, C>;
export function flow<A, B, C, D>(op1: Operator<A, B>, op2: Operator<B, C>, op3: Operator<C, D>): Operator<A, D>;
export function flow<A, B, C, D, E>(
  op1: Operator<A, B>,
  op2: Operator<B, C>,
  op3: Operator<C, D>,
  op4: Operator<D, E>,
): Operator<A, E>;
export function flow<A, B, C, D, E, F>(
  op1: Operator<A, B>,
  op2: Operator<B, C>,
  op3: Operator<C, D>,
  op4: Operator<D, E>,
  op5: Operator<E, F>,
): Operator<A, F>;
export function flow<A, B, C, D, E, F, G>(
  op1: Operator<A, B>,
  op2: Operator<B, C>,
  op3: Operator<C, D>,
  op4: Operator<D, E>,
  op5: Operator<E, F>,
  op6: Operator<F, G>,
): Operator<A, G>;
export function flow<A, B, C, D, E, F, G, H>(
  op1: Operator<A, B>,
  op2: Operator<B, C>,
  op3: Operator<C, D>,
  op4: Operator<D, E>,
  op5: Operator<E, F>,
  op6: Operator<F, G>,
  op7: Operator<G, H>,
): Operator<A, H>;
export function flow<A, B, C, D, E, F, G, H, I>(
  op1: Operator<A, B>,
  op2: Operator<B, C>,
  op3: Operator<C, D>,
  op4: Operator<D, E>,
  op5: Operator<E, F>,
  op6: Operator<F, G>,
  op7: Operator<G, H>,
  op8: Operator<H, I>,
): Operator<A, I>;
export function flow(...ops: Operator[]): Operator {
  return (source: Flux<unknown>) => ops.reduce((f: Flux<unknown>, op) => op(f), source);
}
