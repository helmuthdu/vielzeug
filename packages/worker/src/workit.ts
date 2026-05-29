import { createAbortError } from './_internal';
import { TaskQueue, type TaskQueueItem } from './_task-queue';

export type TaskFn<TInput, TOutput> = (input: TInput) => TOutput | Promise<TOutput>;

export type WorkerStatus = 'idle' | 'running' | 'terminated';

export type WorkerErrorCode = 'invalid_options' | 'queue_full' | 'task' | 'terminated' | 'timeout' | 'worker';

export type WorkerOptions = {
  /** Number of concurrent worker slots. Default: 1. Pass 'auto' to use navigator.hardwareConcurrency when available. */
  concurrency?: number | 'auto';
  /** Maximum queued tasks before run() rejects with WorkerError(code='queue_full'). */
  maxQueue?: number | 'auto';
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
  /** Gracefully stop by waiting for queued/in-flight tasks to finish, then terminate workers. */
  close(): Promise<void>;
  /** Number of successfully completed tasks. */
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

type SlotMessage<TOutput> = { error: SerializedError; id: number } | { id: number; result: TOutput };

type PendingTask<TOutput> = {
  id: number;
  reject: (reason: unknown) => void;
  resolve: (value: TOutput) => void;
  timer?: ReturnType<typeof setTimeout>;
};

function buildWorkerScript(fn: TaskFn<unknown, unknown>): string {
  return `const __fn=(${fn.toString()});self.onmessage=async function(event){const id=event.data.id;try{const result=await __fn(event.data.input);self.postMessage({id,result});}catch(error){const e=error instanceof Error?error:new Error(String(error));self.postMessage({id,error:{name:e.name,message:e.message,stack:e.stack}});}};`;
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
  const { maxQueue: value, timeout } = options;

  let resolvedTimeout: number | undefined;

  if (timeout !== undefined) {
    if (!Number.isFinite(timeout) || timeout <= 0) {
      throw new WorkerError('invalid_options', '[worker] `timeout` must be a finite number greater than 0');
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
      throw new WorkerError('invalid_options', '[worker] `maxQueue` must be a positive integer or "auto"');
    }

    maxQueue = value;
  }

  return { concurrency, maxQueue, timeout: resolvedTimeout };
}

function createNativeWorker(fn: TaskFn<unknown, unknown>): Worker {
  if (typeof globalThis.Worker !== 'function') {
    throw new WorkerError('worker', '[worker] Worker API is unavailable in this runtime');
  }

  const source = fn.toString();

  if (source.includes('[native code]')) {
    throw new WorkerError('invalid_options', '[worker] Task function cannot be a bound or native function');
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
    throw new WorkerError('worker', '[worker] Failed to create Worker', error);
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

  private bindWorker(worker: Worker): void {
    worker.onmessage = (event: MessageEvent<SlotMessage<TOutput>>) => {
      const pending = this.pending;

      if (!pending) return;

      const data = event.data as unknown;

      if (data === null || typeof data !== 'object') {
        return;
      }

      if (!('id' in data) || typeof (data as { id?: unknown }).id !== 'number') {
        return;
      }

      if ((data as { id: number }).id !== pending.id) {
        return;
      }

      clearTimeout(pending.timer);
      this.pending = null;

      if (data !== null && typeof data === 'object' && 'error' in data) {
        const serialized = (data as { error: SerializedError }).error;
        const cause = new Error(serialized.message);

        cause.name = serialized.name;

        if (serialized.stack) {
          cause.stack = serialized.stack;
        }

        pending.reject(new WorkerError('task', serialized.message, cause));

        return;
      }

      if (data !== null && typeof data === 'object' && 'result' in data) {
        pending.resolve((data as { result: TOutput }).result);

        return;
      }

      pending.reject(new WorkerError('worker', '[worker] Invalid response received from worker'));
    };

    worker.onerror = (event: ErrorEvent) => {
      this.restart(new WorkerError('worker', event.message));
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
  private readonly maxQueue: number | undefined;
  private readonly queue = new TaskQueue<TInput, TOutput>();
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
    return this.queue.size;
  }

  get status(): WorkerStatus {
    if (this.terminated) return 'terminated';

    if (this.queue.size > 0 || this.slots.some((slot) => slot.running)) return 'running';

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

    const item: TaskQueueItem<TInput, TOutput> = {
      input,
      reject: () => {},
      resolve: () => {},
      signal,
      transferables,
    };

    if (!this.queue.enqueue(item, this.maxQueue)) {
      return Promise.reject(new WorkerError('queue_full', `[worker] Queue is full (${this.maxQueue})`));
    }

    return new Promise<TOutput>((resolve, reject) => {
      item.reject = reject;
      item.resolve = resolve;

      if (signal) {
        const onAbort = () => {
          if (!this.queue.remove(item)) return;

          item.cleanupAbort?.();
          reject(createAbortError(signal));
          this.queue.notifyIdleIfReady(() => this.isIdle());
        };

        item.cleanupAbort = () => {
          signal.removeEventListener('abort', onAbort);
          item.cleanupAbort = undefined;
        };

        signal.addEventListener('abort', onAbort, { once: true });
      }

      this.drainLoop();
    });
  }

  dispose(): void {
    if (this.terminated) return;

    this.terminated = true;

    for (const slot of this.slots) {
      slot.terminate();
    }

    while (this.queue.size > 0) {
      const item = this.queue.shift()!;

      item.cleanupAbort?.();
      item.reject(new WorkerError('terminated', '[worker] Worker was terminated'));
    }

    this.queue.notifyIdleIfReady(() => this.isIdle());
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }

  private nextItem(): TaskQueueItem<TInput, TOutput> | undefined {
    while (this.queue.size > 0) {
      const item = this.queue.shift();

      if (!item) return undefined;

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

    this.queue.notifyIdleIfReady(() => this.isIdle());
  }

  private isIdle(): boolean {
    return !this.terminated && this.queue.size === 0 && this.slots.every((slot) => !slot.running);
  }

  private waitForIdle(): Promise<void> {
    if (this.terminated || this.isIdle()) {
      return Promise.resolve();
    }

    return this.queue.waitForIdle(() => this.isIdle());
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
