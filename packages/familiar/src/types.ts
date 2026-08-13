import type { FamiliarRuntimeError } from './errors';

export type WorkerStatus = 'idle' | 'running' | 'terminated';

export type WorkerStats = {
  readonly active: number;
  readonly completed: number;
  readonly failed: number;
  readonly queued: number;
};

export type WorkerOptions = {
  /** Number of worker slots. Default: 1. Pass 'auto' to use navigator.hardwareConcurrency. */
  concurrency?: number | 'auto';
  /** Maximum queued operations. Default: unlimited. */
  maxQueue?: number;
  /** Reject new work or wait for queue capacity. Default: 'reject'. */
  onFull?: 'reject' | 'wait';
  /** Called after an unhandled worker runtime error. The failed slot is replaced lazily. */
  onSlotError?: (error: FamiliarRuntimeError) => void;
  /** Default timeout in milliseconds. Timed-out work terminates and replaces its worker slot. */
  timeout?: number;
};

export type RunOptions = {
  /** Higher values run before lower values. Equal values run FIFO. Default: 0. */
  priority?: number;
  /** Cancels queued, capacity-waiting, or executing work. */
  signal?: AbortSignal;
  /** Per-operation timeout in milliseconds. Overrides WorkerOptions.timeout. */
  timeout?: number;
  /** Values transferred to the worker instead of structured-cloned. */
  transferables?: Transferable[];
};

export type DrainOptions = {
  /** Maximum time to wait before terminating remaining work. */
  timeout?: number;
};

export interface WorkerPool<TInput, TOutput> {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  drain(options?: DrainOptions): Promise<void>;
  prime(): Promise<void>;
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
  readonly stats: WorkerStats;
  readonly status: WorkerStatus;
  [Symbol.asyncDispose](): Promise<void>;
  [Symbol.dispose](): void;
}

export interface StreamWorkerPool<TInput, TChunk> {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  drain(options?: DrainOptions): Promise<void>;
  prime(): Promise<void>;
  runStream(input: TInput, options?: RunOptions): AsyncIterable<TChunk>;
  readonly stats: WorkerStats;
  readonly status: WorkerStatus;
  [Symbol.asyncDispose](): Promise<void>;
  [Symbol.dispose](): void;
}

export type BatchOptions = RunOptions;

export type TaskGroup<TInput, TOutput> = {
  abort(reason?: unknown): void;
  drain(): Promise<PromiseSettledResult<TOutput>[]>;
  readonly name: string | undefined;
  readonly pending: number;
  run(input: TInput, options?: Omit<RunOptions, 'signal'>): Promise<TOutput>;
  readonly size: number;
};

export type TaskGroupOptions = {
  signal?: AbortSignal;
};

export type SlotStrategy<TInput, TOutput> = {
  cancel(reason: unknown): void;
  prime(): Promise<void>;
  run(input: TInput, transferables: Transferable[], timeout: number | undefined): Promise<TOutput>;
  terminate(): void;
};
