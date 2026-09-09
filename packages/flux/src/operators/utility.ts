import { abortError } from '@vielzeug/arsenal';

import { link } from '../_link.js';
import { assertDuration, assertNonNegativeInteger } from '../_numeric.js';
import { tryCall } from '../_safe.js';
import { defaultScheduler } from '../_scheduler.js';
import { stream } from '../core.js';
import { FluxCapacityError, FluxEmptyError } from '../errors.js';
import type { Operator, Stream, Subscription } from '../types.js';

export type RetryOptions = {
  attempts: number;
  delay?: number | ((attempt: number) => number);
};

export type ToArrayOptions = {
  maxItems: number;
  signal?: AbortSignal;
};

export type ValueOptions<T> = {
  signal?: AbortSignal;
  /** Resolved when the source completes empty instead of rejecting with `FluxEmptyError`. */
  defaultValue?: T;
};

export function retry<T>(options: RetryOptions): Operator<T, T> {
  assertNonNegativeInteger(options.attempts, 'retry attempts');

  return (source) =>
    stream((sink, signal) => {
      let attempts = 0;
      let current: Subscription | undefined;
      let cancelDelay: (() => void) | undefined;

      const start = (): void => {
        if (signal.aborted) return;

        const subscription = link(
          source,
          {
            complete: sink.complete,
            error(reason) {
              if (attempts === options.attempts) {
                sink.error(reason);

                return;
              }

              const attempt = attempts++;
              let delay: number | undefined;

              tryCall(() => {
                delay = typeof options.delay === 'function' ? options.delay(attempt) : options.delay;
              }, sink.error);

              if (signal.aborted) return;

              if (delay !== undefined) {
                try {
                  assertDuration(delay, 'Retry delay');
                } catch (reason) {
                  sink.error(reason);
                  return;
                }
              }

              if (delay === undefined || delay === 0) {
                queueMicrotask(start);
              } else {
                cancelDelay = defaultScheduler.delay(start, delay);
              }
            },
            next: sink.next,
          },
          signal,
        );

        if (!subscription.closed) current = subscription;
      };

      start();

      return () => {
        cancelDelay?.();
        current?.unsubscribe();
      };
    });
}

export function first<T>(source: Stream<T>, options?: ValueOptions<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    const abort = (): void => {
      controller.abort();
      reject(abortError(options?.signal, 'Stream consumption aborted'));
    };

    if (options?.signal?.aborted) {
      abort();

      return;
    }

    options?.signal?.addEventListener('abort', abort, { once: true });
    link(
      source,
      {
        complete() {
          options?.signal?.removeEventListener('abort', abort);

          if ('defaultValue' in (options ?? {})) resolve(options!.defaultValue as T);
          else reject(new FluxEmptyError());
        },
        error(reason) {
          options?.signal?.removeEventListener('abort', abort);
          reject(reason);
        },
        next(value) {
          options?.signal?.removeEventListener('abort', abort);
          controller.abort();
          resolve(value);
        },
      },
      controller.signal,
    );
  });
}

export function last<T>(source: Stream<T>, options?: ValueOptions<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    const abort = (): void => {
      controller.abort();
      reject(abortError(options?.signal, 'Stream consumption aborted'));
    };

    if (options?.signal?.aborted) {
      abort();

      return;
    }

    let emitted = false;
    let latest: T | undefined;

    options?.signal?.addEventListener('abort', abort, { once: true });
    link(
      source,
      {
        complete() {
          options?.signal?.removeEventListener('abort', abort);

          if (emitted) resolve(latest as T);
          else if ('defaultValue' in (options ?? {})) resolve(options!.defaultValue as T);
          else reject(new FluxEmptyError());
        },
        error(reason) {
          options?.signal?.removeEventListener('abort', abort);
          reject(reason);
        },
        next(value) {
          emitted = true;
          latest = value;
        },
      },
      controller.signal,
    );
  });
}

export function toArray<T>(source: Stream<T>, options: ToArrayOptions): Promise<T[]> {
  assertNonNegativeInteger(options.maxItems, 'toArray maxItems');

  return new Promise<T[]>((resolve, reject) => {
    const controller = new AbortController();
    const values: T[] = [];
    const abort = (): void => {
      controller.abort();
      reject(abortError(options?.signal, 'Stream consumption aborted'));
    };

    if (options.signal?.aborted) {
      abort();

      return;
    }

    options.signal?.addEventListener('abort', abort, { once: true });
    link(
      source,
      {
        complete() {
          options.signal?.removeEventListener('abort', abort);
          resolve(values);
        },
        error(reason) {
          options.signal?.removeEventListener('abort', abort);
          reject(reason);
        },
        next(value) {
          if (values.length === options.maxItems) {
            options.signal?.removeEventListener('abort', abort);
            controller.abort();
            reject(new FluxCapacityError(options.maxItems, 'toArray maxItems exceeded'));

            return;
          }

          values.push(value);
        },
      },
      controller.signal,
    );
  });
}
