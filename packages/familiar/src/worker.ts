// Re-export all public types from _types so consumers only need one import.
export type {
  BatchOptions,
  RunOptions,
  TaskFn,
  TaskGroup,
  WorkerErrorCode,
  WorkerHandle,
  WorkerOptions,
  WorkerStatus,
} from './_types';
export { WorkerError } from './_types';

import type { TaskFn, WorkerHandle, WorkerOptions } from './_types';

import { type Executor, type PoolOptions, createPool } from './_pool';
import { WorkerError } from './_types';

// ─── Options resolution ───────────────────────────────────────────────────────

function resolveConcurrency(value: WorkerOptions['concurrency']): number {
  if (value === undefined) return 1;

  if (value === 'auto') {
    return Math.max(1, globalThis.navigator?.hardwareConcurrency ?? 1);
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new WorkerError('invalid_options', '`concurrency` must be a positive integer or "auto"');
  }

  return value;
}

function resolveOptions(options: WorkerOptions = {}): {
  concurrency: number;
  maxQueue: number | undefined;
  onFull: 'reject' | 'wait';
  timeout: number | undefined;
} {
  const concurrency = resolveConcurrency(options.concurrency);
  const { maxQueue, onFull = 'reject', timeout } = options;

  if (timeout !== undefined && (!Number.isFinite(timeout) || timeout <= 0)) {
    throw new WorkerError('invalid_options', '`timeout` must be a finite number greater than 0');
  }

  if (maxQueue !== undefined && (!Number.isInteger(maxQueue) || maxQueue < 1)) {
    throw new WorkerError('invalid_options', '`maxQueue` must be a positive integer');
  }

  return { concurrency, maxQueue, onFull, timeout };
}

// ─── Error serialization protocol ────────────────────────────────────────────
// Shared between the worker-side script embedded in buildWorkerScript() and the
// host-side deserialization in Slot. Keeping them together prevents drift.

type SerializedError = { message: string; name: string; stack?: string };

function deserializeError(e: SerializedError): Error {
  const err = new Error(e.message);

  err.name = e.name;

  if (e.stack) err.stack = e.stack;

  return err;
}

// ─── Task slot (standard fn serialization) ───────────────────────────────────

type SlotMessage<TOutput> =
  | { error: SerializedError; id: number }
  | { id: number; result: TOutput }
  | { chunk: TOutput; id: number };

type PendingTask<TOutput> = {
  /** Emits intermediate stream chunks. Undefined for non-streaming tasks. */
  emit?: (chunk: TOutput) => void;
  id: number;
  reject: (reason: unknown) => void;
  resolve: (value: TOutput) => void;
  timer?: ReturnType<typeof setTimeout>;
};

function buildWorkerScript(fn: TaskFn<unknown, unknown>): string {
  return `
const __fn = (${fn.toString()});
const __serialize = (e) => {
  const err = e instanceof Error ? e : new Error(String(e));
  return { name: err.name, message: err.message, stack: err.stack };
};

self.onmessage = async function (event) {
  const { id, input, stream } = event.data;
  try {
    if (stream) {
      // Streaming mode: fn must return an async iterable or array.
      const iterable = await __fn(input);
      for await (const chunk of iterable) {
        self.postMessage({ id, chunk });
      }
      self.postMessage({ id, result: undefined });
    } else {
      const result = await __fn(input);
      self.postMessage({ id, result });
    }
  } catch (error) {
    self.postMessage({ id, error: __serialize(error) });
  }
};`.trim();
}

class Slot<TInput, TOutput> {
  private disposed = false;
  private pending: PendingTask<TOutput> | null = null;
  private taskId = 0;
  private worker: Worker | null = null;
  private readonly fn: TaskFn<TInput, TOutput>;
  private readonly scriptUrl: string | undefined;

  constructor(fn: TaskFn<TInput, TOutput>);
  constructor(fn: TaskFn<TInput, TOutput>, scriptUrl: string);
  constructor(fn: TaskFn<TInput, TOutput>, scriptUrl?: string) {
    this.fn = fn;
    this.scriptUrl = scriptUrl;
  }

  prime(): Promise<void> {
    if (this.disposed) return Promise.resolve();

    try {
      this.ensureWorker();
    } catch {
      // Best-effort — errors surface on the first run() call.
    }

    return Promise.resolve();
  }

  run(input: TInput, transferables: Transferable[], timeout: number | undefined): Promise<TOutput> {
    return this.dispatch(input, transferables, timeout, false) as Promise<TOutput>;
  }

  runStream(input: TInput, transferables: Transferable[], timeout: number | undefined): AsyncIterable<TOutput> {
    const chunks: TOutput[] = [];
    let done = false;
    let error: unknown;
    const waiters: Array<() => void> = [];

    const emit = (chunk: TOutput) => {
      chunks.push(chunk);
      waiters.shift()?.();
    };

    const finish = (err?: unknown) => {
      done = true;
      error = err;
      for (const w of waiters.splice(0)) w();
    };

    // Dispatch the task in stream mode. The promise resolves when the worker signals done.
    this.dispatch(input, transferables, timeout, true, emit).then(() => finish(), finish);

    return {
      [Symbol.asyncIterator]() {
        let cursor = 0;

        return {
          async next(): Promise<IteratorResult<TOutput>> {
            while (cursor >= chunks.length && !done) {
              await new Promise<void>((resolve) => waiters.push(resolve));
            }

            if (cursor < chunks.length) {
              return { done: false, value: chunks[cursor++]! };
            }

            if (error !== undefined) throw error;

            return { done: true, value: undefined as unknown as TOutput };
          },
        };
      },
    };
  }

  terminate(): void {
    this.disposed = true;
    this.stopWorker();
    this.failPending(new WorkerError('terminated', 'Worker was terminated'));
  }

  private dispatch(
    input: TInput,
    transferables: Transferable[],
    timeout: number | undefined,
    stream: boolean,
    emit?: (chunk: TOutput) => void,
  ): Promise<TOutput | void> {
    if (this.disposed) {
      return Promise.reject(new WorkerError('terminated', 'Worker was terminated'));
    }

    let worker: Worker;

    try {
      worker = this.ensureWorker();
    } catch (error) {
      return Promise.reject(error);
    }

    return new Promise<TOutput | void>((resolve, reject) => {
      const id = this.taskId++;
      const pending: PendingTask<TOutput> = { emit, id, reject, resolve: resolve as (v: TOutput) => void };

      if (timeout !== undefined) {
        pending.timer = setTimeout(() => {
          this.restart(new WorkerError('timeout', `Task timed out after ${timeout}ms`));
        }, timeout);
      }

      this.pending = pending;

      try {
        worker.postMessage({ id, input, stream }, transferables);
      } catch (err) {
        this.failPending(new WorkerError('worker', err instanceof Error ? err.message : String(err), err));
      }
    });
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    if (typeof globalThis.Worker !== 'function') {
      throw new WorkerError('worker', 'Worker API is unavailable in this runtime');
    }

    let worker: Worker;

    if (this.scriptUrl) {
      // Module worker — the URL points to a real worker module file.
      try {
        worker = new Worker(this.scriptUrl, { type: 'module' });
      } catch (error) {
        throw new WorkerError('worker', 'Failed to create Worker', error);
      }
    } else {
      const source = this.fn.toString();

      if (source.includes('[native code]')) {
        throw new WorkerError('invalid_options', 'Task function cannot be a bound or native function');
      }

      try {
        const blob = new Blob([buildWorkerScript(this.fn as TaskFn<unknown, unknown>)], {
          type: 'application/javascript',
        });
        const url = URL.createObjectURL(blob);

        try {
          worker = new Worker(url);
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        throw new WorkerError('worker', 'Failed to create Worker', error);
      }
    }

    worker.onmessage = (event: MessageEvent<SlotMessage<TOutput>>) => {
      const pending = this.pending;

      if (!pending || event.data.id !== pending.id) return;

      if ('chunk' in event.data) {
        pending.emit?.(event.data.chunk);

        return;
      }

      clearTimeout(pending.timer);
      this.pending = null;

      if ('error' in event.data) {
        pending.reject(new WorkerError('task', event.data.error.message, deserializeError(event.data.error)));
      } else {
        pending.resolve(event.data.result);
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      this.restart(new WorkerError('worker', event.message));
    };

    this.worker = worker;

    return worker;
  }

  private failPending(reason: unknown): void {
    const pending = this.pending;

    if (!pending) return;

    clearTimeout(pending.timer);
    this.pending = null;
    pending.reject(reason);
  }

  private restart(reason: unknown): void {
    this.stopWorker();
    this.failPending(reason);
  }

  private stopWorker(): void {
    if (!this.worker) return;

    this.worker.terminate();
    this.worker = null;
  }
}

// ─── Shared factory ───────────────────────────────────────────────────────────

function buildHandle<TInput, TOutput>(
  slots: Slot<TInput, TOutput>[],
  poolOptions: PoolOptions,
): WorkerHandle<TInput, TOutput> {
  const freeSlots = [...slots];

  const executor: Executor<TInput, TOutput> = (input, transferables, taskTimeout) => {
    const slot = freeSlots.pop()!;

    return slot.run(input, transferables, taskTimeout).finally(() => {
      freeSlots.push(slot);
    });
  };

  const pool = createPool(executor, {
    ...poolOptions,
    prime: () => Promise.all(slots.map((s) => s.prime())).then(() => {}),
  });

  // Override runStream with a real implementation using the free-slot stack.
  const runStream = (
    input: TInput,
    options: Omit<import('./_types').RunOptions, 'signal'> = {},
  ): AsyncIterable<TOutput> => {
    if (pool.status === 'terminated') {
      return {
        [Symbol.asyncIterator]() {
          return {
            next: () => Promise.reject(new WorkerError('terminated', 'Worker was terminated')),
          };
        },
      };
    }

    const slot = freeSlots.pop();

    if (!slot) {
      // No free slot — fail fast for streaming (no queue support for runStream).
      return {
        [Symbol.asyncIterator]() {
          return {
            next: () => Promise.reject(new WorkerError('queue_full', 'No free slots available for runStream()')),
          };
        },
      };
    }

    const { timeout, transferables = [] } = options;
    const iter = slot.runStream(input, transferables, timeout);

    return {
      [Symbol.asyncIterator]() {
        const inner = iter[Symbol.asyncIterator]();

        return {
          async next() {
            const result = await inner.next();

            if (result.done) freeSlots.push(slot!);

            return result;
          },
        };
      },
    };
  };

  return Object.assign(pool, { runStream });
}

// ─── createWorker ─────────────────────────────────────────────────────────────

/**
 * Creates a pool of Web Workers that run `fn` in parallel.
 *
 * IMPORTANT: The task function is serialized via `.toString()` and runs in a separate global
 * scope. It cannot close over variables from the surrounding module.
 *
 * For workers that need imports, see `createModuleWorker`.
 */
export function createWorker<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
  options?: WorkerOptions,
): WorkerHandle<TInput, TOutput> {
  const { concurrency, maxQueue, onFull, timeout } = resolveOptions(options);

  const slots = Array.from({ length: concurrency }, () => new Slot<TInput, TOutput>(fn));

  return buildHandle(slots, {
    concurrency,
    defaultTimeout: timeout,
    maxQueue,
    onDispose: () => {
      for (const slot of slots) slot.terminate();
    },
    onFull,
  });
}

// ─── createModuleWorker ───────────────────────────────────────────────────────

/**
 * Creates a pool of module-type Web Workers loaded from a real URL.
 *
 * Unlike `createWorker`, the worker file is a regular module — it can import
 * utilities, use top-level await, and reference module scope. The worker module
 * must handle the standard `{ id, input }` message protocol.
 *
 * @example
 * ```ts
 * // my-worker.ts (the worker file)
 * self.onmessage = async (event) => {
 *   const { id, input } = event.data;
 *   try {
 *     self.postMessage({ id, result: await process(input) });
 *   } catch (e) {
 *     const err = e instanceof Error ? e : new Error(String(e));
 *     self.postMessage({ id, error: { name: err.name, message: err.message, stack: err.stack } });
 *   }
 * };
 *
 * // main.ts
 * const pool = createModuleWorker<number, number>(
 *   new URL('./my-worker.ts', import.meta.url),
 *   { concurrency: 4 },
 * );
 * ```
 */
export function createModuleWorker<TInput, TOutput>(
  url: URL | string,
  options?: WorkerOptions,
): WorkerHandle<TInput, TOutput> {
  const { concurrency, maxQueue, onFull, timeout } = resolveOptions(options);
  const href = typeof url === 'string' ? url : url.href;

  // Placeholder fn — never called directly since Slot uses scriptUrl path.
  const noop = (() => {}) as unknown as TaskFn<TInput, TOutput>;
  const slots = Array.from({ length: concurrency }, () => new Slot<TInput, TOutput>(noop, href));

  return buildHandle(slots, {
    concurrency,
    defaultTimeout: timeout,
    maxQueue,
    onDispose: () => {
      for (const slot of slots) slot.terminate();
    },
    onFull,
  });
}
