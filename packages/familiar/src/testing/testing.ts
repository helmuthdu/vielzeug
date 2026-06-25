import type { SlotStrategy, WorkerHandle, WorkerStatus } from '../types';

import { createPool } from '../_pool';
import {
  FamiliarInvalidOptionsError,
  FamiliarRuntimeError,
  FamiliarTaskError,
  FamiliarTerminatedError,
} from '../errors';

export type TestWorkerOptions = {
  /**
   * Number of concurrent in-process execution slots. Default: 1 for deterministic test ordering.
   * Increase only when testing concurrency-specific behavior.
   */
  concurrency?: number;
  /**
   * When true, errors from fn are wrapped in FamiliarTaskError/FamiliarRuntimeError, mirroring
   * real worker behavior. Default: false (errors propagate unwrapped for better test DX).
   */
  errorWrapping?: boolean;
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
  const { concurrency = 1, errorWrapping = false, maxQueue, onFull = 'reject' } = options;

  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new FamiliarInvalidOptionsError('`concurrency` must be a positive integer');
  }

  if (maxQueue !== undefined && (!Number.isInteger(maxQueue) || maxQueue < 1)) {
    throw new FamiliarInvalidOptionsError('`maxQueue` must be a positive integer');
  }

  const calls: { input: TInput; output: TOutput }[] = [];

  /**
   * In-process SlotStrategy. Errors propagate unwrapped by default (better test DX:
   * vitest AssertionErrors surface directly). Set errorWrapping: true to mirror real worker
   * behavior (useful when testing code that checks `error instanceof FamiliarError`).
   */
  function makeSlot(): SlotStrategy<TInput, TOutput> {
    let terminated = false;

    return {
      cancel(): void {
        // No-op: in-process tasks cannot be cancelled mid-flight.
      },

      prime(): Promise<void> {
        return Promise.resolve();
      },

      async run(input: TInput, _transferables: Transferable[], _timeout: number | undefined): Promise<TOutput> {
        if (terminated) return Promise.reject(new FamiliarTerminatedError());

        try {
          const output = await fn(input);

          calls.push({ input, output });

          return output;
        } catch (e) {
          if (!errorWrapping) throw e;

          const err = e instanceof Error ? e : new Error(String(e));

          throw new FamiliarTaskError(err.message, err);
        }
      },

      runStream(_input: TInput, _transferables: Transferable[], _timeout: number | undefined): AsyncIterable<TOutput> {
        return {
          [Symbol.asyncIterator]() {
            return {
              next(): Promise<IteratorResult<TOutput>> {
                return Promise.reject(new FamiliarRuntimeError('runStream() is not supported by createTestWorker'));
              },
            };
          },
        };
      },

      terminate(): void {
        terminated = true;
      },
    };
  }

  const slots = Array.from({ length: concurrency }, makeSlot);

  const pool = createPool(slots, {
    concurrency,
    defaultTimeout: undefined,
    maxQueue,
    onFull,
  });

  // Use Object.defineProperty so the `calls` getter is a true accessor descriptor.
  Object.defineProperty(pool, 'calls', {
    enumerable: true,
    get(): ReadonlyArray<{ input: TInput; output: TOutput }> {
      return calls;
    },
  });

  return pool as unknown as TestWorkerHandle<TInput, TOutput>;
}

// Re-export types consumed by test files so they don't need to import from two places.
export type { WorkerHandle, WorkerStatus };
export {
  FamiliarError,
  FamiliarInvalidOptionsError,
  FamiliarQueueFullError,
  FamiliarRuntimeError,
  FamiliarTaskError,
  FamiliarTerminatedError,
  FamiliarTimeoutError,
} from '../errors';
