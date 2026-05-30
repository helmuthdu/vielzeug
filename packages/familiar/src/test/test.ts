import type { RunOptions, WorkerHandle, WorkerStatus } from '../_types';

import { type Executor, createPool } from '../_pool';
import { WorkerError } from '../_types';

export type TestWorkerOptions = {
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
  const { maxQueue, onFull = 'reject' } = options;

  if (maxQueue !== undefined && (!Number.isInteger(maxQueue) || maxQueue < 1)) {
    throw new WorkerError('invalid_options', '`maxQueue` must be a positive integer');
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
    concurrency: 1,
    defaultTimeout: undefined,
    maxQueue,
    onFull,
  });

  return Object.assign(pool, {
    get calls(): ReadonlyArray<{ input: TInput; output: TOutput }> {
      return calls;
    },
  }) as TestWorkerHandle<TInput, TOutput>;
}

// Re-export types consumed by test files so they don't need to import from two places.
export type { RunOptions, WorkerHandle, WorkerStatus };
export { WorkerError };
