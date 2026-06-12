/**
 * Shared types, error classes, and interface definitions for @vielzeug/familiar.
 * Not part of the public API surface — consumers import from the root entry point.
 */

// ─── Protocol version ─────────────────────────────────────────────────────────

/**
 * Current host↔worker message protocol version.
 * Increment when the protocol changes in a breaking way.
 * Module workers (createModuleWorker) may send { protocol: PROTOCOL_VERSION } on startup
 * as a debugging convention so developers can detect version skew from cached workers.
 * The host does not validate this value at runtime — it is informational only.
 */
export const PROTOCOL_VERSION = 2 as const;

// ─── Core types ───────────────────────────────────────────────────────────────

export type TaskFn<TInput, TOutput> = (input: TInput) => TOutput | Promise<TOutput>;

export type WorkerStatus = 'idle' | 'running' | 'terminated';

export type WorkerErrorCode = 'invalid_options' | 'queue_full' | 'task' | 'terminated' | 'timeout' | 'worker';

// ─── RunOptions ───────────────────────────────────────────────────────────────

export type RunOptions = {
  /**
   * Watchdog timeout in milliseconds. If the worker does not send a heartbeat message
   * ({ id, heartbeat: true }) within this window, the task is killed with WorkerTimeoutError.
   * Useful for long-running CPU tasks that should remain responsive.
   * For inline workers the heartbeat is sent automatically at heartbeatTimeout / 2 intervals.
   */
  heartbeatTimeout?: number;
  /**
   * Task scheduling priority. Higher values run before lower values when tasks queue up.
   * Within the same priority, tasks run FIFO. Default: 0.
   */
  priority?: number;
  /** AbortSignal to cancel a queued task. Note: in-flight tasks cannot be cancelled. */
  signal?: AbortSignal;
  /** Per-run timeout in milliseconds. Overrides the pool-level timeout for this task only. */
  timeout?: number;
  /** Transferable objects to move to the worker thread (avoids structured-clone copy). */
  transferables?: Transferable[];
};

export type BatchOptions = Omit<RunOptions, 'signal'> & {
  /**
   * When false, results are yielded as each task completes (out-of-submission order, maximum
   * throughput). Default: true (results are yielded in submission order).
   */
  ordered?: boolean;
};

// ─── WorkerOptions ────────────────────────────────────────────────────────────

export type WorkerOptions = {
  /** Number of concurrent worker slots. Default: 1. Pass 'auto' to use navigator.hardwareConcurrency. */
  concurrency?: number | 'auto';
  /** Maximum queued tasks. When onFull='reject', exceeding this limit rejects with WorkerQueueFullError. Default: unlimited. */
  maxQueue?: number;
  /**
   * When 'wait', run() suspends the caller when the queue is full instead of rejecting.
   * Useful for large producer→consumer pipelines to apply natural backpressure. Default: 'reject'.
   */
  onFull?: 'reject' | 'wait';
  /**
   * Called when a Worker slot encounters an unhandled runtime error (worker.onerror).
   * The slot stops automatically; call restart() to pre-warm the replacement Worker.
   * If omitted, errors are handled silently and the slot restarts on the next run() call.
   */
  onSlotError?: (error: WorkerRuntimeError, restart: () => void) => void;
  /** Default task timeout in milliseconds. Can be overridden per-run via RunOptions. Default: none. */
  timeout?: number;
};

// ─── WorkerHandle — split into composable mixin types (R10) ──────────────────

/** Core worker pool API: submit tasks, close gracefully, terminate immediately. */
export type WorkerPool<TInput, TOutput> = {
  [Symbol.asyncDispose](): Promise<void>;
  [Symbol.dispose](): void;
  /** Gracefully drain queued/in-flight tasks then terminate workers. Rejects if timeoutMs elapses. */
  close(timeoutMs?: number): Promise<void>;
  /** Terminate immediately, rejecting all in-flight and queued tasks. */
  dispose(): void;
  /**
   * Execute the task function.
   *
   * IMPORTANT: The task function is serialized via .toString() and runs in a separate global
   * scope. It cannot close over variables from the surrounding module.
   */
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
  /** Current lifecycle state of the pool. */
  readonly status: WorkerStatus;
};

/** Live operational metrics for a worker pool. */
export type WorkerMetrics = {
  /** Number of slots currently executing a task. */
  readonly active: number;
  /** Number of successfully completed tasks since creation. */
  readonly completed: number;
  /** Number of worker slots. */
  readonly concurrency: number;
  /** Number of tasks that failed with a task / timeout / worker error (excludes aborts and terminations). */
  readonly failed: number;
  /** Number of queued tasks waiting to run (accurate: excludes cancelled/aborted items). */
  readonly queued: number;
  /** Fraction of worker slots currently executing a task (0–1). */
  readonly utilization: number;
};

/** Batch and streaming task capabilities. */
export type StreamingWorker<TInput, TOutput> = {
  /**
   * Run all inputs through the pool and yield results.
   * By default yields in submission order. Pass ordered: false to yield as-completed
   * (results arrive in completion order, maximizing throughput).
   */
  batch(inputs: TInput[], options?: BatchOptions): AsyncIterable<TOutput>;
  /**
   * Run a streaming task and yield partial results as they arrive.
   * The worker function must return an async iterable; each yielded value is forwarded to
   * the host as a chunk.
   *
   * Unlike run(), streaming tasks cannot be queued — they require an immediately available
   * worker slot. If all slots are busy, the iterable throws WorkerRuntimeError on the first
   * next() call. Use run() for queueable work.
   */
  runStream(input: TInput, options?: Omit<RunOptions, 'signal'>): AsyncIterable<TOutput>;
};

/** Task grouping: submit related tasks that can be cancelled and awaited as a unit. */
export type GroupableWorker<TInput, TOutput> = {
  /**
   * Create a task group. All tasks submitted via group.run() share an AbortController
   * and can be drained or cancelled together.
   */
  group(): TaskGroup<TInput, TOutput>;
};

/** Worker slot pre-initialization. */
export type PrimableWorker = {
  /** Pre-initialize all worker slots to reduce first-task latency. */
  prime(): Promise<void>;
};

/** Full worker handle — the complete intersection of all capability types. */
export type WorkerHandle<TInput, TOutput> = WorkerPool<TInput, TOutput> &
  WorkerMetrics &
  StreamingWorker<TInput, TOutput> &
  GroupableWorker<TInput, TOutput> &
  PrimableWorker;

// ─── TaskGroup ────────────────────────────────────────────────────────────────

export type TaskGroup<TInput, TOutput> = {
  /** Cancel all pending tasks in this group. In-flight tasks run to natural completion. */
  abort(reason?: unknown): void;
  /**
   * Wait for all tasks in this group to settle (success or failure).
   * Throws the first error encountered, only after all tasks have settled —
   * preventing unhandled promise rejections for subsequent failures.
   */
  drain(): Promise<void>;
  /** Submit a task to the pool, associating it with this group. */
  run(input: TInput, options?: Omit<RunOptions, 'signal'>): Promise<TOutput>;
  /** Number of tasks submitted to this group. */
  readonly size: number;
};

// ─── Transferable type helpers (F5) ──────────────────────────────────────────

/**
 * Type annotation indicating a value is transferable (avoids structured-clone overhead).
 * Pass the value in RunOptions.transferables to move it to the worker thread.
 *
 * @example
 * const worker = createWorker<Transfer<ArrayBuffer>, number>((buf) => buf.byteLength);
 * const buf = new ArrayBuffer(8);
 * await worker.run(buf, { transferables: [buf] });
 */
export type Transfer<T extends Transferable> = T;

// ─── Typed WorkerError hierarchy (F6) ────────────────────────────────────────

/** Base class for all worker errors. Use instanceof checks against subclasses for specificity. */
export class WorkerError extends Error {
  readonly code: WorkerErrorCode;

  constructor(code: WorkerErrorCode, message: string, cause?: unknown) {
    super(`[@vielzeug/familiar] ${message}`, { cause });
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
    this.code = code;
  }

  static is(err: unknown): err is WorkerError {
    return err instanceof WorkerError;
  }
}

/** Thrown when a task exceeds its timeout or close() times out. */
export class WorkerTimeoutError extends WorkerError {
  /** The configured timeout in milliseconds. */
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super('timeout', `Task timed out after ${timeoutMs}ms`);
    this.timeoutMs = timeoutMs;
  }

  static is(err: unknown): err is WorkerTimeoutError {
    return err instanceof WorkerTimeoutError;
  }
}

/** Thrown when the task function throws. The original error is available as .cause. */
export class WorkerTaskError extends WorkerError {
  constructor(message: string, cause?: unknown) {
    super('task', message, cause);
  }

  static is(err: unknown): err is WorkerTaskError {
    return err instanceof WorkerTaskError;
  }
}

/** Thrown when run() is called and the queue is full (onFull='reject'). */
export class WorkerQueueFullError extends WorkerError {
  /** The configured maxQueue value. */
  readonly maxQueue: number;

  constructor(maxQueue: number) {
    super('queue_full', `Queue is full (maxQueue=${maxQueue})`);
    this.maxQueue = maxQueue;
  }

  static is(err: unknown): err is WorkerQueueFullError {
    return err instanceof WorkerQueueFullError;
  }
}

/** Thrown when a task or operation is rejected because the worker was terminated. */
export class WorkerTerminatedError extends WorkerError {
  constructor(message = 'Worker was terminated') {
    super('terminated', message);
  }

  static is(err: unknown): err is WorkerTerminatedError {
    return err instanceof WorkerTerminatedError;
  }
}

/** Thrown when the Worker API is unavailable or an unhandled error occurs in the worker thread. */
export class WorkerRuntimeError extends WorkerError {
  constructor(message: string, cause?: unknown) {
    super('worker', message, cause);
  }

  static is(err: unknown): err is WorkerRuntimeError {
    return err instanceof WorkerRuntimeError;
  }
}

/** Thrown when invalid options are passed to createWorker or createModuleWorker. */
export class WorkerInvalidOptionsError extends WorkerError {
  constructor(message: string) {
    super('invalid_options', message);
  }

  static is(err: unknown): err is WorkerInvalidOptionsError {
    return err instanceof WorkerInvalidOptionsError;
  }
}
