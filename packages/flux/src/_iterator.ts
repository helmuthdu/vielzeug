import type { Observer, Unsubscribe } from './types';

type QueueItem<T> = IteratorResult<T> | { readonly __err: unknown };

/**
 * Creates an `AsyncIterator<T>` backed by a subscribe function.
 * Buffers incoming values until consumed; cancels the subscription on `return()`.
 * @internal
 */
export function makeAsyncIterator<T>(subscribe: (observer: Observer<T>) => Unsubscribe): AsyncIterableIterator<T> {
  const queue: QueueItem<T>[] = [];
  const pending: Array<{
    reject: (e: unknown) => void;
    resolve: (r: IteratorResult<T>) => void;
  }> = [];
  let done = false;

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
      } else {
        queue.push(item);
      }
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
