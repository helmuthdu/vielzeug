import { link } from '../_link.js';
import { assertDuration, assertNonNegativeInteger } from '../_numeric.js';
import { defaultScheduler } from '../_scheduler.js';
import { stream } from '../core.js';
import { FluxTimeoutError } from '../errors.js';
import type { Operator, Stream, Subscription } from '../types.js';

export function take<T>(count: number): Operator<T, T> {
  assertNonNegativeInteger(count, 'take count');

  return (source) =>
    stream((sink, signal) => {
      if (count === 0) {
        sink.complete();

        return;
      }

      let seen = 0;
      const subscriptionRef: { current?: Subscription } = {};

      subscriptionRef.current = link(
        source,
        {
          complete: sink.complete,
          error: sink.error,
          next(value) {
            sink.next(value);
            seen++;

            if (seen === count) {
              sink.complete();
              subscriptionRef.current?.unsubscribe();
            }
          },
        },
        signal,
      );

      return () => subscriptionRef.current?.unsubscribe();
    });
}

function isAbortSignal(value: AbortSignal | Stream<unknown>): value is AbortSignal {
  return (
    typeof (value as AbortSignal).aborted === 'boolean' &&
    typeof (value as AbortSignal).addEventListener === 'function' &&
    typeof (value as AbortSignal).removeEventListener === 'function'
  );
}

export function takeUntil<T>(notifier: AbortSignal | Stream<unknown>): Operator<T, T> {
  return (source) =>
    stream((sink, signal) => {
      let sourceSubscription: Subscription | undefined;
      let notifierSubscription: Subscription | undefined;
      let removeNotifier = (): void => {};

      const complete = (): void => {
        sourceSubscription?.unsubscribe();
        notifierSubscription?.unsubscribe();
        sink.complete();
      };

      if (isAbortSignal(notifier)) {
        if (notifier.aborted) {
          sink.complete();

          return;
        }

        notifier.addEventListener('abort', complete, { once: true });
        removeNotifier = (): void => notifier.removeEventListener('abort', complete);
      } else {
        notifierSubscription = link(notifier, { error: sink.error, next: complete }, signal);
      }

      if (!signal.aborted) {
        sourceSubscription = link(
          source,
          {
            complete: sink.complete,
            error: sink.error,
            next: sink.next,
          },
          signal,
        );
      }

      return () => {
        removeNotifier();
        sourceSubscription?.unsubscribe();
        notifierSubscription?.unsubscribe();
      };
    });
}

export function debounce<T>(duration: number): Operator<T, T> {
  assertDuration(duration, 'Debounce duration');

  return (source) =>
    stream((sink, signal) => {
      let cancel: (() => void) | undefined;
      let pending: T | undefined;
      let hasPending = false;

      const flush = (): void => {
        cancel = undefined;

        if (!hasPending) return;

        hasPending = false;
        sink.next(pending as T);
      };

      const subscription = link(
        source,
        {
          complete() {
            cancel?.();
            flush();
            sink.complete();
          },
          error: sink.error,
          next(value) {
            pending = value;
            hasPending = true;
            cancel?.();
            cancel = defaultScheduler.delay(flush, duration);
          },
        },
        signal,
      );

      return () => {
        cancel?.();
        subscription.unsubscribe();
      };
    });
}

export function timeout<T>(duration: number): Operator<T, T> {
  assertDuration(duration, 'Timeout duration');

  return (source) =>
    stream((sink, signal) => {
      let cancel: () => void;

      const start = (): void => {
        cancel = defaultScheduler.delay(() => sink.error(new FluxTimeoutError(duration)), duration);
      };

      start();

      const subscription = link(
        source,
        {
          complete() {
            cancel();
            sink.complete();
          },
          error(reason) {
            cancel();
            sink.error(reason);
          },
          next(value) {
            cancel();
            start();
            sink.next(value);
          },
        },
        signal,
      );

      return () => {
        cancel();
        subscription.unsubscribe();
      };
    });
}
