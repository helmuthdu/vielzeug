import { createAbortError } from './_internal';

export type TaskFn<TInput, TOutput> = (input: TInput) => TOutput | Promise<TOutput>;

export type WorkerStatus = 'idle' | 'running' | 'terminated';

export type WorkerErrorCode =
  | 'invalid_options'
  | 'post_message_failed'
  | 'queue_full'
  | 'task'
  | 'terminated'
  | 'timeout'
  | 'worker_create_failed'
  | 'worker_runtime'
  | 'worker_unavailable';

export type WorkerOptions = {
  /** Number of concurrent worker slots. Default: 1. Pass 'auto' to use navigator.hardwareConcurrency when available. */
  concurrency?: number | 'auto';
  /** Maximum queued tasks before run() rejects with QueueFullError. */
  maxQueue?: number | 'auto';
  /** Abort tasks after this many milliseconds. Default: none. */
  timeout?: number;
};

export type RunOptions = {
  /** AbortSignal to cancel a queued task. Note: in-flight tasks cannot be cancelled. */
  signal?: AbortSignal;
  /** Transferable objects to move to the worker thread (avoids structured-clone copy). */
  transfer?: Transferable[];
};

export type WorkerHandle<TInput, TOutput> = {
  [Symbol.dispose](): void;
  /** Gracefully stop by waiting for queued/in-flight tasks to finish, then terminate workers. */
  close(): Promise<void>;
  /** Number of completed tasks. */
  readonly completed: number;
  /** Number of worker slots. */
  readonly concurrency: number;
  dispose(): void;
  /**
   * Execute the task function.
   *
   * IMPORTANT: The task function is serialized via `.toString()` and runs in a separate global
   * scope. It cannot close over variables from the surrounding module.
   */
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
  /** Number of queued tasks waiting to run. */
  readonly size: number;
  /** Current state. */
  readonly status: WorkerStatus;
  /** Fraction of worker slots currently executing a task. */
  readonly utilization: number;
};

export class WorkerError extends Error {
  readonly code: WorkerErrorCode;

  constructor(code: WorkerErrorCode, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'WorkerError';
    this.code = code;
  }
}

type SerializedError = { message: string; name: string; stack?: string };

type SlotMessage<TOutput> =
  | { id: number; ok: true; result: TOutput }
  | { error: SerializedError; id: number; ok: false };

type PendingTask<TOutput> = {
  id: number;
  reject: (reason: unknown) => void;
  resolve: (value: TOutput) => void;
  timer?: ReturnType<typeof setTimeout>;
};

type QueueItem<TInput, TOutput> = {
  cleanupAbort?: () => void;
  input: TInput;
  reject: (reason: unknown) => void;
  resolve: (value: TOutput) => void;
  signal?: AbortSignal;
  transfer: Transferable[];
};

function buildWorkerScript(fn: TaskFn<unknown, unknown>): string {
  return `const __fn=(${fn.toString()});self.onmessage=async function(event){const{id,input}=event.data;try{const result=await __fn(input);self.postMessage({id,ok:true,result});}catch(error){const e=error instanceof Error?error:new Error(String(error));self.postMessage({id,ok:false,error:{name:e.name,message:e.message,stack:e.stack}});}};`;
}

function rejectAsync<T = never>(reason: unknown): Promise<T> {
  return new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(reason);
    }, 0);
  });
}

function resolveConcurrency(value: WorkerOptions['concurrency']): number {
  if (value === undefined) return 1;

  if (value === 'auto') {
    return Math.max(1, globalThis.navigator?.hardwareConcurrency ?? 1);
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new WorkerError('invalid_options', '[workit] `concurrency` must be a positive integer or "auto"');
  }

  return value;
}

function resolveOptions(options: WorkerOptions = {}): {
  concurrency: number;
  maxQueue: number | undefined;
  timeout: number | undefined;
} {
  const concurrency = resolveConcurrency(options.concurrency);
  const { maxQueue: value, timeout } = options;

  let resolvedTimeout: number | undefined;

  if (timeout !== undefined) {
    if (!Number.isFinite(timeout) || timeout <= 0) {
      throw new WorkerError('invalid_options', '[workit] `timeout` must be a finite number greater than 0');
    }

    resolvedTimeout = timeout;
  }

  let maxQueue: number | undefined;

  if (value === undefined) {
    return { concurrency, maxQueue: undefined, timeout: resolvedTimeout };
  }

  if (value === 'auto') {
    maxQueue = concurrency * 2;
  } else {
    if (!Number.isInteger(value) || value < 1) {
      throw new WorkerError('invalid_options', '[workit] `maxQueue` must be a positive integer or "auto"');
    }

    maxQueue = value;
  }

  return { concurrency, maxQueue, timeout: resolvedTimeout };
}

function createNativeWorker(fn: TaskFn<unknown, unknown>): Worker {
  if (typeof globalThis.Worker !== 'function') {
    throw new WorkerError('worker_unavailable', '[workit] Worker API is unavailable in this runtime');
  }

  try {
    const blob = new Blob([buildWorkerScript(fn)], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    try {
      return new Worker(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    throw new WorkerError('worker_create_failed', '[workit] Failed to create Worker', error);
  }
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

  run(input: TInput, transfer: Transferable[] = []): Promise<TOutput> {
    if (this.disposed) {
      return rejectAsync(new WorkerError('terminated', '[workit] Worker was terminated'));
    }

    let worker: Worker;

    try {
      worker = this.ensureWorker();
    } catch (error) {
      return rejectAsync(error);
    }

    const id = ++this.taskId;

    return new Promise<TOutput>((resolve, reject) => {
      const pending: PendingTask<TOutput> = { id, reject, resolve };

      if (this.timeout !== undefined) {
        pending.timer = setTimeout(() => {
          if (this.pending?.id !== id) return;

          this.restart(new WorkerError('timeout', `[workit] Task timed out after ${this.timeout}ms`));
        }, this.timeout);
      }

      this.pending = pending;

      try {
        worker.postMessage({ id, input }, transfer);
      } catch (error) {
        this.failPending(
          new WorkerError('post_message_failed', error instanceof Error ? error.message : String(error), error),
        );
      }
    });
  }

  terminate(): void {
    this.disposed = true;
    this.stopWorker();
    this.failPending(new WorkerError('terminated', '[workit] Worker was terminated'));
  }

  private bindWorker(worker: Worker): void {
    worker.onmessage = (event: MessageEvent<SlotMessage<TOutput>>) => {
      const pending = this.pending;

      if (!pending || event.data.id !== pending.id) return;

      clearTimeout(pending.timer);
      this.pending = null;

      if (event.data.ok) {
        pending.resolve(event.data.result);
      } else {
        const err = new WorkerError('task', event.data.error.message);

        err.name = event.data.error.name;

        if (event.data.error.stack) {
          (err as Error).stack = event.data.error.stack;
        }

        pending.reject(err);
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      this.restart(new WorkerError('worker_runtime', event.message));
    };
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    const worker = createNativeWorker(this.fn as TaskFn<unknown, unknown>);

    this.bindWorker(worker);
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

class WorkitImpl<TInput, TOutput> implements WorkerHandle<TInput, TOutput> {
  private closePromise?: Promise<void>;
  private completedCount = 0;
  private draining = false;
  private readonly idleResolvers: Array<() => void> = [];
  private readonly maxQueue: number | undefined;
  private readonly queue: QueueItem<TInput, TOutput>[] = [];
  private readonly slots: Slot<TInput, TOutput>[];
  private terminated = false;

  constructor(fn: TaskFn<TInput, TOutput>, options: WorkerOptions = {}) {
    const { concurrency, maxQueue, timeout } = resolveOptions(options);

    this.maxQueue = maxQueue;
    this.slots = Array.from({ length: concurrency }, () => new Slot(fn, timeout));
  }

  get completed(): number {
    return this.completedCount;
  }

  get concurrency(): number {
    return this.slots.length;
  }

  get size(): number {
    return this.queue.length;
  }

  get status(): WorkerStatus {
    if (this.terminated) return 'terminated';

    if (this.queue.length > 0 || this.slots.some((slot) => slot.running)) return 'running';

    return 'idle';
  }

  get utilization(): number {
    const active = this.slots.reduce((count, slot) => count + Number(slot.running), 0);

    return active / this.slots.length;
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
    const { signal, transfer = [] } = options;

    if (this.terminated) {
      return rejectAsync(new WorkerError('terminated', '[workit] Worker was terminated'));
    }

    if (signal?.aborted) {
      return rejectAsync(createAbortError(signal));
    }

    // Attempt immediate dispatch first so maxQueue only counts true waiting tasks.
    this.drainLoop();

    if (this.maxQueue !== undefined && this.queue.length >= this.maxQueue) {
      return rejectAsync(new WorkerError('queue_full', `[workit] Queue is full (${this.maxQueue})`));
    }

    return new Promise<TOutput>((resolve, reject) => {
      const item: QueueItem<TInput, TOutput> = { input, reject, resolve, signal, transfer };

      if (signal) {
        const onAbort = () => {
          const index = this.queue.indexOf(item);

          if (index === -1) return;

          this.queue.splice(index, 1);
          item.cleanupAbort?.();
          reject(createAbortError(signal));
          this.notifyIdleIfReady();
        };

        item.cleanupAbort = () => {
          signal.removeEventListener('abort', onAbort);
          item.cleanupAbort = undefined;
        };

        signal.addEventListener('abort', onAbort, { once: true });
      }

      this.queue.push(item);
      this.scheduleDrain();
    });
  }

  dispose(): void {
    if (this.terminated) return;

    this.terminated = true;

    for (const slot of this.slots) {
      slot.terminate();
    }

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      item.cleanupAbort?.();
      item.reject(new WorkerError('terminated', '[workit] Worker was terminated'));
    }

    this.notifyIdleIfReady();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  private nextItem(): QueueItem<TInput, TOutput> | undefined {
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      if (item.signal?.aborted) {
        item.cleanupAbort?.();
        item.reject(createAbortError(item.signal));
        continue;
      }

      return item;
    }
  }

  private scheduleDrain(): void {
    if (this.terminated || this.draining) return;

    this.draining = true;
    queueMicrotask(() => {
      this.draining = false;
      this.drainLoop();
    });
  }

  private drainLoop(): void {
    if (this.terminated) return;

    for (const slot of this.slots) {
      if (slot.running || this.queue.length === 0) continue;

      const item = this.nextItem();

      if (!item) break;

      item.cleanupAbort?.();
      slot.run(item.input, item.transfer).then(
        (result) => {
          this.completedCount += 1;
          item.resolve(result);
          this.scheduleDrain();
          this.notifyIdleIfReady();
        },
        (error: unknown) => {
          item.reject(error);
          this.scheduleDrain();
          this.notifyIdleIfReady();
        },
      );
    }

    this.notifyIdleIfReady();
  }

  private isIdle(): boolean {
    return !this.terminated && this.queue.length === 0 && this.slots.every((slot) => !slot.running);
  }

  private notifyIdleIfReady(): void {
    if (!this.isIdle() || this.idleResolvers.length === 0) return;

    const resolvers = this.idleResolvers.splice(0, this.idleResolvers.length);

    for (const resolve of resolvers) {
      resolve();
    }
  }

  private waitForIdle(): Promise<void> {
    if (this.terminated || this.isIdle()) {
      return Promise.resolve();
    }

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
  return new WorkitImpl(fn, options);
}
