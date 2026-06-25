/**
 * Shared types, error classes, and interface definitions for @vielzeug/familiar.
 * Not part of the public API surface — consumers import from the root entry point.
 */

import type { WorkerRuntimeError } from './errors';

// ─── Core types ───────────────────────────────────────────────────────────────

export type TaskFn<TInput, TOutput> = (input: TInput) => TOutput | Promise<TOutput>;

export type WorkerStatus = 'idle' | 'running' | 'terminated';

// ─── SlotStrategy — execution abstraction ────────────────────────────────────

/**
 * Execution abstraction consumed by `createPool`.
 * Implementors: `Slot` (real worker) and in-process executor (test double).
 */
export type SlotStrategy<TInput, TOutput> = {
  /**
   * Cancel the current in-flight task and stop the underlying worker without marking the slot as
   * permanently disposed. The slot can be reused immediately — a fresh worker will be created on
   * the next run() or runStream() call. Used for streaming early consumer exit (break/throw).
   */
  cancel(): void;
  prime(): Promise<void>;
  run(input: TInput, transferables: Transferable[], timeout: number | undefined): Promise<TOutput>;
  runStream(input: TInput, transferables: Transferable[], timeout: number | undefined): AsyncIterable<TOutput>;
  terminate(): void;
};

// ─── RunOptions ───────────────────────────────────────────────────────────────

export type RunOptions = {
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
  /**
   * Watchdog window in milliseconds applied to every task in the pool.
   * If the worker does not send a heartbeat message within this window, the task is
   * killed with WorkerTimeoutError. Useful for long-running CPU tasks that must stay responsive.
   * For inline workers the heartbeat is sent automatically at heartbeatWindow / 2 intervals.
   * Module workers must implement the heartbeat protocol manually.
   */
  heartbeatWindow?: number;
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

// ─── WorkerHandle — flat interface ────────────────────────────────────────────

/**
 * Full handle returned by `createWorker` and `createModuleWorker`.
 * All capabilities are on one flat interface — no need to cross-reference mixin types.
 */
export interface WorkerHandle<TInput, TOutput> {
  // ── Symbols ──

  [Symbol.asyncDispose](): Promise<void>;
  [Symbol.dispose](): void;

  // ── Lifecycle ──

  /** Gracefully drain queued/in-flight tasks then terminate workers. Rejects if timeoutMs elapses. */
  close(timeoutMs?: number): Promise<void>;
  /** `AbortSignal` aborted when the pool is terminated (via `dispose()` or `close()` settling). */
  readonly disposalSignal: AbortSignal;
  /** Terminate immediately, rejecting all in-flight and queued tasks. */
  dispose(): void;
  /** `true` after `dispose()` has been called or `close()` has settled. */
  readonly disposed: boolean;
  /** Pre-initialize all worker slots to reduce first-task latency. */
  prime(): Promise<void>;
  /** Current lifecycle state of the pool. */
  readonly status: WorkerStatus;

  // ── Metrics ──

  /** Number of slots currently executing a task. */
  readonly active: number;
  /** Number of successfully completed tasks since creation. */
  readonly completed: number;
  /** Number of worker slots. */
  readonly concurrency: number;
  /** Number of tasks that failed with a task / timeout / worker error (excludes aborts and terminations). */
  readonly failed: number;
  /** Number of active groups (created but not yet fully drained or aborted). */
  readonly groupCount: number;
  /** Number of queued tasks waiting to run (excludes cancelled/aborted items). */
  readonly queued: number;

  // ── Execution ──

  /**
   * Run all inputs through the pool and yield results.
   * By default yields in submission order. Pass ordered: false to yield as-completed.
   */
  batch(inputs: TInput[], options?: BatchOptions): AsyncIterable<TOutput>;
  /** Create a task group. All tasks share an AbortController and can be drained together. */
  group(name?: string, options?: GroupOptions): TaskGroup<TInput, TOutput>;
  /** Execute the task. Tasks are queued when all slots are busy. */
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
  /**
   * Run a streaming task and yield partial results as they arrive.
   * The worker function must return an async iterable; each yielded value is forwarded as a chunk.
   *
   * Unlike run(), streaming tasks cannot be queued — they require an immediately available slot.
   * Throws WorkerRuntimeError synchronously if all slots are busy.
   * Note: `signal` is not supported for streaming tasks (cannot be queued); use `break` to stop early.
   */
  runStream(input: TInput, options?: Omit<RunOptions, 'signal'>): AsyncIterable<TOutput>;
}

// ─── TaskGroup ────────────────────────────────────────────────────────────────

export type GroupOptions = {
  /**
   * When this signal is aborted, the group is aborted automatically.
   * Composable with `WorkerHandle.disposalSignal` to tie the group lifetime to the pool.
   */
  signal?: AbortSignal;
};

export type TaskGroup<TInput, TOutput> = {
  /** Cancel all pending tasks in this group. In-flight tasks run to natural completion. */
  abort(reason?: unknown): void;
  /**
   * Wait for all tasks submitted so far to settle.
   * Returns settled results — both fulfilled values and rejection reasons.
   * Tasks added after drain() starts are not included in this call.
   */
  drain(): Promise<PromiseSettledResult<TOutput>[]>;
  /** Optional name provided when the group was created. */
  readonly name: string | undefined;
  /** Number of tasks not yet settled (decrements as tasks complete). */
  readonly pending: number;
  /**
   * Submit a task to the pool, associating it with this group.
   * Throws `WorkerTerminatedError` synchronously if the pool has been disposed or is closing.
   */
  run(input: TInput, options?: Omit<RunOptions, 'signal'>): Promise<TOutput>;
  /** Total number of tasks ever submitted to this group (never decrements). */
  readonly size: number;
};
