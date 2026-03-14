/** -------------------- Public Types -------------------- **/

export type TaskFn<TInput, TOutput> = (input: TInput) => TOutput | Promise<TOutput>;

export type WorkerStatus = 'idle' | 'running' | 'terminated';

export type WorkerOptions = {
  /** Run on the main thread when Web Workers are unavailable. Default: true. */
  fallback?: boolean;
  /** URLs of external scripts to load inside the Worker via importScripts(). */
  scripts?: string[];
  /** Number of concurrent worker slots. Default: 1. Pass 'auto' to use navigator.hardwareConcurrency. */
  size?: number | 'auto';
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
  /** Enables `using` keyword (ES2025 explicit resource management). */
  [Symbol.dispose](): void;
  /** Dispose all workers and reject any pending tasks. */
  dispose(): void;
  /** True when tasks run in a real Web Worker; false when falling back to the main thread. */
  readonly isNative: boolean;
  /**
   * Execute the task function.
   *
   * IMPORTANT: The task function is serialized via `.toString()` and runs in a separate global
   * scope. It CANNOT close over variables from the surrounding module — outer-scope references
   * will be `undefined` inside the Worker. Keep task functions entirely self-contained.
   */
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
  /** Number of worker slots. */
  readonly size: number;
  /** Current state. */
  readonly status: WorkerStatus;
};

/** -------------------- Error Classes -------------------- **/

export class WorkerError extends Error {}

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

/**
 * Thrown when a task function throws. The message is the stringified original error.
 *
 * NOTE: `cause` is only populated in fallback (main-thread) mode. In native Worker mode the error
 * crosses the message boundary as a string, so `cause` will always be `undefined`. Do not rely on
 * `instanceof` checks against `cause` in production code.
 */
export class TaskError extends WorkerError {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'TaskError';
  }
}

/** -------------------- Internal: Script Builder -------------------- **/

function buildWorkerScript(fn: TaskFn<unknown, unknown>, scripts: string[] = []): string {
  const imports = scripts.length > 0 ? `importScripts(${scripts.map((s) => JSON.stringify(s)).join(',')});` : '';

  return `(function(){${imports}const __fn=(${fn.toString()});self.onmessage=async function(e){const{id,input}=e.data;try{const result=await __fn(input);self.postMessage({id,ok:true,result});}catch(err){self.postMessage({id,ok:false,error:err instanceof Error?err.message:String(err)});}};})();`;
}

function tryCreateNativeWorker(fn: TaskFn<unknown, unknown>, scripts?: string[]): Worker | null {
  try {
    if (typeof Worker === 'undefined') return null;

    const script = buildWorkerScript(fn, scripts);
    const blob = new Blob([script], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    URL.revokeObjectURL(url);

    return worker;
  } catch {
    return null;
  }
}

/** -------------------- Slot -------------------- **/

type PendingSlot<TOutput> = {
  reject: (reason: unknown) => void;
  resolve: (value: TOutput) => void;
  timer?: ReturnType<typeof setTimeout>;
};

type SlotMessage<TOutput> =
  | { id: number; ok: true; result: TOutput }
  | { cause?: unknown; error: string; id: number; ok: false };

class Slot<TInput, TOutput> {
  readonly isNative: boolean;
  busy = false;
  private taskId = 0;
  private readonly native: Worker | null;
  private readonly fn: TaskFn<TInput, TOutput>;
  private readonly timeout: number | undefined;
  private pending: PendingSlot<TOutput> | null = null;

  constructor(fn: TaskFn<TInput, TOutput>, options: WorkerOptions) {
    this.fn = fn;
    this.timeout = options.timeout;
    this.native = tryCreateNativeWorker(fn as TaskFn<unknown, unknown>, options.scripts);
    this.isNative = this.native !== null;

    if (!this.native && options.fallback === false) {
      throw new Error('[workit] Web Workers are unavailable and fallback is disabled');
    }

    if (this.native) {
      this.native.onmessage = (e: MessageEvent<SlotMessage<TOutput>>) => this.onMessage(e.data);
      this.native.onerror = (e: ErrorEvent) => this.onMessage({ error: e.message, id: this.taskId, ok: false });
    }
  }

  run(input: TInput, transfer: Transferable[] = []): Promise<TOutput> {
    const id = ++this.taskId;

    return new Promise((resolve, reject) => {
      const pending: PendingSlot<TOutput> = { reject, resolve };
      const ms = this.timeout;

      if (ms !== undefined) {
        pending.timer = setTimeout(() => {
          this.pending = null;
          reject(new TaskTimeoutError(ms));
        }, ms);
      }

      this.pending = pending;

      if (this.native) {
        this.native.postMessage({ id, input }, transfer);
      } else {
        Promise.resolve()
          .then(() => this.fn(input))
          .then((result) => this.onMessage({ id, ok: true, result }))
          .catch((err: unknown) =>
            this.onMessage({ cause: err, error: err instanceof Error ? err.message : String(err), id, ok: false }),
          );
      }
    });
  }

  terminate(): void {
    this.native?.terminate();

    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(new TerminatedError());
      this.pending = null;
    }
  }

  private onMessage(data: SlotMessage<TOutput>): void {
    if (!this.pending || data.id !== this.taskId) return;

    const { reject, resolve, timer } = this.pending;

    clearTimeout(timer);
    this.pending = null;

    if (data.ok) {
      resolve(data.result);
    } else {
      reject(new TaskError(data.error, data.cause));
    }
  }
}

/** -------------------- WorkitImpl -------------------- **/

type QueueItem<TInput, TOutput> = {
  input: TInput;
  reject: (reason: unknown) => void;
  resolve: (value: TOutput) => void;
  signal?: AbortSignal;
  transfer: Transferable[];
};

class WorkitImpl<TInput, TOutput> {
  private readonly slots: Slot<TInput, TOutput>[];
  private readonly queue: QueueItem<TInput, TOutput>[] = [];
  private terminated = false;

  constructor(fn: TaskFn<TInput, TOutput>, options: WorkerOptions = {}) {
    const cpuCount = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency ?? 4) : 4;
    const count = Math.max(1, options.size === 'auto' ? cpuCount : (options.size ?? 1));

    this.slots = Array.from({ length: count }, () => new Slot(fn, options));

    if (!this.slots[0]!.isNative) {
      console.warn('[workit] Web Workers unavailable, running tasks on the main thread');
    }
  }

  get size(): number {
    return this.slots.length;
  }

  get isNative(): boolean {
    return this.slots[0]!.isNative;
  }

  get status(): WorkerStatus {
    if (this.terminated) return 'terminated';

    if (this.slots.some((s) => s.busy) || this.queue.length > 0) return 'running';

    return 'idle';
  }

  run(input: TInput, options: RunOptions = {}): Promise<TOutput> {
    const { signal, transfer = [] } = options;

    if (this.terminated) return Promise.reject(new TerminatedError());

    return new Promise<TOutput>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));

        return;
      }

      const item: QueueItem<TInput, TOutput> = { input, reject, resolve, signal, transfer };

      if (signal) {
        signal.addEventListener(
          'abort',
          () => {
            const idx = this.queue.indexOf(item);

            if (idx !== -1) {
              this.queue.splice(idx, 1);
              reject(new DOMException('Aborted', 'AbortError'));
            }
          },
          { once: true },
        );
      }

      this.queue.push(item);
      this.flush();
    });
  }

  dispose(): void {
    if (this.terminated) return;

    this.terminated = true;
    for (const slot of this.slots) slot.terminate();

    while (this.queue.length > 0) this.queue.shift()!.reject(new TerminatedError());
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  private nextItem(): QueueItem<TInput, TOutput> | undefined {
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      if (!item.signal?.aborted) return item;
    }
  }

  private flush(): void {
    for (const slot of this.slots) {
      if (slot.busy || this.queue.length === 0) continue;

      const item = this.nextItem();

      if (!item) break;

      slot.busy = true;
      slot.run(item.input, item.transfer).then(
        (result) => {
          slot.busy = false;
          item.resolve(result);
          this.flush();
        },
        (err: unknown) => {
          slot.busy = false;
          item.reject(err);
          this.flush();
        },
      );
    }
  }
}

/** -------------------- Factory Function -------------------- **/

/**
 * Creates a pool of Web Workers that run `fn` in parallel.
 *
 * IMPORTANT: The task function is serialized via `.toString()` and runs in a separate global
 * scope. It CANNOT close over variables from the surrounding module — outer-scope references
 * will be `undefined` inside the Worker. Keep task functions entirely self-contained.
 */
export function createWorker<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
  options?: WorkerOptions,
): WorkerHandle<TInput, TOutput> {
  return new WorkitImpl(fn, options);
}
