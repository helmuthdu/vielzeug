// Re-export all public types and classes so consumers only need one import.
export type {
  BatchOptions,
  GroupOptions,
  RunOptions,
  TaskFn,
  TaskGroup,
  WorkerErrorCode,
  WorkerHandle,
  WorkerOptions,
  WorkerStatus,
} from './_types';
export {
  WorkerError,
  WorkerInvalidOptionsError,
  WorkerQueueFullError,
  WorkerRuntimeError,
  WorkerTaskError,
  WorkerTerminatedError,
  WorkerTimeoutError,
} from './_types';

import type { SlotStrategy, TaskFn, WorkerHandle, WorkerOptions } from './_types';

import { createPool } from './_pool';
import {
  WorkerInvalidOptionsError,
  WorkerRuntimeError,
  WorkerTaskError,
  WorkerTerminatedError,
  WorkerTimeoutError,
} from './_types';
import { warn } from './_warn';

// ─── task() — optional validation helper ─────────────────────────────────────

/**
 * Optional helper that validates a function is safe to serialize for use in `createWorker`.
 *
 * `createWorker` accepts any `TaskFn` directly — this helper exists only to catch the common
 * mistake of passing a bound or native function whose body cannot be serialized.
 *
 * IMPORTANT: The function is serialized via `.toString()` and runs in an isolated Worker scope.
 * It **cannot** close over variables from the surrounding module — any outer reference resolves
 * to `undefined` inside the worker.
 *
 * @throws WorkerInvalidOptionsError if the function is bound or native.
 *
 * @example
 * // Without task() — works fine for plain arrow functions:
 * const worker = createWorker((n: number) => n * 2);
 *
 * // With task() — catches the mistake of passing Math.sqrt directly:
 * const worker = createWorker(task((n: number) => Math.sqrt(n)));
 */
export function task<TInput, TOutput>(fn: TaskFn<TInput, TOutput>): TaskFn<TInput, TOutput> {
  if (fn.toString().includes('[native code]')) {
    throw new WorkerInvalidOptionsError('Task function cannot be a bound or native function');
  }

  return fn;
}

// ─── Options resolution ───────────────────────────────────────────────────────

function resolveConcurrency(value: WorkerOptions['concurrency']): number {
  if (value === undefined) return 1;

  if (value === 'auto') {
    return Math.max(1, globalThis.navigator?.hardwareConcurrency ?? 1);
  }

  if (!Number.isInteger(value) || value < 1 || value > 512) {
    throw new WorkerInvalidOptionsError('`concurrency` must be a positive integer ≤ 512 or "auto"');
  }

  return value;
}

function resolveOptions(options: WorkerOptions = {}): {
  concurrency: number;
  heartbeatWindow: number | undefined;
  maxQueue: number | undefined;
  onFull: 'reject' | 'wait';
  onSlotError: WorkerOptions['onSlotError'];
  timeout: number | undefined;
} {
  const concurrency = resolveConcurrency(options.concurrency);
  const { heartbeatWindow, maxQueue, onFull = 'reject', onSlotError, timeout } = options;

  if (timeout !== undefined && (!Number.isFinite(timeout) || timeout <= 0)) {
    throw new WorkerInvalidOptionsError('`timeout` must be a finite number greater than 0');
  }

  if (maxQueue !== undefined && (!Number.isInteger(maxQueue) || maxQueue < 1)) {
    throw new WorkerInvalidOptionsError('`maxQueue` must be a positive integer');
  }

  if (heartbeatWindow !== undefined && (!Number.isFinite(heartbeatWindow) || heartbeatWindow <= 0)) {
    throw new WorkerInvalidOptionsError('`heartbeatWindow` must be a finite number greater than 0');
  }

  return { concurrency, heartbeatWindow, maxQueue, onFull, onSlotError, timeout };
}

// ─── Worker script builder ────────────────────────────────────────────────────

/**
 * @security `fn.toString()` is injected verbatim into the blob script. Any code embedded in the
 * serialized function executes only inside the isolated Worker scope — no shared memory, no access
 * to the host page's globals. Risk is therefore low, but callers should only pass plain functions
 * that do not close over module scope.
 */
function buildWorkerScript(fn: TaskFn<unknown, unknown>, heartbeatInterval: number | undefined): string {
  return `
const __fn = (${fn.toString()});

self.onmessage = async function (event) {
  const { id, input, stream } = event.data;

  // Automatically send heartbeats at half the heartbeatWindow interval.
  let heartbeatTimer = null;
  ${heartbeatInterval != null ? `heartbeatTimer = setInterval(() => self.postMessage({ id, heartbeat: true }), ${heartbeatInterval});` : ''}

  try {
    if (stream) {
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
    self.postMessage({ id, error });
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  }
}`.trim();
}

// ─── SlotConfig discriminated union ──────────────────────────────────────────

type SlotConfig<TInput, TOutput> =
  | { fn: TaskFn<TInput, TOutput>; heartbeatInterval: number | undefined; kind: 'inline' }
  | { kind: 'module'; url: string };

// ─── PendingTask ─────────────────────────────────────────────────────────────

type SlotMessage<TOutput> =
  | { error: unknown; id: number }
  | { chunk: TOutput; id: number }
  | { heartbeat: true; id: number }
  | { id: number; result: TOutput };

type PendingTask<TOutput> = {
  /** Emits intermediate stream chunks. Undefined for non-streaming tasks. */
  emit?: (chunk: TOutput) => void;
  /** Called with an error when the streaming dispatch is cancelled mid-flight, so the finish closure drains its waiters. */
  finishStream?: (err: unknown) => void;
  /**
   * Single-shot timer that fires if no heartbeat is received within watchdogMs.
   * Reset (cleared + recreated) on every incoming heartbeat message.
   * Uses setTimeout because the watchdog is conceptually one-shot with manual reset,
   * not a recurring interval.
   */
  heartbeatWatchdog?: ReturnType<typeof setTimeout>;
  id: number;
  reject: (reason: unknown) => void;
  resolve: (value: TOutput) => void;
  timer?: ReturnType<typeof setTimeout>;
  /** Watchdog window in ms (= heartbeatWindow). Stored on PendingTask to reset the timer on each heartbeat. */
  watchdogMs?: number;
};

// ─── Slot — implements SlotStrategy ──────────────────────────────────────────

class Slot<TInput, TOutput> implements SlotStrategy<TInput, TOutput> {
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
    // finishStream is stored on the PendingTask so cancel() can drain the waiters if the
    // consumer exits early (break/throw from for-await), preventing a permanently dangling Promise.
    // this.pending is set synchronously inside dispatch(), so this assignment is safe.
    this.dispatch(input, transferables, timeout, true, emit).then(() => finish(), finish);

    if (this.pending) this.pending.finishStream = finish;

    return {
      [Symbol.asyncIterator]() {
        let cursor = 0;

        return {
          async next(): Promise<IteratorResult<TOutput>> {
            while (cursor >= chunks.length && !done) {
              await new Promise<void>((resolve) => waiters.push(resolve));
            }

            if (cursor < chunks.length) {
              const value = chunks[cursor]!;

              // Null-out the consumed slot so GC can collect the value
              // without waiting for the entire stream to close.
              (chunks as (TOutput | null)[])[cursor] = null;
              cursor++;

              return { done: false, value };
            }

            if (error !== undefined) throw error;

            return { done: true, value: undefined as unknown as TOutput };
          },
        };
      },
    };
  }

  cancel(): void {
    const pending = this.pending;

    if (!pending) return;

    clearTimeout(pending.timer);
    clearTimeout(pending.heartbeatWatchdog);
    this.pending = null;
    // Terminate the worker: the streaming task may still be running and sending chunks.
    // A fresh worker is created on the next run() or runStream() call via ensureWorker().
    this.stopWorker();
    // Drain the stream finish closure so any pending .next() waiters resolve immediately
    // rather than leaking as permanently dangling Promises.
    pending.finishStream?.(new WorkerTerminatedError('Stream was cancelled'));
  }

  terminate(): void {
    this.disposed = true;
    this.stopWorker();
    this.failPending(new WorkerTerminatedError());
  }

  private dispatch(
    input: TInput,
    transferables: Transferable[],
    timeout: number | undefined,
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

    // watchdogMs = heartbeatInterval * 2 (Nyquist margin: worker beats at interval, host allows 2× before firing).
    const watchdogMs =
      this.config.kind === 'inline' && this.config.heartbeatInterval != null
        ? this.config.heartbeatInterval * 2
        : undefined;

    return new Promise<TOutput | void>((resolve, reject) => {
      const id = this.taskId++;
      const pending: PendingTask<TOutput> = {
        emit,
        id,
        reject,
        resolve: resolve as (v: TOutput) => void,
        watchdogMs,
      };

      if (timeout !== undefined) {
        pending.timer = setTimeout(() => {
          this.restart(new WorkerTimeoutError(timeout));
        }, timeout);
      }

      if (watchdogMs !== undefined) {
        pending.heartbeatWatchdog = setTimeout(() => {
          this.restart(new WorkerTimeoutError(watchdogMs));
        }, watchdogMs);
      }

      this.pending = pending;

      try {
        worker.postMessage({ id, input, stream }, transferables);
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
      try {
        const blob = new Blob(
          [buildWorkerScript(this.config.fn as TaskFn<unknown, unknown>, this.config.heartbeatInterval)],
          { type: 'application/javascript' },
        );
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

      // Handle heartbeat message — reset the watchdog timer.
      if ('heartbeat' in event.data) {
        if (pending.watchdogMs !== undefined) {
          clearTimeout(pending.heartbeatWatchdog);
          pending.heartbeatWatchdog = setTimeout(() => {
            this.restart(new WorkerTimeoutError(pending.watchdogMs!));
          }, pending.watchdogMs);
        }

        return;
      }

      if ('chunk' in event.data) {
        pending.emit?.(event.data.chunk);

        return;
      }

      clearTimeout(pending.timer);
      clearTimeout(pending.heartbeatWatchdog);
      this.pending = null;

      if ('error' in event.data) {
        const cause = event.data.error instanceof Error ? event.data.error : new Error(String(event.data.error));

        pending.reject(new WorkerTaskError(cause.message, cause));
      } else {
        pending.resolve(event.data.result);
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      const error = new WorkerRuntimeError(event.message);

      // Stop and fail before calling the external callback so it sees a clean state.
      this.stopWorker();
      this.failPending(error);

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

// ─── createWorker ─────────────────────────────────────────────────────────────

/**
 * Creates a pool of Web Workers that run `fn` in parallel.
 *
 * The task function is serialized via `.toString()` and runs in a separate global scope.
 * It cannot close over variables from the surrounding module.
 *
 * Use the optional `task()` helper to validate that the function is not bound or native.
 * For workers that need imports, see `createModuleWorker`.
 *
 * @example
 * // Plain arrow function — most common case:
 * const worker = createWorker((n: number) => n * 2);
 *
 * // With task() for validation:
 * const worker = createWorker(task((n: number) => n * 2));
 */
export function createWorker<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
  options?: WorkerOptions,
): WorkerHandle<TInput, TOutput> {
  const { concurrency, heartbeatWindow, maxQueue, onFull, onSlotError, timeout } = resolveOptions(options);
  const heartbeatInterval = heartbeatWindow != null ? Math.floor(heartbeatWindow / 2) : undefined;

  const slots = Array.from(
    { length: concurrency },
    () => new Slot<TInput, TOutput>({ fn, heartbeatInterval, kind: 'inline' }, onSlotError),
  );

  return createPool(slots, {
    concurrency,
    defaultTimeout: timeout,
    maxQueue,
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
 * Use `handleMessages` from `@vielzeug/familiar/protocol` in the worker file to implement
 * the message protocol without boilerplate.
 *
 * **Protocol**: The worker module must handle the `{ id, input }` message format and reply
 * with `{ id, result }` or `{ id, error: { name, message, stack } }`. For streaming, it must
 * send one or more `{ id, chunk }` messages followed by `{ id, result: undefined }`.
 * For heartbeat support, send `{ id, heartbeat: true }` at regular intervals.
 *
 * @example
 * ```ts
 * // my-worker.ts — use handleMessages for zero boilerplate:
 * import { handleMessages } from '@vielzeug/familiar/protocol';
 * handleMessages(async (input: number) => input * 2);
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
  const { concurrency, heartbeatWindow, maxQueue, onFull, onSlotError, timeout } = resolveOptions(options);

  if (heartbeatWindow !== undefined) {
    warn(
      '`heartbeatWindow` has no effect on module workers — the worker script must implement the heartbeat protocol manually.',
    );
  }

  const href = typeof url === 'string' ? url : url.href;

  const slots = Array.from(
    { length: concurrency },
    () => new Slot<TInput, TOutput>({ kind: 'module', url: href }, onSlotError),
  );

  return createPool(slots, {
    concurrency,
    defaultTimeout: timeout,
    maxQueue,
    onFull,
  });
}
