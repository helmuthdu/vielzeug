import type { Observer, Unsubscribe } from './types';

import { warn } from './_dev';

type QueueItem<T> = IteratorResult<T> | { readonly __err: unknown };

/**
 * Upper bound on the internal buffer before values are dropped (oldest first).
 * Protects against unbounded memory growth when a producer emits faster than the
 * `for await` consumer drains the iterator.
 */
const MAX_QUEUE_SIZE = 10_000;

/**
 * Creates an `AsyncIterator<T>` backed by a subscribe function.
 * Buffers incoming values until consumed; cancels the subscription on `return()`.
 * Drops the oldest buffered value (with a one-time dev warning) if the buffer exceeds
 * `MAX_QUEUE_SIZE` — see `MAX_QUEUE_SIZE`.
 * @internal
 */
export function makeAsyncIterator<T>(subscribe: (observer: Observer<T>) => Unsubscribe): AsyncIterableIterator<T> {
  const queue: QueueItem<T>[] = [];
  const pending: Array<{
    reject: (e: unknown) => void;
    resolve: (r: IteratorResult<T>) => void;
  }> = [];
  let done = false;
  let warnedOverflow = false;

  const DONE_RESULT: IteratorResult<T> = { done: true, value: undefined as T };

  const unsub = subscribe({
    complete() {
      done = true;
      drainPending();
    },
    error(err) {
      done = true;

      if (pending.length > 0) {
        pending.shift()!.reject(err);
        drainPending();
      } else {
        queue.push({ __err: err });
      }
    },
    next(v) {
      const item: IteratorResult<T> = { done: false, value: v };

      if (pending.length > 0) {
        pending.shift()!.resolve(item);

        return;
      }

      if (queue.length >= MAX_QUEUE_SIZE) {
        queue.shift();

        if (!warnedOverflow) {
          warnedOverflow = true;
          warn(
            `async iterator buffer exceeded ${MAX_QUEUE_SIZE} queued values — dropping the oldest. ` +
              'The consumer is falling behind the producer; throttle the source or drain the iterator faster.',
          );
        }
      }

      queue.push(item);
    },
  });

  function drainPending(): void {
    while (pending.length > 0) {
      pending.shift()!.resolve(DONE_RESULT);
    }
  }

  const iterator = {
    next(): Promise<IteratorResult<T>> {
      if (queue.length > 0) {
        const item = queue.shift()!;

        if ('__err' in item) return Promise.reject((item as { __err: unknown }).__err);

        return Promise.resolve(item as IteratorResult<T>);
      }

      if (done) return Promise.resolve(DONE_RESULT);

      return new Promise<IteratorResult<T>>((resolve, reject) => pending.push({ reject, resolve }));
    },
    return(): Promise<IteratorResult<T>> {
      if (!done) {
        unsub();
        done = true;
        drainPending();
      }

      return Promise.resolve(DONE_RESULT);
    },
    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
      return iterator;
    },
  };

  return iterator;
}
