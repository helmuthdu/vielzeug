export type TaskFn<TInput, TOutput> = (input: TInput) => TOutput | Promise<TOutput>;

export type WorkerStatus = 'idle' | 'running' | 'terminated';

export type WorkerOptions = {
  /** Number of concurrent worker slots. Default: 1. Pass 'auto' to use navigator.hardwareConcurrency when available. */
  concurrency?: number | 'auto';
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
  /** Current state. */
  readonly status: WorkerStatus;
};

export class WorkerError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'WorkerError';
  }
}

export class TaskTimeoutError extends WorkerError {
  constructor(ms: number) {
    super(`[workit] Task timed out after ${ms}ms`);
    this.name = 'TaskTimeoutError';
  }
}

export class TerminatedError extends WorkerError {
  constructor() {
    super('[workit] Worker was terminated');
    this.name = 'TerminatedError';
  }
}

export class TaskError extends WorkerError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'TaskError';
  }
}

type SlotMessage<TOutput> = { id: number; ok: true; result: TOutput } | { error: string; id: number; ok: false };

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
  return `const __fn=(${fn.toString()});self.onmessage=async function(event){const{id,input}=event.data;try{const result=await __fn(input);self.postMessage({id,ok:true,result});}catch(error){self.postMessage({id,ok:false,error:error instanceof Error?error.message:String(error)});}};`;
}

function createAbortError(signal: AbortSignal): unknown {
  if (signal.reason !== undefined) return signal.reason;

  if (typeof DOMException === 'function') {
    return new DOMException('Aborted', 'AbortError');
  }

  return new Error('Aborted');
}

function resolveConcurrency(value: WorkerOptions['concurrency']): number {
  if (value === undefined) return 1;

  if (value === 'auto') {
    return Math.max(1, globalThis.navigator?.hardwareConcurrency ?? 1);
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new WorkerError('[workit] `concurrency` must be a positive integer or "auto"');
  }

  return value;
}

function resolveTimeout(value: WorkerOptions['timeout']): number | undefined {
  if (value === undefined) return undefined;

  if (!Number.isFinite(value) || value < 0) {
    throw new WorkerError('[workit] `timeout` must be a finite number greater than or equal to 0');
  }

  return value;
}

function createNativeWorker(fn: TaskFn<unknown, unknown>): Worker {
  if (typeof globalThis.Worker !== 'function') {
    throw new WorkerError('[workit] Worker API is unavailable in this runtime');
  }

  try {
    const blob = new Blob([buildWorkerScript(fn)], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    try {
      return new Worker(url, { type: 'module' });
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    throw new WorkerError('[workit] Failed to create Worker', error);
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
      return Promise.reject(new TerminatedError());
    }

    const worker = this.ensureWorker();
    const id = ++this.taskId;

    return new Promise<TOutput>((resolve, reject) => {
      const pending: PendingTask<TOutput> = { id, reject, resolve };

      if (this.timeout !== undefined) {
        pending.timer = setTimeout(() => {
          if (this.pending?.id !== id) return;

          this.restart(new TaskTimeoutError(this.timeout!));
        }, this.timeout);
      }

      this.pending = pending;

      try {
        worker.postMessage({ id, input }, transfer);
      } catch (error) {
        this.failPending(new TaskError(error instanceof Error ? error.message : String(error), error));
      }
    });
  }

  terminate(): void {
    this.disposed = true;
    this.stopWorker();
    this.failPending(new TerminatedError());
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
        pending.reject(new TaskError(event.data.error));
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      this.restart(new TaskError(event.message));
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

    if (this.disposed) return;

    try {
      this.ensureWorker();
    } catch {
      // Defer the worker creation error to the next run(). The failing task has already settled.
    }
  }

  private stopWorker(): void {
    if (!this.worker) return;

    this.worker.terminate();
    this.worker = null;
  }
}

class WorkitImpl<TInput, TOutput> implements WorkerHandle<TInput, TOutput> {
  private readonly queue: QueueItem<TInput, TOutput>[] = [];
  private readonly slots: Slot<TInput, TOutput>[];
  private terminated = false;

  constructor(fn: TaskFn<TInput, TOutput>, options: WorkerOptions = {}) {
    const timeout = resolveTimeout(options.timeout);
    const concurrency = resolveConcurrency(options.concurrency);

    this.slots = Array.from({ length: concurrency }, () => new Slot(fn, timeout));
  }

  get concurrency(): number {
    return this.slots.length;
  }

  get status(): WorkerStatus {
    if (this.terminated) return 'terminated';

    if (this.queue.length > 0 || this.slots.some((slot) => slot.running)) return 'running';

    return 'idle';
  }

  run(input: TInput, options: RunOptions = {}): Promise<TOutput> {
    const { signal, transfer = [] } = options;

    if (this.terminated) {
      return Promise.reject(new TerminatedError());
    }

    if (signal?.aborted) {
      return Promise.reject(createAbortError(signal));
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
        };

        item.cleanupAbort = () => {
          signal.removeEventListener('abort', onAbort);
          item.cleanupAbort = undefined;
        };

        signal.addEventListener('abort', onAbort, { once: true });
      }

      this.queue.push(item);
      this.flush();
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
      item.reject(new TerminatedError());
    }
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

  private flush(): void {
    if (this.terminated) return;

    for (const slot of this.slots) {
      if (slot.running || this.queue.length === 0) continue;

      const item = this.nextItem();

      if (!item) break;

      item.cleanupAbort?.();
      slot.run(item.input, item.transfer).then(
        (result) => {
          item.resolve(result);
          this.flush();
        },
        (error: unknown) => {
          item.reject(error);
          this.flush();
        },
      );
    }
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
