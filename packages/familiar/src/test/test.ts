import type { RunOptions, WorkerHandle, WorkerStatus } from '../_types';

import { createPool, type Executor } from '../_pool';
import { WorkerInvalidOptionsError } from '../_types';

export type TestWorkerOptions = {
  /**
   * Number of concurrent in-process execution slots. Default: 1 for deterministic test ordering.
   * Increase only when testing concurrency-specific behavior.
   */
  concurrency?: number;
  maxQueue?: number;
  /** 'wait' suspends run() callers when the queue is full instead of rejecting. */
  onFull?: 'reject' | 'wait';
};

export type TestWorkerHandle<TInput, TOutput> = WorkerHandle<TInput, TOutput> & {
  /** Recorded { input, output } pairs for every successful run(), in call order. */
  readonly calls: ReadonlyArray<{ input: TInput; output: TOutput }>;
};

export function createTestWorker<TInput, TOutput>(
  fn: (input: TInput) => TOutput | Promise<TOutput>,
  options: TestWorkerOptions = {},
): TestWorkerHandle<TInput, TOutput> {
  const { concurrency = 1, maxQueue, onFull = 'reject' } = options;

  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new WorkerInvalidOptionsError('`concurrency` must be a positive integer');
  }

  if (maxQueue !== undefined && (!Number.isInteger(maxQueue) || maxQueue < 1)) {
    throw new WorkerInvalidOptionsError('`maxQueue` must be a positive integer');
  }

  const calls: { input: TInput; output: TOutput }[] = [];

  // The executor runs the task function directly in-process.
  // Errors from fn propagate naturally without wrapping — this improves test DX because
  // vitest assertion errors (AssertionError) surface directly rather than wrapped in WorkerError.
  // If your code tests for `error instanceof WorkerError`, use the real worker instead.
  const executor: Executor<TInput, TOutput> = async (input) => {
    const output = await fn(input);

    calls.push({ input, output });

    return output;
  };

  const pool = createPool(executor, {
    concurrency,
    defaultTimeout: undefined,
    maxQueue,
    onFull,
  });

  // Use Object.defineProperty so the `calls` getter is a true accessor descriptor (R8).
  // Object.assign would invoke the getter at assignment time and copy the array reference as
  // a data property — correct today due to reference semantics but fragile and misleading.
  Object.defineProperty(pool, 'calls', {
    enumerable: true,
    get(): ReadonlyArray<{ input: TInput; output: TOutput }> {
      return calls;
    },
  });

  return pool as unknown as TestWorkerHandle<TInput, TOutput>;
}

// Re-export types consumed by test files so they don't need to import from two places.
export type { RunOptions, WorkerHandle, WorkerStatus };
export {
  WorkerError,
  WorkerInvalidOptionsError,
  WorkerQueueFullError,
  WorkerRuntimeError,
  WorkerTaskError,
  WorkerTerminatedError,
  WorkerTimeoutError,
} from '../_types';
