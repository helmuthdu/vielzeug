/**
 * Shared types and the WorkerError class. Extracted to a separate module to break the circular
 * dependency between _pool.ts (which uses WorkerError) and worker.ts (which provides the public
 * API surface including WorkerError).
 *
 * Not part of the public API surface — consumers import from the root entry point.
 */

export type TaskFn<TInput, TOutput> = (input: TInput) => TOutput | Promise<TOutput>;

export type WorkerStatus = 'idle' | 'running' | 'terminated';

export type WorkerErrorCode = 'invalid_options' | 'queue_full' | 'task' | 'terminated' | 'timeout' | 'worker';

export type RunOptions = {
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

export type WorkerOptions = {
  /** Number of concurrent worker slots. Default: 1. Pass 'auto' to use navigator.hardwareConcurrency. */
  concurrency?: number | 'auto';
  /** Maximum queued tasks. When onFull='reject', exceeding this rejects with queue_full. Default: unlimited. */
  maxQueue?: number;
  /**
   * When 'wait', run() suspends the caller when the queue is full instead of rejecting. Useful
   * for large producer→consumer pipelines to apply natural backpressure. Default: 'reject'.
   */
  onFull?: 'reject' | 'wait';
  /** Abort tasks after this many milliseconds. Can be overridden per-run via RunOptions. Default: none. */
  timeout?: number;
};

export type WorkerHandle<TInput, TOutput> = {
  [Symbol.asyncDispose](): Promise<void>;
  [Symbol.dispose](): void;
  /** Number of slots currently executing a task. */
  readonly active: number;
  /**
   * Run all inputs through the pool and yield results.
   * By default yields in submission order. Pass `ordered: false` to yield as-completed.
   */
  batch(inputs: TInput[], options?: BatchOptions): AsyncIterable<TOutput>;
  /** Gracefully stop: drain queued/in-flight tasks then terminate workers. Rejects if timeoutMs elapses. */
  close(timeoutMs?: number): Promise<void>;
  /** Number of successfully completed tasks. */
  readonly completed: number;
  /** Number of worker slots. */
  readonly concurrency: number;
  /** Terminate immediately, rejecting all in-flight and queued tasks. */
  dispose(): void;
  /** Number of tasks that failed with a task / timeout / worker error (excludes aborts and terminations). */
  readonly failed: number;
  /**
   * Create a task group: a set of related tasks that can be awaited and cancelled together.
   * All tasks in the group share an AbortController and can be drained as a unit.
   */
  group(): TaskGroup<TInput, TOutput>;
  /** Pre-initialize all worker slots to reduce first-task latency. Returns when all slots are ready. */
  prime(): Promise<void>;
  /** Number of queued tasks waiting to run. */
  readonly queued: number;
  /**
   * Execute the task function.
   *
   * IMPORTANT: The task function is serialized via `.toString()` and runs in a separate global
   * scope. It cannot close over variables from the surrounding module.
   */
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
  /**
   * Run a task and yield a stream of partial results.
   * The worker function must call self.postMessage({ id, chunk }) for each partial value and
   * self.postMessage({ id, result }) to signal completion.
   */
  runStream(input: TInput, options?: Omit<RunOptions, 'signal'>): AsyncIterable<TOutput>;
  /** Current state. */
  readonly status: WorkerStatus;
  /** Fraction of worker slots currently executing a task. */
  readonly utilization: number;
};

/**
 * A group of related tasks submitted to a pool. Tasks in the group share an AbortController
 * so they can all be cancelled together. Use drain() to await all of them.
 */
export type TaskGroup<TInput, TOutput> = {
  /** Cancel all pending and in-flight tasks in this group. */
  abort(reason?: unknown): void;
  /** Drain: wait for all tasks in this group to settle. Rejects on the first task error. */
  drain(): Promise<void>;
  /** Submit a task to the pool, associating it with this group. */
  run(input: TInput, options?: Omit<RunOptions, 'signal'>): Promise<TOutput>;
  /** Number of tasks submitted to this group. */
  readonly size: number;
};

export class WorkerError extends Error {
  readonly code: WorkerErrorCode;

  constructor(code: WorkerErrorCode, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'WorkerError';
    this.code = code;
  }
}
