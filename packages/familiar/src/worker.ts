export type {
  BatchOptions,
  DrainOptions,
  RunOptions,
  StreamWorkerPool,
  TaskGroup,
  TaskGroupOptions,
  WorkerOptions,
  WorkerPool,
  WorkerStats,
  WorkerStatus,
} from './types';
export {
  FamiliarError,
  FamiliarInvalidOptionsError,
  FamiliarQueueFullError,
  FamiliarRuntimeError,
  FamiliarTaskError,
  FamiliarTerminatedError,
  FamiliarTimeoutError,
} from './errors';
export { batch, createTaskGroup } from './_pool';

import type { SerializedError, WorkerResponse } from './protocol';
import type { RunOptions, SlotStrategy, StreamWorkerPool, WorkerOptions, WorkerPool } from './types';

import { createPool } from './_pool';
import { createStreamPool, type StreamSlot } from './_stream-pool';
import { unrefTimer } from './_timers';
import {
  FamiliarInvalidOptionsError,
  FamiliarRuntimeError,
  FamiliarTaskError,
  FamiliarTerminatedError,
  FamiliarTimeoutError,
} from './errors';
import { PROTOCOL_VERSION } from './protocol';

const MAX_CONCURRENCY = 512;

type ResolvedOptions = {
  concurrency: number;
  maxQueue: number | undefined;
  onFull: 'reject' | 'wait';
  onSlotError: WorkerOptions['onSlotError'];
  timeout: number | undefined;
};

type Pending<TOutput> = {
  emit?: (value: TOutput) => void;
  id: number;
  reject: (reason: unknown) => void;
  resolve: (value: TOutput) => void;
  timer?: ReturnType<typeof setTimeout>;
};

export type RunningStream<TChunk> = {
  done: Promise<void>;
  iterable: AsyncIterable<TChunk>;
};

function resolveOptions(options: WorkerOptions = {}): ResolvedOptions {
  const { concurrency = 1, maxQueue, onFull = 'reject', onSlotError, timeout } = options;
  const resolvedConcurrency =
    concurrency === 'auto' ? Math.max(1, globalThis.navigator?.hardwareConcurrency ?? 1) : concurrency;

  if (!Number.isInteger(resolvedConcurrency) || resolvedConcurrency < 1 || resolvedConcurrency > MAX_CONCURRENCY) {
    throw new FamiliarInvalidOptionsError(`\`concurrency\` must be a positive integer ≤ ${MAX_CONCURRENCY} or "auto"`);
  }

  if (maxQueue !== undefined && (!Number.isInteger(maxQueue) || maxQueue < 1)) {
    throw new FamiliarInvalidOptionsError('`maxQueue` must be a positive integer');
  }

  if (timeout !== undefined && (!Number.isFinite(timeout) || timeout <= 0)) {
    throw new FamiliarInvalidOptionsError('`timeout` must be a finite number greater than 0');
  }

  return { concurrency: resolvedConcurrency, maxQueue, onFull, onSlotError, timeout };
}

function isWorkerResponse<TOutput>(value: unknown): value is WorkerResponse<TOutput> {
  if (typeof value !== 'object' || value === null) return false;

  const response = value as Partial<WorkerResponse<TOutput>>;

  return (
    response.version === PROTOCOL_VERSION &&
    typeof response.id === 'number' &&
    (response.kind === 'chunk' || response.kind === 'error' || response.kind === 'result')
  );
}

function taskError(error: SerializedError): FamiliarTaskError {
  const cause = new Error(error.message);

  cause.name = error.name;
  cause.stack = error.stack;

  return new FamiliarTaskError(error.message, { cause });
}

class Slot<TInput, TOutput> implements SlotStrategy<TInput, TOutput>, StreamSlot<TInput, TOutput> {
  readonly #onSlotError: WorkerOptions['onSlotError'];
  readonly #url: URL | string;
  #disposed = false;
  #pending: Pending<TOutput> | undefined;
  #taskId = 0;
  #worker: Worker | undefined;

  constructor(url: URL | string, onSlotError: WorkerOptions['onSlotError']) {
    this.#url = url;
    this.#onSlotError = onSlotError;
  }

  cancel(reason: unknown): void {
    this.#worker?.terminate();
    this.#worker = undefined;
    this.#settlePending('reject', reason);
  }

  prime(): Promise<void> {
    if (!this.#disposed) this.#ensureWorker();

    return Promise.resolve();
  }

  run(input: TInput, transferables: Transferable[], timeout: number | undefined): Promise<TOutput> {
    return this.#dispatch(input, transferables, timeout, 'run') as Promise<TOutput>;
  }

  stream(input: TInput, options: RunOptions): RunningStream<TOutput> {
    const stop = () => this.cancel(new FamiliarTerminatedError('Stream consumer stopped'));
    const chunks: TOutput[] = [];
    const waiters: Array<(result: IteratorResult<TOutput>) => void> = [];
    let done = false;
    let error: unknown;
    const emit = (value: TOutput) => {
      const waiter = waiters.shift();

      if (waiter) waiter({ done: false, value });
      else chunks.push(value);
    };
    const finish = (reason?: unknown) => {
      done = true;
      error = reason;

      while (waiters.length > 0) {
        const waiter = waiters.shift()!;

        if (reason !== undefined) waiter(Promise.reject(reason) as never);
        else waiter({ done: true, value: undefined as never });
      }
    };
    const donePromise = this.#dispatch(input, options.transferables ?? [], options.timeout, 'stream', emit).then(
      () => finish(),
      (reason: unknown) => finish(reason),
    );

    return {
      done: donePromise,
      iterable: {
        [Symbol.asyncIterator]: () => ({
          async next(): Promise<IteratorResult<TOutput>> {
            if (chunks.length > 0) return { done: false, value: chunks.shift()! };

            if (error !== undefined) throw error;

            if (done) return { done: true, value: undefined as never };

            return new Promise<IteratorResult<TOutput>>((resolve, reject) => {
              waiters.push((result) => {
                if (result instanceof Promise) void result.then(resolve, reject);
                else resolve(result);
              });
            });
          },
          async return(): Promise<IteratorResult<TOutput>> {
            stop();

            return { done: true, value: undefined as never };
          },
        }),
      },
    };
  }

  terminate(): void {
    this.#disposed = true;
    this.cancel(new FamiliarTerminatedError());
  }

  #dispatch(
    input: TInput,
    transferables: Transferable[],
    timeout: number | undefined,
    kind: 'run' | 'stream',
    emit?: (value: TOutput) => void,
  ): Promise<TOutput> {
    if (this.#disposed) return Promise.reject(new FamiliarTerminatedError());

    if (this.#pending) return Promise.reject(new FamiliarRuntimeError('Worker slot is already busy'));

    try {
      const worker = this.#ensureWorker();
      const id = this.#taskId++;

      return new Promise<TOutput>((resolve, reject) => {
        const pending: Pending<TOutput> = { emit, id, reject, resolve };

        this.#pending = pending;

        if (timeout !== undefined) {
          pending.timer = setTimeout(() => this.cancel(new FamiliarTimeoutError(timeout)), timeout);
          unrefTimer(pending.timer);
        }

        try {
          worker.postMessage({ id, input, kind, version: PROTOCOL_VERSION }, transferables);
        } catch (error) {
          this.cancel(new FamiliarRuntimeError('Failed to post message to worker', { cause: error }));
        }
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  #ensureWorker(): Worker {
    if (this.#worker) return this.#worker;

    if (typeof Worker === 'undefined') throw new FamiliarRuntimeError('Worker API is unavailable in this runtime');

    try {
      const worker = new Worker(this.#url, { type: 'module' });

      worker.onmessage = (event: MessageEvent<unknown>) => this.#onMessage(event.data);
      worker.onerror = (event) => {
        const error = new FamiliarRuntimeError(event.message || 'Worker failed');

        this.#worker = undefined;
        this.#onSlotError?.(error);
        this.#settlePending('reject', error);
      };
      this.#worker = worker;

      return worker;
    } catch (error) {
      throw new FamiliarRuntimeError('Failed to create Worker', { cause: error });
    }
  }

  #onMessage(message: unknown): void {
    if (!this.#pending) return;

    if (!isWorkerResponse<TOutput>(message) || message.id !== this.#pending.id) {
      this.cancel(new FamiliarRuntimeError('Worker returned an incompatible protocol response'));

      return;
    }

    if (message.kind === 'chunk') {
      this.#pending.emit?.(message.value);

      return;
    }

    if (message.kind === 'error') {
      this.#settlePending('reject', taskError(message.error));

      return;
    }

    this.#settlePending('resolve', message.value);
  }

  #settlePending(kind: 'resolve' | 'reject', value: unknown): void {
    const pending = this.#pending;

    if (!pending) return;

    this.#pending = undefined;

    if (pending.timer) clearTimeout(pending.timer);

    if (kind === 'resolve') pending.resolve(value as TOutput);
    else pending.reject(value);
  }
}

function slots<TInput, TOutput>(url: URL | string, options: ResolvedOptions): Slot<TInput, TOutput>[] {
  return Array.from({ length: options.concurrency }, () => new Slot<TInput, TOutput>(url, options.onSlotError));
}

/** Create a pool backed by an ES module worker registered with exposeTask(). */
export function createWorker<TInput, TOutput>(
  url: URL | string,
  options: WorkerOptions = {},
): WorkerPool<TInput, TOutput> {
  const resolved = resolveOptions(options);

  return createPool(slots<TInput, TOutput>(url, resolved), {
    concurrency: resolved.concurrency,
    defaultTimeout: resolved.timeout,
    maxQueue: resolved.maxQueue,
    onFull: resolved.onFull,
  });
}

/** Create a stream-only pool backed by an ES module worker registered with exposeStream(). */
export function createStreamWorker<TInput, TChunk>(
  url: URL | string,
  options: WorkerOptions = {},
): StreamWorkerPool<TInput, TChunk> {
  const resolved = resolveOptions(options);

  return createStreamPool(slots<TInput, TChunk>(url, resolved), {
    concurrency: resolved.concurrency,
    defaultTimeout: resolved.timeout,
    maxQueue: resolved.maxQueue,
    onFull: resolved.onFull,
  });
}
