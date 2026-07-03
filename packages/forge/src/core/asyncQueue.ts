/**
 * A minimal push-based async queue exposing an `AsyncIterableIterator`.
 * Shared by `validateStream()` and `form[Symbol.asyncIterator]()`, which otherwise hand-roll
 * near-identical `queue`/`waitingResolve`/`done` plumbing.
 *
 * - `push()` delivers an item to a waiting `next()` call, or buffers it for the next one.
 * - `finish()` marks the queue complete; any items already buffered are still drained by
 *   subsequent `next()` calls before `{ done: true }` is returned.
 * - `fail()` marks the queue complete and rejects the next `next()` call with `err`.
 * - Calling `iterator.return()` (e.g. via `for-await...of` `break`) hard-terminates the queue:
 *   any buffered-but-undelivered items are discarded and `onTerminate` fires.
 */
export type AsyncQueue<T> = {
  fail(err: unknown): void;
  finish(): void;
  iterator: AsyncIterableIterator<T>;
  push(item: T): void;
  /** Hard-terminates the queue: drops any buffered items, marks it done, and fires `onTerminate`. */
  terminate(): void;
};

export function createAsyncQueue<T>(onTerminate?: () => void): AsyncQueue<T> {
  type Resolver = (result: IteratorResult<T, undefined>) => void;
  type Rejecter = (err: unknown) => void;

  let buffer: T[] = [];
  let waitingResolve: Resolver | null = null;
  let waitingReject: Rejecter | null = null;
  let done = false;
  let pendingError: { err: unknown } | null = null;

  function push(item: T): void {
    if (done) return;

    if (waitingResolve) {
      const resolve = waitingResolve;

      waitingResolve = null;
      waitingReject = null;
      resolve({ done: false, value: item });
    } else {
      buffer.push(item);
    }
  }

  function fail(err: unknown): void {
    if (done) return;

    done = true;

    if (waitingReject) {
      const reject = waitingReject;

      waitingResolve = null;
      waitingReject = null;
      reject(err);
    } else {
      pendingError = { err };
    }
  }

  function finish(): void {
    if (done) return;

    done = true;

    if (waitingResolve) {
      const resolve = waitingResolve;

      waitingResolve = null;
      waitingReject = null;
      resolve({ done: true, value: undefined });
    }
  }

  function terminate(): void {
    if (done) return;

    buffer = [];
    finish();
    onTerminate?.();
  }

  const iterator: AsyncIterableIterator<T> = {
    next(): Promise<IteratorResult<T, undefined>> {
      if (pendingError) {
        const { err } = pendingError;

        pendingError = null;

        return Promise.reject(err);
      }

      if (buffer.length > 0) return Promise.resolve({ done: false, value: buffer.shift()! });

      if (done) return Promise.resolve({ done: true, value: undefined });

      return new Promise<IteratorResult<T, undefined>>((resolve, reject) => {
        waitingResolve = resolve;
        waitingReject = reject;
      });
    },

    return(): Promise<IteratorResult<T, undefined>> {
      terminate();

      return Promise.resolve({ done: true, value: undefined });
    },

    [Symbol.asyncIterator]() {
      return this;
    },
  };

  return { fail, finish, iterator, push, terminate };
}
