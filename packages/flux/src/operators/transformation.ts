import type { Flux, Operator, Unsubscribe } from '../types';

import { warn } from '../_dev';
import { clampPositiveInt } from '../_numeric';
import { guard } from '../_safe';
import { flux } from '../core';

/** Transform each emitted value through `fn`. */
export function map<A, B>(fn: (value: A) => B): Operator<A, B> {
  return (source) =>
    flux<B>((observer) =>
      source.subscribe({
        complete: observer.complete,
        error: observer.error,
        next(v) {
          guard(() => observer.next(fn(v)), observer.error);
        },
      }),
    );
}

/** Emit only values for which `predicate` returns `true`. */
export function filter<T>(predicate: (value: T) => boolean): Operator<T, T> {
  return (source) =>
    flux<T>((observer) =>
      source.subscribe({
        complete: observer.complete,
        error: observer.error,
        next(v) {
          guard(() => {
            if (predicate(v)) observer.next(v);
          }, observer.error);
        },
      }),
    );
}

/**
 * Accumulate state with a reducer. Emits the accumulated value after each source emission.
 *
 * @example
 * of(1, 2, 3).pipe(scan((acc, n) => acc + n, 0)); // emits 1, 3, 6
 */
export function scan<T, A>(reducer: (acc: A, value: T) => A, seed: A): Operator<T, A> {
  return (source) =>
    flux<A>((observer) => {
      let acc = seed;

      return source.subscribe({
        complete: observer.complete,
        error: observer.error,
        next(v) {
          guard(() => {
            acc = reducer(acc, v);
            observer.next(acc);
          }, observer.error);
        },
      });
    });
}

/**
 * Map each source value to an inner `Flux`, cancelling the previous inner on each new emission.
 * Useful for search-as-you-type, navigation, etc.
 */
export function switchMap<A, B>(fn: (value: A) => Flux<B>): Operator<A, B> {
  return (source) =>
    flux<B>((observer) => {
      let innerUnsub: Unsubscribe | undefined;
      let outerDone = false;

      const checkDone = (): void => {
        if (outerDone && !innerUnsub) observer.complete?.();
      };

      const outerUnsub = source.subscribe({
        complete() {
          outerDone = true;
          checkDone();
        },
        error: observer.error,
        next(v) {
          guard(() => {
            innerUnsub?.();
            innerUnsub = fn(v).subscribe({
              complete() {
                innerUnsub = undefined;
                checkDone();
              },
              error: observer.error,
              next: observer.next,
            });
          }, observer.error);
        },
      });

      return () => {
        outerUnsub();
        innerUnsub?.();
      };
    });
}

/**
 * Map each source value to an inner `Flux`, merging all inner streams concurrently.
 * All inner subscriptions run simultaneously.
 */
export function flatMap<A, B>(fn: (value: A) => Flux<B>): Operator<A, B> {
  return (source) =>
    flux<B>((observer) => {
      let outerDone = false;
      let activeInner = 0;
      const innerUnsubs = new Set<Unsubscribe>();

      const checkDone = (): void => {
        if (outerDone && activeInner === 0) observer.complete?.();
      };

      const outerUnsub = source.subscribe({
        complete() {
          outerDone = true;
          checkDone();
        },
        error: observer.error,
        next(v) {
          guard(() => {
            activeInner++;

            let syncDone = false;
            // Init to NOOP to avoid TDZ if complete fires synchronously during subscribe().
            let unsub: Unsubscribe = () => {};

            const sub = fn(v).subscribe({
              complete() {
                syncDone = true;
                activeInner--;
                innerUnsubs.delete(unsub);
                checkDone();
              },
              error: observer.error,
              next: observer.next,
            });

            unsub = sub;

            if (!syncDone) innerUnsubs.add(unsub);
          }, observer.error);
        },
      });

      return () => {
        outerUnsub();
        for (const u of innerUnsubs) u();
      };
    });
}

/**
 * Map each source value to an inner `Flux`, subscribing to each one only after
 * the previous inner completes (sequential, queued).
 * Pass `maxBuffer` to cap queued items; excess items are dropped silently.
 */
export function concatMap<A, B>(fn: (value: A) => Flux<B>, maxBuffer = Infinity): Operator<A, B> {
  return (source) =>
    flux<B>((observer) => {
      let outerDone = false;
      const queue: A[] = [];
      let processing = false;
      let currentUnsub: Unsubscribe | undefined;

      function processNext(): void {
        if (queue.length === 0) {
          processing = false;

          if (outerDone) observer.complete?.();

          return;
        }

        processing = true;

        const item = queue.shift()!;

        guard(() => {
          currentUnsub = fn(item).subscribe({
            complete() {
              currentUnsub = undefined;

              processNext();
            },
            error: observer.error,
            next: observer.next,
          });
        }, observer.error);
      }

      const outerUnsub = source.subscribe({
        complete() {
          outerDone = true;

          if (!processing) observer.complete?.();
        },
        error: observer.error,
        next(v) {
          if (queue.length < maxBuffer) {
            queue.push(v);

            if (!processing) processNext();
          }
        },
      });

      return () => {
        outerUnsub();
        currentUnsub?.();
        queue.length = 0;
      };
    });
}

/**
 * Suppress consecutive duplicate values.
 * Uses `Object.is` by default; provide a custom `comparator` for deep equality.
 *
 * @example
 * of(1, 1, 2, 2, 3).pipe(distinctUntilChanged()); // emits 1, 2, 3
 */
export function distinctUntilChanged<T>(comparator?: (a: T, b: T) => boolean): Operator<T, T> {
  const eq = comparator ?? Object.is;

  return (source) =>
    flux<T>((observer) => {
      let hasPrev = false;
      let prev: T;

      return source.subscribe({
        complete: observer.complete,
        error: observer.error,
        next(v) {
          guard(() => {
            if (!hasPrev || !eq(prev, v)) {
              hasPrev = true;
              prev = v;
              observer.next(v);
            }
          }, observer.error);
        },
      });
    });
}

/**
 * Prepend one or more static values before the source's first emission.
 *
 * @example
 * of(2, 3).pipe(startWith(0, 1)).subscribe(console.log); // 0, 1, 2, 3
 */
export function startWith<T>(...values: T[]): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      for (const v of values) observer.next(v);

      return source.subscribe(observer);
    });
}

/**
 * Collect source emissions into fixed-size arrays, emitting each batch when full.
 * A partial batch at the end of the source is flushed on completion.
 *
 * @param size - Number of emissions per batch.
 * @param every - Start a new batch every `every` emissions (default: `size`, non-overlapping).
 *
 * @example
 * of(1, 2, 3, 4, 5, 6).pipe(bufferCount(2)).subscribe(console.log);
 * // [1, 2], [3, 4], [5, 6]
 */
export function bufferCount<T>(size: number, every?: number): Operator<T, T[]> {
  const { clamped: sizeClamped, value: safeSize } = clampPositiveInt(size);
  const { clamped: everyClamped, value: step } = clampPositiveInt(every ?? safeSize);

  if (sizeClamped) {
    warn(`bufferCount: size must be a finite integer >= 1, got ${size} — clamped to ${safeSize}`);
  }

  if (every !== undefined && everyClamped) {
    warn(`bufferCount: every must be a finite integer >= 1, got ${every} — clamped to ${step}`);
  }

  return (source) =>
    flux<T[]>((observer) => {
      const buffers: T[][] = [];
      let count = 0;

      return source.subscribe({
        complete() {
          for (const buf of buffers) {
            if (buf.length > 0) observer.next(buf);
          }

          observer.complete?.();
        },
        error: observer.error,
        next(v) {
          if (count % step === 0) buffers.push([]);

          for (const buf of buffers) buf.push(v);

          let i = 0;

          while (i < buffers.length) {
            if (buffers[i]!.length >= safeSize) {
              observer.next(buffers[i]!);
              buffers.splice(i, 1);
            } else {
              i++;
            }
          }

          count++;
        },
      });
    });
}

/**
 * Emit the previous and current value as a `[prev, curr]` tuple.
 * No emission occurs until the second source value arrives.
 *
 * @example
 * of(1, 2, 3).pipe(pairwise()).subscribe(console.log); // [1, 2], [2, 3]
 */
export function pairwise<T>(): Operator<T, [T, T]> {
  return (source) =>
    flux<[T, T]>((observer) => {
      let hasPrev = false;
      let prev: T;

      return source.subscribe({
        complete: observer.complete,
        error: observer.error,
        next(v) {
          if (hasPrev) observer.next([prev, v]);

          hasPrev = true;
          prev = v;
        },
      });
    });
}
