// Re-export all public types and classes so consumers only need one import.
export type {
  BatchOptions,
  GroupableWorker,
  PrimableWorker,
  RunOptions,
  StreamingWorker,
  TaskFn,
  TaskGroup,
  Transfer,
  WorkerErrorCode,
  WorkerHandle,
  WorkerMetrics,
  WorkerOptions,
  WorkerPool,
  WorkerStatus,
} from './_types';
export {
  PROTOCOL_VERSION,
  WorkerError,
  WorkerInvalidOptionsError,
  WorkerQueueFullError,
  WorkerRuntimeError,
  WorkerTaskError,
  WorkerTerminatedError,
  WorkerTimeoutError,
} from './_types';

import type { RunOptions, TaskFn, WorkerHandle, WorkerOptions } from './_types';

import { createPool, type Executor, type PoolOptions } from './_pool';
import {
  PROTOCOL_VERSION,
  WorkerInvalidOptionsError,
  WorkerRuntimeError,
  WorkerTaskError,
  WorkerTerminatedError,
  WorkerTimeoutError,
} from './_types';

// ─── Options resolution ───────────────────────────────────────────────────────

function resolveConcurrency(value: WorkerOptions['concurrency']): number {
  if (value === undefined) return 1;

  if (value === 'auto') {
    return Math.max(1, globalThis.navigator?.hardwareConcurrency ?? 1);
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new WorkerInvalidOptionsError('`concurrency` must be a positive integer or "auto"');
  }

  return value;
}

function resolveOptions(options: WorkerOptions = {}): {
  concurrency: number;
  maxQueue: number | undefined;
  onFull: 'reject' | 'wait';
  onSlotError: WorkerOptions['onSlotError'];
  timeout: number | undefined;
} {
  const concurrency = resolveConcurrency(options.concurrency);
  const { maxQueue, onFull = 'reject', onSlotError, timeout } = options;

  if (timeout !== undefined && (!Number.isFinite(timeout) || timeout <= 0)) {
    throw new WorkerInvalidOptionsError('`timeout` must be a finite number greater than 0');
  }

  if (maxQueue !== undefined && (!Number.isInteger(maxQueue) || maxQueue < 1)) {
    throw new WorkerInvalidOptionsError('`maxQueue` must be a positive integer');
  }

  return { concurrency, maxQueue, onFull, onSlotError, timeout };
}

// ─── Error serialization protocol ────────────────────────────────────────────

type SerializedError = { message: string; name: string; stack?: string };

function deserializeError(e: SerializedError): Error {
  const err = new Error(e.message);

  err.name = e.name;

  if (e.stack) err.stack = e.stack;

  return err;
}

// ─── Worker script builder (F1) ──────────────────────────────────────────────

function buildWorkerScript(fn: TaskFn<unknown, unknown>): string {
  return `
// Protocol version — must match the PROTOCOL_VERSION constant in the host.
const __PROTOCOL_VERSION__ = ${PROTOCOL_VERSION};

const __fn = (${fn.toString()});
const __serialize = (e) => {
  const err = e instanceof Error ? e : new Error(String(e));
  return { name: err.name, message: err.message, stack: err.stack };
};

self.onmessage = async function (event) {
  const { id, input, stream, heartbeatInterval } = event.data;

  // Automatically send heartbeats at the requested interval (F4).
  let heartbeatTimer = null;
  if (heartbeatInterval) {
    heartbeatTimer = setInterval(() => self.postMessage({ id, heartbeat: true }), heartbeatInterval);
  }

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
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  }
};`.trim();
}

// ─── SlotConfig discriminated union (R5) ─────────────────────────────────────

type SlotConfig<TInput, TOutput> = { fn: TaskFn<TInput, TOutput>; kind: 'inline' } | { kind: 'module'; url: string };

// ─── PendingTask ─────────────────────────────────────────────────────────────

type SlotMessage<TOutput> =
  | { error: SerializedError; id: number }
  | { chunk: TOutput; id: number }
  | { heartbeat: true; id: number }
  | { id: number; result: TOutput };

type PendingTask<TOutput> = {
  /** Emits intermediate stream chunks. Undefined for non-streaming tasks. */
  emit?: (chunk: TOutput) => void;
  /** Original heartbeatTimeout value, needed to reset the watchdog on each heartbeat. */
  heartbeatTimeout?: number;
  /**
   * Single-shot timer that fires if no heartbeat is received within heartbeatTimeout ms.
   * Reset (cleared + recreated) on every incoming heartbeat message.
   * Uses setTimeout because the watchdog is conceptually one-shot with manual reset,
   * not a recurring interval.
   */
  heartbeatWatchdog?: ReturnType<typeof setTimeout>;
  id: number;
  reject: (reason: unknown) => void;
  resolve: (value: TOutput) => void;
  timer?: ReturnType<typeof setTimeout>;
};

// ─── Slot ────────────────────────────────────────────────────────────────────

class Slot<TInput, TOutput> {
  private readonly config: SlotConfig<TInput, TOutput>;
  private readonly onSlotError: WorkerOptions['onSlotError'];
  private disposed = false;
  private pending: PendingTask<TOutput> | null = null;
  private taskId = 0;
  private worker: Worker | null = null;

  constructor(config: SlotConfig<TInput, TOutput>, onSlotError?: WorkerOptions['onSlotError']) {
    this.config = config;
    this.onSlotError = onSlotError;
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

  run(
    input: TInput,
    transferables: Transferable[],
    timeout: number | undefined,
    heartbeatTimeout: number | undefined,
  ): Promise<TOutput> {
    return this.dispatch(input, transferables, timeout, heartbeatTimeout, false) as Promise<TOutput>;
  }

  runStream(
    input: TInput,
    transferables: Transferable[],
    timeout: number | undefined,
    heartbeatTimeout: number | undefined,
  ): AsyncIterable<TOutput> {
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
    this.dispatch(input, transferables, timeout, heartbeatTimeout, true, emit).then(() => finish(), finish);

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
    this.failPending(new WorkerTerminatedError());
  }

  /**
   * Cancel the current pending task without disposing the slot.
   * Clears all timers, nulls pending, and terminates the underlying Worker so the slot
   * can be immediately reused without stale timers contaminating the next task.
   * Called when a runStream consumer breaks or throws early (R1).
   */
  cancel(): void {
    const pending = this.pending;

    if (!pending) return;

    clearTimeout(pending.timer);
    clearTimeout(pending.heartbeatWatchdog);
    this.pending = null;
    // Terminate the worker: the streaming task may still be running and sending chunks.
    // A fresh worker is created on the next run() or runStream() call via ensureWorker().
    this.stopWorker();
  }

  private dispatch(
    input: TInput,
    transferables: Transferable[],
    timeout: number | undefined,
    heartbeatTimeout: number | undefined,
    stream: boolean,
    emit?: (chunk: TOutput) => void,
  ): Promise<TOutput | void> {
    if (this.disposed) {
      return Promise.reject(new WorkerTerminatedError());
    }

    let worker: Worker;

    try {
      worker = this.ensureWorker();
    } catch (error) {
      return Promise.reject(error);
    }

    return new Promise<TOutput | void>((resolve, reject) => {
      const id = this.taskId++;
      const pending: PendingTask<TOutput> = {
        emit,
        heartbeatTimeout,
        id,
        reject,
        resolve: resolve as (v: TOutput) => void,
      };

      if (timeout !== undefined) {
        pending.timer = setTimeout(() => {
          this.restart(new WorkerTimeoutError(timeout));
        }, timeout);
      }

      // Start heartbeat watchdog (F4).
      if (heartbeatTimeout !== undefined) {
        pending.heartbeatWatchdog = setTimeout(() => {
          this.restart(new WorkerTimeoutError(heartbeatTimeout));
        }, heartbeatTimeout);
      }

      this.pending = pending;

      const message: Record<string, unknown> = { id, input, stream };

      // For inline workers the script sends heartbeats automatically;
      // send the interval as half of heartbeatTimeout (Nyquist margin).
      if (heartbeatTimeout !== undefined) {
        message.heartbeatInterval = Math.floor(heartbeatTimeout / 2);
      }

      try {
        worker.postMessage(message, transferables);
      } catch (err) {
        this.failPending(new WorkerRuntimeError(err instanceof Error ? err.message : String(err), err));
      }
    });
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    if (typeof globalThis.Worker !== 'function') {
      throw new WorkerRuntimeError('Worker API is unavailable in this runtime');
    }

    let worker: Worker;

    if (this.config.kind === 'module') {
      try {
        worker = new Worker(this.config.url, { type: 'module' });
      } catch (error) {
        throw new WorkerRuntimeError('Failed to create Worker', error);
      }
    } else {
      const source = this.config.fn.toString();

      if (source.includes('[native code]')) {
        throw new WorkerInvalidOptionsError('Task function cannot be a bound or native function');
      }

      try {
        const blob = new Blob([buildWorkerScript(this.config.fn as TaskFn<unknown, unknown>)], {
          type: 'application/javascript',
        });
        const url = URL.createObjectURL(blob);

        try {
          worker = new Worker(url);
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        throw new WorkerRuntimeError('Failed to create Worker', error);
      }
    }

    worker.onmessage = (event: MessageEvent<SlotMessage<TOutput>>) => {
      const pending = this.pending;

      if (!pending || event.data.id !== pending.id) return;

      // Handle heartbeat message — reset the watchdog timer (F4).
      if ('heartbeat' in event.data) {
        if (pending.heartbeatTimeout !== undefined) {
          clearTimeout(pending.heartbeatWatchdog);
          pending.heartbeatWatchdog = setTimeout(() => {
            this.restart(new WorkerTimeoutError(pending.heartbeatTimeout!));
          }, pending.heartbeatTimeout);
        }

        return;
      }

      if ('chunk' in event.data) {
        pending.emit?.(event.data.chunk);

        return;
      }

      clearTimeout(pending.timer);
      clearInterval(pending.heartbeatWatchdog);
      this.pending = null;

      if ('error' in event.data) {
        pending.reject(new WorkerTaskError(event.data.error.message, deserializeError(event.data.error)));
      } else {
        pending.resolve(event.data.result);
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      const error = new WorkerRuntimeError(event.message);

      // Stop and fail before calling the external callback so it sees a clean state.
      this.stopWorker();
      this.failPending(error);

      // F3: notify the caller with the error and a restart-prewarming callback.
      this.onSlotError?.(error, () => void this.prime());
    };

    this.worker = worker;

    return worker;
  }

  private failPending(reason: unknown): void {
    const pending = this.pending;

    if (!pending) return;

    clearTimeout(pending.timer);
    clearTimeout(pending.heartbeatWatchdog);
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

  const executor: Executor<TInput, TOutput> = (input, transferables, taskTimeout, heartbeatTimeout) => {
    const slot = freeSlots.pop()!;

    return slot.run(input, transferables, taskTimeout, heartbeatTimeout).finally(() => {
      freeSlots.push(slot);
    });
  };

  const pool = createPool(executor, {
    ...poolOptions,
    prime: () => Promise.all(slots.map((s) => s.prime())).then(() => {}),
  });

  // Override runStream with a real implementation using the free-slot stack.
  // Implements return() and throw() on the iterator so the slot is released on
  // early consumer exit (break, throw from for-await-of body). (R4)
  const runStream = (input: TInput, options: Omit<RunOptions, 'signal'> = {}): AsyncIterable<TOutput> => {
    if (pool.status === 'terminated') {
      return {
        [Symbol.asyncIterator]() {
          return {
            next: () => Promise.reject(new WorkerTerminatedError()),
          };
        },
      };
    }

    const slot = freeSlots.pop();

    if (!slot) {
      const slotCount = slots.length;

      return {
        [Symbol.asyncIterator]() {
          return {
            next: () =>
              Promise.reject(
                new WorkerRuntimeError(
                  `runStream() requires a free worker slot; all ${slotCount} slot${slotCount === 1 ? '' : 's'} are busy`,
                ),
              ),
          };
        },
      };
    }

    const { heartbeatTimeout, timeout, transferables = [] } = options;
    const iter = slot.runStream(input, transferables, timeout, heartbeatTimeout);

    return {
      [Symbol.asyncIterator]() {
        const inner = iter[Symbol.asyncIterator]();
        let released = false;

        const releaseSlot = () => {
          if (!released) {
            released = true;
            freeSlots.push(slot!);
          }
        };

        return {
          async next() {
            const result = await inner.next();

            if (result.done) releaseSlot();

            return result;
          },

          async return(value?: unknown) {
            slot.cancel();
            releaseSlot();

            return inner.return?.(value) ?? { done: true as const, value };
          },

          async throw(error?: unknown) {
            slot.cancel();
            releaseSlot();

            if (inner.throw) return inner.throw(error);

            throw error;
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
  const { concurrency, maxQueue, onFull, onSlotError, timeout } = resolveOptions(options);

  const slots = Array.from(
    { length: concurrency },
    () => new Slot<TInput, TOutput>({ fn, kind: 'inline' }, onSlotError),
  );

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
 * Unlike `createWorker`, the worker file is a regular module — it can import utilities,
 * use top-level await, and reference module scope.
 *
 * **Protocol**: The worker module must handle the `{ id, input }` message format and reply
 * with `{ id, result }` or `{ id, error: { name, message, stack } }`. For streaming, it must
 * send one or more `{ id, chunk }` messages followed by `{ id, result: undefined }`.
 * For heartbeat support, send `{ id, heartbeat: true }` at regular intervals.
 *
 * **Protocol version**: Import `PROTOCOL_VERSION` from `@vielzeug/familiar` and include it in
 * a startup message (`self.postMessage({ protocol: PROTOCOL_VERSION })`) so developers can detect
 * version skew from cached module workers when debugging. The host does not validate this value
 * at runtime — it is a debugging convention only.
 *
 * @example
 * ```ts
 * // my-worker.ts (the worker file)
 * import { PROTOCOL_VERSION } from '@vielzeug/familiar';
 *
 * // Optional: announce protocol version on startup.
 * self.postMessage({ protocol: PROTOCOL_VERSION });
 *
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
  const { concurrency, maxQueue, onFull, onSlotError, timeout } = resolveOptions(options);
  const href = typeof url === 'string' ? url : url.href;

  const slots = Array.from(
    { length: concurrency },
    () => new Slot<TInput, TOutput>({ kind: 'module', url: href }, onSlotError),
  );

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
