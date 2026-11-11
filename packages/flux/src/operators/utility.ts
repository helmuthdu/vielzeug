import { abortError } from '@vielzeug/arsenal';

import { link } from '../_link.js';
import { assertDuration, assertNonNegativeInteger } from '../_numeric.js';
import { tryCall } from '../_safe.js';
import { stream } from '../core.js';
import { FluxCapacityError, FluxEmptyError } from '../errors.js';
import type { Operator, Stream, Subscription } from '../types.js';

export type RetryOptions = {
  times: number;
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
  assertNonNegativeInteger(options.times, 'retry times');

  return (source) =>
    stream((sink, signal) => {
      let attempts = 0;
      let current: Subscription | undefined;
      let delayId: ReturnType<typeof setTimeout> | undefined;

      const start = (): void => {
        if (signal.aborted) return;

        const subscription = link(
          source,
          {
            complete: sink.complete,
            error(reason) {
              if (attempts === options.times) {
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
                delayId = setTimeout(start, delay);
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
        if (delayId !== undefined) clearTimeout(delayId);
        current?.unsubscribe();
      };
    });
}

/**
 * Wire an external AbortSignal into a terminal consumer promise. Returns the
 * detach function every terminal callback must call, or `null` when the signal
 * was already aborted (the promise has rejected by then).
 */
function watchSignal(
  signal: AbortSignal | undefined,
  controller: AbortController,
  reject: (reason: unknown) => void,
): (() => void) | null {
  if (!signal) return () => {};

  const abort = (): void => {
    controller.abort();
    reject(abortError(signal, 'Stream consumption aborted'));
  };

  if (signal.aborted) {
    abort();

    return null;
  }

  signal.addEventListener('abort', abort, { once: true });

  return () => signal.removeEventListener('abort', abort);
}

export function first<T>(source: Stream<T>, options?: ValueOptions<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    const detach = watchSignal(options?.signal, controller, reject);
    if (!detach) return;

    link(
      source,
      {
        complete() {
          detach();

          if ('defaultValue' in (options ?? {})) resolve(options!.defaultValue as T);
          else reject(new FluxEmptyError());
        },
        error(reason) {
          detach();
          reject(reason);
        },
        next(value) {
          detach();
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
    const detach = watchSignal(options?.signal, controller, reject);
    if (!detach) return;

    let emitted = false;
    let latest: T | undefined;

    link(
      source,
      {
        complete() {
          detach();

          if (emitted) resolve(latest as T);
          else if ('defaultValue' in (options ?? {})) resolve(options!.defaultValue as T);
          else reject(new FluxEmptyError());
        },
        error(reason) {
          detach();
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
    const detach = watchSignal(options.signal, controller, reject);
    if (!detach) return;

    link(
      source,
      {
        complete() {
          detach();
          resolve(values);
        },
        error(reason) {
          detach();
          reject(reason);
        },
        next(value) {
          if (values.length === options.maxItems) {
            detach();
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
