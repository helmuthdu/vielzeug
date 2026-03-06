/** -------------------- Core Types -------------------- **/

export type TaskFn<TInput, TOutput> = (input: TInput) => TOutput | Promise<TOutput>;

export type WorkerStatus = 'idle' | 'running' | 'terminated';

export type WorkerOptions = {
  /** Abort the task after this many milliseconds. Default: none */
  timeout?: number;
  /** Run in the main thread when Web Workers are unavailable. Default: true */
  fallback?: boolean;
  /** URLs of external scripts to load inside the Worker via importScripts(). */
  scripts?: string[];
};

export type PoolOptions = WorkerOptions & {
  /** Number of concurrent worker slots. Default: navigator.hardwareConcurrency ?? 4 */
  size?: number;
};

export type WorkerHandle<TInput, TOutput> = {
  /** Execute the task function with the given input */
  run(input: TInput): Promise<TOutput>;
  /** Terminate the worker and reject any pending tasks */
  terminate(): void;
  /** Current state of the worker */
  readonly status: WorkerStatus;
};

export type PoolHandle<TInput, TOutput> = {
  /** Run a task, queuing if all workers are busy */
  run(input: TInput, signal?: AbortSignal): Promise<TOutput>;
  /** Run multiple tasks concurrently, returning results in input order */
  runAll(inputs: TInput[], signal?: AbortSignal): Promise<TOutput[]>;
  /** Terminate all workers and reject queued tasks */
  terminate(): void;
  /** Number of worker slots in this pool */
  readonly size: number;
};

export type TestWorkerHandle<TInput, TOutput> = {
  /** The worker instance for use in tests */
  worker: WorkerHandle<TInput, TOutput>;
  /** Recorded { input, output } pairs in call order */
  calls: { input: TInput; output: TOutput }[];
  /** Terminate the worker and stop recording */
  dispose(): void;
};

/** -------------------- Internal: Worker Script Builder -------------------- **/

function buildWorkerScript<TInput, TOutput>(fn: TaskFn<TInput, TOutput>, scripts: string[] = []): string {
  const imports = scripts.length > 0 ? `importScripts(${scripts.map((s) => JSON.stringify(s)).join(',')});` : '';
  return `(function(){${imports}const __fn=(${fn.toString()});self.onmessage=async function(e){const{id,input}=e.data;try{const result=await __fn(input);self.postMessage({id,ok:true,result});}catch(err){self.postMessage({id,ok:false,error:String(err)});}};})();`;
}

function tryCreateNativeWorker<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
  options: WorkerOptions = {},
): Worker | null {
  try {
    if (typeof Worker === 'undefined') return null;
    const script = buildWorkerScript(fn, options.scripts);
    const blob = new Blob([script], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    if (!url) return null;
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    return worker;
  } catch {
    return null;
  }
}

/** -------------------- WorkerImpl -------------------- **/

type PendingTask<TOutput> = {
  resolve: (value: TOutput) => void;
  reject: (reason: unknown) => void;
  timer?: ReturnType<typeof setTimeout>;
};

class WorkerImpl<TInput, TOutput> {
  private _status: WorkerStatus = 'idle';
  private native: Worker | null;
  private readonly pending = new Map<number, PendingTask<TOutput>>();
  private nextId = 0;
  private readonly fn: TaskFn<TInput, TOutput>;
  private readonly options: WorkerOptions;

  constructor(fn: TaskFn<TInput, TOutput>, options: WorkerOptions = {}) {
    this.fn = fn;
    this.options = options;
    this.native = tryCreateNativeWorker(fn, options);
    if (!this.native && options.fallback === false) {
      throw new Error('[workit] Web Workers are unavailable and fallback is disabled');
    }
    if (this.native) {
      this.native.onmessage = (e: MessageEvent) => this.onMessage(e.data);
      this.native.onerror = (e: ErrorEvent) => this.onNativeError(e.message);
    }
  }

  get status(): WorkerStatus {
    return this._status;
  }

  run(input: TInput): Promise<TOutput> {
    if (this._status === 'terminated') {
      return Promise.reject(new Error('[workit] Worker has been terminated'));
    }
    const id = this.nextId++;
    this._status = 'running';
    return new Promise<TOutput>((resolve, reject) => {
      const task: PendingTask<TOutput> = { reject, resolve };
      if (this.options.timeout !== undefined) {
        task.timer = setTimeout(() => {
          this.pending.delete(id);
          if (this.pending.size === 0 && this._status !== 'terminated') this._status = 'idle';
          reject(new Error(`[workit] Task timed out after ${this.options.timeout}ms`));
        }, this.options.timeout);
      }
      this.pending.set(id, task);
      if (this.native) {
        this.native.postMessage({ id, input });
      } else {
        Promise.resolve()
          .then(() => this.fn(input))
          .then((result) => this.onMessage({ id, ok: true, result }))
          .catch((err: unknown) => this.onMessage({ error: String(err), id, ok: false }));
      }
    });
  }

  terminate(): void {
    if (this._status === 'terminated') return;
    this._status = 'terminated';
    this.native?.terminate();
    this.native = null;
    for (const task of this.pending.values()) {
      clearTimeout(task.timer);
      task.reject(new Error('[workit] Worker was terminated'));
    }
    this.pending.clear();
  }

  private onMessage(data: { id: number; ok: boolean; result?: TOutput; error?: string }): void {
    const task = this.pending.get(data.id);
    if (!task) return;
    clearTimeout(task.timer);
    this.pending.delete(data.id);
    if (this.pending.size === 0 && this._status !== 'terminated') this._status = 'idle';
    if (data.ok) {
      task.resolve(data.result as TOutput);
    } else {
      task.reject(new Error(data.error ?? 'Unknown worker error'));
    }
  }

  private onNativeError(message: string): void {
    for (const task of this.pending.values()) {
      clearTimeout(task.timer);
      task.reject(new Error(message));
    }
    this.pending.clear();
    if (this._status !== 'terminated') this._status = 'idle';
  }
}

/** -------------------- WorkerPoolImpl -------------------- **/

type PoolSlot<TInput, TOutput> = {
  impl: WorkerImpl<TInput, TOutput>;
  busy: boolean;
};

type QueueItem<TInput, TOutput> = {
  input: TInput;
  resolve: (value: TOutput) => void;
  reject: (reason: unknown) => void;
  signal?: AbortSignal;
};

class WorkerPoolImpl<TInput, TOutput> {
  private readonly slots: PoolSlot<TInput, TOutput>[];
  private readonly queue: QueueItem<TInput, TOutput>[] = [];
  private terminated = false;

  constructor(fn: TaskFn<TInput, TOutput>, options: PoolOptions = {}) {
    const count = Math.max(
      1,
      options.size ?? (typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency ?? 4) : 4),
    );
    this.slots = Array.from({ length: count }, () => ({
      busy: false,
      impl: new WorkerImpl(fn, options),
    }));
  }

  get size(): number {
    return this.slots.length;
  }

  run(input: TInput, signal?: AbortSignal): Promise<TOutput> {
    if (this.terminated) {
      return Promise.reject(new Error('[workit] Pool has been terminated'));
    }
    return new Promise<TOutput>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      const item: QueueItem<TInput, TOutput> = { input, reject, resolve, signal };
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

  runAll(inputs: TInput[], signal?: AbortSignal): Promise<TOutput[]> {
    return Promise.all(inputs.map((input) => this.run(input, signal)));
  }

  terminate(): void {
    this.terminated = true;
    for (const slot of this.slots) {
      slot.impl.terminate();
    }
    while (this.queue.length > 0) {
      this.queue.shift()!.reject(new Error('[workit] Pool was terminated'));
    }
  }

  private flush(): void {
    for (const slot of this.slots) {
      if (slot.busy || this.queue.length === 0) continue;
      // skip any items whose signal was already aborted
      let item: QueueItem<TInput, TOutput> | undefined;
      while (this.queue.length > 0) {
        const candidate = this.queue[0];
        if (candidate.signal?.aborted) {
          this.queue.shift();
        } else {
          item = this.queue.shift();
          break;
        }
      }
      if (!item) break;
      slot.busy = true;
      slot.impl.run(item.input).then(
        (result) => {
          slot.busy = false;
          item!.resolve(result);
          this.flush();
        },
        (err: unknown) => {
          slot.busy = false;
          item!.reject(err);
          this.flush();
        },
      );
    }
  }
}

/** -------------------- Factory Functions -------------------- **/

export function createWorker<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
  options?: WorkerOptions,
): WorkerHandle<TInput, TOutput> {
  return new WorkerImpl(fn, options);
}

export function createWorkerPool<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
  options?: PoolOptions,
): PoolHandle<TInput, TOutput> {
  return new WorkerPoolImpl(fn, options);
}

/** -------------------- Test Utilities -------------------- **/

export function createTestWorker<TInput, TOutput>(fn: TaskFn<TInput, TOutput>): TestWorkerHandle<TInput, TOutput> {
  const calls: { input: TInput; output: TOutput }[] = [];
  let terminated = false;

  const worker: WorkerHandle<TInput, TOutput> = {
    run(input: TInput): Promise<TOutput> {
      if (terminated) return Promise.reject(new Error('[workit] Worker has been terminated'));
      return Promise.resolve()
        .then(() => fn(input))
        .then((output) => {
          calls.push({ input, output });
          return output;
        });
    },
    get status(): WorkerStatus {
      return terminated ? 'terminated' : 'idle';
    },
    terminate() {
      terminated = true;
    },
  };

  return { calls, dispose: () => worker.terminate(), worker };
}
