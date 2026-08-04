import type { Operator, Stream, Subscription } from '../types';

import { link } from '../_link';
import { tryCall } from '../_safe';
import { defaultScheduler } from '../_scheduler';
import { stream } from '../core';

export type RetryOptions = {
  attempts: number;
  delay?: number | ((attempt: number) => number);
};

export type ToArrayOptions = {
  maxItems: number;
  signal?: AbortSignal;
};

export type ValueOptions = {
  signal?: AbortSignal;
};

function abortError(): DOMException {
  return new DOMException('Stream consumption aborted', 'AbortError');
}

export function retry<T>(options: RetryOptions): Operator<T, T> {
  if (!Number.isInteger(options.attempts) || options.attempts < 0) {
    throw new RangeError('retry attempts must be a non-negative integer');
  }

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

              if (delay !== undefined && (!Number.isFinite(delay) || delay < 0)) {
                sink.error(new RangeError('retry delay must be a finite number greater than or equal to zero'));

                return;
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

export function first<T>(source: Stream<T>, options?: ValueOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    const abort = (): void => {
      controller.abort();
      reject(abortError());
    };

    if (options?.signal?.aborted) {
      abort();

      return;
    }

    options?.signal?.addEventListener('abort', abort, { once: true });
    link(
      source,
      {
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

export function last<T>(source: Stream<T>, options?: ValueOptions): Promise<T | undefined> {
  return new Promise<T | undefined>((resolve, reject) => {
    const abort = (): void => reject(abortError());
    let latest: T | undefined;

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
          resolve(latest);
        },
        error(reason) {
          options?.signal?.removeEventListener('abort', abort);
          reject(reason);
        },
        next(value) {
          latest = value;
        },
      },
      options?.signal ?? new AbortController().signal,
    );
  });
}

export function toArray<T>(source: Stream<T>, options: ToArrayOptions): Promise<T[]> {
  if (!Number.isInteger(options.maxItems) || options.maxItems < 0) {
    throw new RangeError('toArray maxItems must be a non-negative integer');
  }

  return new Promise<T[]>((resolve, reject) => {
    const controller = new AbortController();
    const values: T[] = [];
    const abort = (): void => {
      controller.abort();
      reject(abortError());
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
            reject(new RangeError('toArray maxItems exceeded'));

            return;
          }

          values.push(value);
        },
      },
      controller.signal,
    );
  });
}
