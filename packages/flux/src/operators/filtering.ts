import type { Flux, Operator, Scheduler, Unsubscribe } from '../types';

import { guard } from '../_safe';
import { DEFAULT_SCHEDULER } from '../_scheduler';
import { flux } from '../core';

/**
 * Emit only the first `count` values, then complete.
 *
 * @example
 * interval(100).pipe(take(3)); // emits 0, 1, 2 then completes
 */
export function take<T>(count: number): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      if (count <= 0) {
        observer.complete?.();

        return;
      }

      let seen = 0;
      let unsub: Unsubscribe = () => {};

      unsub = source.subscribe({
        complete: observer.complete,
        error: observer.error,
        next(v) {
          observer.next(v);
          seen++;

          if (seen >= count) {
            observer.complete?.();
            unsub();
          }
        },
      });

      return unsub;
    });
}

/** Skip the first `count` values, then emit the rest. */
export function skip<T>(count: number): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      let skipped = 0;

      return source.subscribe({
        complete: observer.complete,
        error: observer.error,
        next(v) {
          if (skipped < count) {
            skipped++;
          } else {
            observer.next(v);
          }
        },
      });
    });
}

/**
 * Complete when either `notifier` emits its first value or an `AbortSignal` aborts.
 *
 * @example
 * source$.pipe(takeUntil(stop$));
 * source$.pipe(takeUntil(abortController.signal));
 */
export function takeUntil<T>(notifier: AbortSignal | Flux<unknown>): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      let done = false;

      const finish = (): void => {
        if (done) return;

        done = true;
        observer.complete?.();
        notifierUnsub();
        sourceUnsub?.();
      };

      let notifierUnsub: () => void;

      if (notifier instanceof AbortSignal) {
        if (notifier.aborted) {
          observer.complete?.();

          return;
        }

        notifier.addEventListener('abort', finish, { once: true });
        notifierUnsub = () => notifier.removeEventListener('abort', finish);
      } else {
        notifierUnsub = notifier.subscribe({ next: finish });
      }

      const sourceUnsub = source.subscribe({
        complete() {
          done = true;
          notifierUnsub();
          observer.complete?.();
        },
        error(err) {
          done = true;
          notifierUnsub();
          observer.error?.(err);
        },
        next: observer.next,
      });

      return () => {
        notifierUnsub();
        sourceUnsub();
      };
    });
}

/**
 * Emit values while `predicate` is truthy. Complete when it returns `false`.
 *
 * @example
 * of(1, 2, 3, 4).pipe(takeWhile((n) => n < 3)); // emits 1, 2
 */
export function takeWhile<T>(predicate: (value: T) => boolean): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      let unsub: Unsubscribe = () => {};

      unsub = source.subscribe({
        complete: observer.complete,
        error: observer.error,
        next(v) {
          guard(() => {
            if (predicate(v)) {
              observer.next(v);
            } else {
              observer.complete?.();
              unsub();
            }
          }, observer.error);
        },
      });

      return unsub;
    });
}

/**
 * Emit the last value after `ms` milliseconds of silence.
 * Resets the timer on every source emission.
 *
 * **Note:** if the source completes while a value is pending (timer not yet fired),
 * the pending value is dropped. Only the completion signal is forwarded.
 *
 * @example
 * fromEvent(input, 'input').pipe(debounce(300)); // wait 300ms after last keystroke
 */
export function debounce<T>(ms: number, scheduler: Scheduler = DEFAULT_SCHEDULER): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      let cancelTimer: (() => void) | undefined;

      const unsub = source.subscribe({
        complete() {
          cancelTimer?.();
          observer.complete?.();
        },
        error(err) {
          cancelTimer?.();
          observer.error?.(err);
        },
        next(v) {
          cancelTimer?.();
          cancelTimer = scheduler.delay(() => observer.next(v), ms);
        },
      });

      return () => {
        cancelTimer?.();
        unsub();
      };
    });
}

/**
 * Emit at most once per `ms` milliseconds. Leading edge by default.
 * Pass a custom `clock` function (default: `Date.now`) to control time in tests.
 *
 * @example
 * fromEvent(window, 'scroll').pipe(throttle(100));
 */
export function throttle<T>(ms: number, clock: () => number = Date.now): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      let lastEmit = -Infinity;

      return source.subscribe({
        complete: observer.complete,
        error: observer.error,
        next(v) {
          const now = clock();

          if (now - lastEmit >= ms) {
            lastEmit = now;
            observer.next(v);
          }
        },
      });
    });
}

/**
 * When `notifier` emits, emit the latest value from `source` (if any).
 * Useful for polling-like patterns.
 *
 * @example
 * source$.pipe(sample(interval(1000))); // emit latest value every 1s
 */
export function sample<T>(notifier: Flux<unknown>): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      let latest: T;
      let hasValue = false;

      const sourceUnsub = source.subscribe({
        complete: observer.complete,
        error: observer.error,
        next(v) {
          latest = v;
          hasValue = true;
        },
      });

      const notifierUnsub = notifier.subscribe({
        next() {
          if (hasValue) observer.next(latest);
        },
      });

      return () => {
        sourceUnsub();
        notifierUnsub();
      };
    });
}

/** Emit only the first value, then complete. Equivalent to `take(1)`. */
export function first<T>(): Operator<T, T> {
  return take(1);
}

/**
 * Emit only the last value, collected when source completes.
 *
 * @example
 * of(1, 2, 3).pipe(last()); // emits 3
 */
export function last<T>(): Operator<T, T> {
  return (source) =>
    flux<T>((observer) => {
      let latest: T;
      let hasValue = false;

      return source.subscribe({
        complete() {
          if (hasValue) observer.next(latest);

          observer.complete?.();
        },
        error: observer.error,
        next(v) {
          latest = v;
          hasValue = true;
        },
      });
    });
}
