import { type QueueItem, TaskQueue, createAbortError } from './_queue';

export type TaskFn<TInput, TOutput> = (input: TInput) => TOutput | Promise<TOutput>;

export type WorkerStatus = 'idle' | 'running' | 'terminated';

export type WorkerErrorCode = 'invalid_options' | 'queue_full' | 'task' | 'terminated' | 'timeout' | 'worker';

export type WorkerOptions = {
  /** Number of concurrent worker slots. Default: 1. Pass 'auto' to use navigator.hardwareConcurrency when available. */
  concurrency?: number | 'auto';
  /** Maximum queued tasks before run() rejects with WorkerError(code='queue_full'). Default: unlimited. */
  maxQueue?: number;
  /** Abort tasks after this many milliseconds. Default: none. */
  timeout?: number;
};

export type RunOptions = {
  /** AbortSignal to cancel a queued task. Note: in-flight tasks cannot be cancelled. */
  signal?: AbortSignal;
  /** Transferable objects to move to the worker thread (avoids structured-clone copy). */
  transferables?: Transferable[];
};

export type WorkerHandle<TInput, TOutput> = {
  [Symbol.asyncDispose](): Promise<void>;
  [Symbol.dispose](): void;
  /** Number of slots currently executing a task. */
  readonly active: number;
  /** Gracefully stop by waiting for queued/in-flight tasks to finish, then terminate workers. */
  close(): Promise<void>;
  /** Number of successfully completed tasks. */
  readonly completed: number;
  /** Number of worker slots. */
  readonly concurrency: number;
  dispose(): void;
  /** Number of queued tasks waiting to run. */
  readonly queued: number;
  /**
   * Execute the task function.
   *
   * IMPORTANT: The task function is serialized via `.toString()` and runs in a separate global
   * scope. It cannot close over variables from the surrounding module.
   */
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
  /** Current state. */
  readonly status: WorkerStatus;
  /** Fraction of worker slots currently executing a task. */
  readonly utilization: number;
  /** Pre-initialize all worker slots to reduce first-task latency. */
  warmup(): void;
};

export class WorkerError extends Error {
  readonly code: WorkerErrorCode;

  constructor(code: WorkerErrorCode, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'WorkerError';
    this.code = code;
  }
}

// ─── Slot internals ───────────────────────────────────────────────────────────

type SerializedError = { message: string; name: string; stack?: string };

type SlotResponse<TOutput> = { error: SerializedError; id: number } | { id: number; result: TOutput };

type PendingTask<TOutput> = {
  id: number;
  reject: (reason: unknown) => void;
  resolve: (value: TOutput) => void;
  timer?: ReturnType<typeof setTimeout>;
};

function buildWorkerScript(fn: TaskFn<unknown, unknown>): string {
  return `const __fn = (${fn.toString()});

self.onmessage = async function (event) {
  const { id, input } = event.data;
  try {
    const result = await __fn(input);
    self.postMessage({ id, result });
  } catch (error) {
    const e = error instanceof Error ? error : new Error(String(error));
    self.postMessage({ id, error: { name: e.name, message: e.message, stack: e.stack } });
  }
};`;
}

function resolveConcurrency(value: WorkerOptions['concurrency']): number {
  if (value === undefined) return 1;

  if (value === 'auto') {
    return Math.max(1, globalThis.navigator?.hardwareConcurrency ?? 1);
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new WorkerError('invalid_options', '[worker] `concurrency` must be a positive integer or "auto"');
  }

  return value;
}

function resolveOptions(options: WorkerOptions = {}): {
  concurrency: number;
  maxQueue: number | undefined;
  timeout: number | undefined;
} {
  const concurrency = resolveConcurrency(options.concurrency);
  const { maxQueue, timeout } = options;

  if (timeout !== undefined && (!Number.isFinite(timeout) || timeout <= 0)) {
    throw new WorkerError('invalid_options', '[worker] `timeout` must be a finite number greater than 0');
  }

  if (maxQueue !== undefined && (!Number.isInteger(maxQueue) || maxQueue < 1)) {
    throw new WorkerError('invalid_options', '[worker] `maxQueue` must be a positive integer');
  }

  return { concurrency, maxQueue, timeout };
}

class Slot<TInput, TOutput> {
  private disposed = false;
  private pending: PendingTask<TOutput> | null = null;
  private taskId = 0;
  private worker: Worker | null = null;
  private readonly fn: TaskFn<TInput, TOutput>;
  private readonly timeout: number | undefined;

  constructor(fn: TaskFn<TInput, TOutput>, timeout: number | undefined) {
    this.fn = fn;
    this.timeout = timeout;
  }

  get running(): boolean {
    return this.pending !== null;
  }

  warmup(): void {
    if (!this.disposed && !this.worker) {
      try {
        this.ensureWorker();
      } catch {
        // Warmup is best-effort; errors surface on the first run() call instead.
      }
    }
  }

  run(input: TInput, transferables: Transferable[] = []): Promise<TOutput> {
    if (this.disposed) {
      return Promise.reject(new WorkerError('terminated', '[worker] Worker was terminated'));
    }

    let worker: Worker;

    try {
      worker = this.ensureWorker();
    } catch (error) {
      return Promise.reject(error);
    }

    return new Promise<TOutput>((resolve, reject) => {
      const id = this.taskId++;
      const pending: PendingTask<TOutput> = { id, reject, resolve };

      if (this.timeout !== undefined) {
        pending.timer = setTimeout(() => {
          this.restart(new WorkerError('timeout', `[worker] Task timed out after ${this.timeout}ms`));
        }, this.timeout);
      }

      this.pending = pending;

      try {
        worker.postMessage({ id, input }, transferables);
      } catch (error) {
        this.failPending(new WorkerError('worker', error instanceof Error ? error.message : String(error), error));
      }
    });
  }

  terminate(): void {
    this.disposed = true;
    this.stopWorker();
    this.failPending(new WorkerError('terminated', '[worker] Worker was terminated'));
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    if (typeof globalThis.Worker !== 'function') {
      throw new WorkerError('worker', '[worker] Worker API is unavailable in this runtime');
    }

    const source = this.fn.toString();

    if (source.includes('[native code]')) {
      throw new WorkerError('invalid_options', '[worker] Task function cannot be a bound or native function');
    }

    let worker: Worker;

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
      throw new WorkerError('worker', '[worker] Failed to create Worker', error);
    }

    worker.onmessage = (event: MessageEvent<SlotResponse<TOutput>>) => {
      const pending = this.pending;

      if (!pending || event.data.id !== pending.id) return;

      clearTimeout(pending.timer);
      this.pending = null;

      if ('error' in event.data) {
        const { error } = event.data;
        const cause = new Error(error.message);

        cause.name = error.name;

        if (error.stack) cause.stack = error.stack;

        pending.reject(new WorkerError('task', error.message, cause));
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

class WorkerImpl<TInput, TOutput> implements WorkerHandle<TInput, TOutput> {
  private closePromise?: Promise<void>;
  private completedCount = 0;
  private readonly idleResolvers: Array<() => void> = [];
  private readonly maxQueue: number | undefined;
  private readonly queue = new TaskQueue<TInput, TOutput>();
  private readonly slots: Slot<TInput, TOutput>[];
  private terminated = false;

  constructor(fn: TaskFn<TInput, TOutput>, options: WorkerOptions = {}) {
    const { concurrency, maxQueue, timeout } = resolveOptions(options);

    this.maxQueue = maxQueue;
    this.slots = Array.from({ length: concurrency }, () => new Slot(fn, timeout));
  }

  get active(): number {
    return this.slots.reduce((n, slot) => n + Number(slot.running), 0);
  }

  get completed(): number {
    return this.completedCount;
  }

  get concurrency(): number {
    return this.slots.length;
  }

  get queued(): number {
    return this.queue.size;
  }

  get status(): WorkerStatus {
    if (this.terminated) return 'terminated';

    if (this.queue.size > 0 || this.slots.some((slot) => slot.running)) return 'running';

    return 'idle';
  }

  get utilization(): number {
    return this.active / this.slots.length;
  }

  warmup(): void {
    for (const slot of this.slots) {
      slot.warmup();
    }
  }

  close(): Promise<void> {
    if (this.terminated) {
      return Promise.resolve();
    }

    if (this.closePromise) {
      return this.closePromise;
    }

    this.closePromise = this.waitForIdle().then(() => {
      this.dispose();
    });

    return this.closePromise;
  }

  run(input: TInput, options: RunOptions = {}): Promise<TOutput> {
    const { signal, transferables = [] } = options;

    if (this.terminated) {
      return Promise.reject(new WorkerError('terminated', '[worker] Worker was terminated'));
    }

    if (this.closePromise) {
      return Promise.reject(new WorkerError('terminated', '[worker] Worker is closing'));
    }

    if (signal?.aborted) {
      return Promise.reject(createAbortError(signal));
    }

    let resolve!: (value: TOutput) => void;
    let reject!: (reason: unknown) => void;

    const promise = new Promise<TOutput>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const item: QueueItem<TInput, TOutput> = { input, reject, resolve, signal, transferables };

    if (!this.queue.enqueue(item, this.maxQueue)) {
      return Promise.reject(new WorkerError('queue_full', `[worker] Queue is full (${this.maxQueue})`));
    }

    if (signal) {
      const onAbort = () => {
        if (!this.queue.remove(item)) return;

        item.cleanupAbort?.();
        reject(createAbortError(signal));
        this.notifyIdle();
      };

      item.cleanupAbort = () => {
        signal.removeEventListener('abort', onAbort);
        item.cleanupAbort = undefined;
      };

      signal.addEventListener('abort', onAbort, { once: true });
    }

    this.drainLoop();

    return promise;
  }

  dispose(): void {
    if (this.terminated) return;

    this.terminated = true;

    for (const slot of this.slots) {
      slot.terminate();
    }

    while (this.queue.size > 0) {
      const item = this.queue.shift();

      item.cleanupAbort?.();
      item.reject(new WorkerError('terminated', '[worker] Worker was terminated'));
    }

    const resolvers = this.idleResolvers.splice(0);

    for (const resolve of resolvers) {
      resolve();
    }
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }

  private nextItem(): QueueItem<TInput, TOutput> | undefined {
    while (this.queue.size > 0) {
      const item = this.queue.shift();

      if (item.signal?.aborted) {
        item.cleanupAbort?.();
        item.reject(createAbortError(item.signal));
        continue;
      }

      return item;
    }
  }

  private drainLoop(): void {
    if (this.terminated) return;

    for (const slot of this.slots) {
      if (slot.running || this.queue.size === 0) continue;

      const item = this.nextItem();

      if (!item) break;

      item.cleanupAbort?.();
      slot.run(item.input, item.transferables).then(
        (result) => {
          this.completedCount += 1;
          item.resolve(result);
          this.drainLoop();
        },
        (error: unknown) => {
          item.reject(error);
          this.drainLoop();
        },
      );
    }

    // Notify in case all slots were already idle (no items dequeued this pass).
    this.notifyIdle();
  }

  private isIdle(): boolean {
    return this.queue.size === 0 && this.slots.every((slot) => !slot.running);
  }

  private notifyIdle(): void {
    if (!this.isIdle() || this.idleResolvers.length === 0) return;

    const resolvers = this.idleResolvers.splice(0);

    for (const resolve of resolvers) {
      resolve();
    }
  }

  private waitForIdle(): Promise<void> {
    if (this.terminated || this.isIdle()) return Promise.resolve();

    return new Promise<void>((resolve) => {
      this.idleResolvers.push(resolve);
    });
  }
}

/**
 * Creates a pool of Web Workers that run `fn` in parallel.
 *
 * IMPORTANT: The task function is serialized via `.toString()` and runs in a separate global
 * scope. It cannot close over variables from the surrounding module.
 */
export function createWorker<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
  options?: WorkerOptions,
): WorkerHandle<TInput, TOutput> {
  return new WorkerImpl(fn, options);
}
