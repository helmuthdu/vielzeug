import type { AsyncIterableOptions, Observer, Stream } from './types';

type Pending<T> = {
  reject(reason: unknown): void;
  resolve(result: IteratorResult<T>): void;
};

type IteratorState<T> =
  { kind: 'complete' | 'open'; queue: T[] } | { kind: 'error'; queue: T[]; reason: unknown } | { kind: 'returned' };

function assertOptions(options: AsyncIterableOptions): void {
  if (!Number.isInteger(options.capacity) || options.capacity < 1) {
    throw new RangeError('Async iterable capacity must be a positive integer');
  }
}

/** Async iteration requires explicit queue policy because streams are push based. */
export function toIterator<T>(source: Stream<T>, options: AsyncIterableOptions): AsyncIterableIterator<T> {
  assertOptions(options);

  const controller = new AbortController();
  const pending: Pending<T>[] = [];
  let state: IteratorState<T> = { kind: 'open', queue: [] };

  const detach = (): void => options.signal?.removeEventListener('abort', stop);

  const resolveDone = (): void => {
    while (pending.length > 0) pending.shift()!.resolve({ done: true, value: undefined as T });
  };

  const complete = (): void => {
    if (state.kind !== 'open') return;

    state.kind = 'complete';
    detach();
    resolveDone();
  };

  const fail = (reason: unknown): void => {
    if (state.kind !== 'open') return;

    state = { kind: 'error', queue: state.queue, reason };
    controller.abort();
    detach();

    while (pending.length > 0) pending.shift()!.reject(reason);
  };

  const stop = (): void => {
    controller.abort();
    detach();
    state = { kind: 'returned' };
    resolveDone();
  };

  const observer: Observer<T> = {
    complete,
    error: fail,
    next(value) {
      if (state.kind !== 'open') return;

      const waiter = pending.shift();

      if (waiter) {
        waiter.resolve({ done: false, value });

        return;
      }

      if (state.queue.length < options.capacity) {
        state.queue.push(value);

        return;
      }

      if (options.overflow === 'drop-oldest') {
        state.queue.shift();
        state.queue.push(value);
      } else if (options.overflow === 'error') {
        fail(new RangeError('Async iterable buffer capacity exceeded'));
      }
    },
  };

  if (options.signal?.aborted) stop();
  else options.signal?.addEventListener('abort', stop, { once: true });

  source.subscribe(observer, { signal: controller.signal });

  return {
    next(): Promise<IteratorResult<T>> {
      if (state.kind === 'returned') return Promise.resolve({ done: true, value: undefined as T });

      if (state.queue.length > 0) return Promise.resolve({ done: false, value: state.queue.shift()! });

      if (state.kind === 'error') return Promise.reject(state.reason);

      if (state.kind === 'complete') return Promise.resolve({ done: true, value: undefined as T });

      return new Promise<IteratorResult<T>>((resolve, reject) => pending.push({ reject, resolve }));
    },
    return(): Promise<IteratorResult<T>> {
      stop();

      return Promise.resolve({ done: true, value: undefined as T });
    },
    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
      return this;
    },
  };
}
