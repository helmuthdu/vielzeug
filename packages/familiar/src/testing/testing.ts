import { createPool } from '../_pool';
import {
  FamiliarInvalidOptionsError,
  FamiliarTaskError,
  FamiliarTerminatedError,
  FamiliarTimeoutError,
} from '../errors';
import type { SlotStrategy, WorkerOptions, WorkerPool } from '../types';

export type TestWorkerOptions = Omit<WorkerOptions, 'concurrency' | 'onSlotError'> & { concurrency?: number };

export type TestWorkerCall<TInput, TOutput> =
  | { input: TInput; status: 'fulfilled'; value: TOutput }
  | { input: TInput; reason: unknown; status: 'rejected' };

export type TestWorkerHandle<TInput, TOutput> = WorkerPool<TInput, TOutput> & {
  readonly calls: ReadonlyArray<TestWorkerCall<TInput, TOutput>>;
};

export function createTestWorker<TInput, TOutput>(
  handler: (input: TInput) => TOutput | Promise<TOutput>,
  options: TestWorkerOptions = {},
): TestWorkerHandle<TInput, TOutput> {
  const { concurrency = 1, maxQueue, onFull = 'reject', timeout } = options;

  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new FamiliarInvalidOptionsError('`concurrency` must be a positive integer');
  }

  if (maxQueue !== undefined && (!Number.isInteger(maxQueue) || maxQueue < 1)) {
    throw new FamiliarInvalidOptionsError('`maxQueue` must be a positive integer');
  }

  if (timeout !== undefined && (!Number.isFinite(timeout) || timeout <= 0)) {
    throw new FamiliarInvalidOptionsError('`timeout` must be a finite number greater than 0');
  }

  const calls: TestWorkerCall<TInput, TOutput>[] = [];

  function makeSlot(): SlotStrategy<TInput, TOutput> {
    let current: { reject(reason: unknown): void; token: symbol } | undefined;
    let terminated = false;

    return {
      cancel(reason: unknown): void {
        current?.reject(reason);
        current = undefined;
      },
      prime: () => Promise.resolve(),
      run(input, transferables, timeoutMs): Promise<TOutput> {
        if (terminated) return Promise.reject(new FamiliarTerminatedError());

        let clonedInput: TInput;

        try {
          clonedInput = structuredClone(input, { transfer: transferables });
        } catch (error) {
          return Promise.reject(new FamiliarTaskError('Failed to clone task input', { cause: error }));
        }

        return new Promise<TOutput>((resolve, reject) => {
          const token = Symbol('task');
          let timer: ReturnType<typeof setTimeout> | undefined;
          const settle = (fn: (value: TOutput) => void, value: TOutput): void => {
            if (current?.token !== token) return;

            current = undefined;

            if (timer) clearTimeout(timer);

            fn(value);
          };
          const rejectTask = (reason: unknown): void => {
            if (current?.token !== token) return;

            current = undefined;

            if (timer) clearTimeout(timer);

            calls.push({ input: clonedInput, reason, status: 'rejected' });
            reject(reason);
          };

          current = { reject: rejectTask, token };

          if (timeoutMs !== undefined) {
            timer = setTimeout(() => rejectTask(new FamiliarTimeoutError(timeoutMs)), timeoutMs);
          }

          void Promise.resolve()
            .then(() => handler(clonedInput))
            .then(
              (output) => {
                let clonedOutput: TOutput;

                try {
                  clonedOutput = structuredClone(output);
                } catch (error) {
                  rejectTask(new FamiliarTaskError('Failed to clone task output', { cause: error }));

                  return;
                }

                if (current?.token !== token) return;

                calls.push({ input: clonedInput, status: 'fulfilled', value: clonedOutput });
                settle(resolve, clonedOutput);
              },
              (error: unknown) => {
                const cause = error instanceof Error ? error : new Error(String(error));

                rejectTask(new FamiliarTaskError(cause.message, { cause }));
              },
            );
        });
      },
      terminate(): void {
        terminated = true;
        current?.reject(new FamiliarTerminatedError());
        current = undefined;
      },
    };
  }

  const pool = createPool(Array.from({ length: concurrency }, makeSlot), {
    concurrency,
    defaultTimeout: timeout,
    maxQueue,
    onFull,
  });

  Object.defineProperty(pool, 'calls', {
    enumerable: true,
    get: () => calls as ReadonlyArray<TestWorkerCall<TInput, TOutput>>,
  });

  return pool as TestWorkerHandle<TInput, TOutput>;
}

export {
  FamiliarError,
  FamiliarInvalidOptionsError,
  FamiliarQueueFullError,
  FamiliarRuntimeError,
  FamiliarTaskError,
  FamiliarTerminatedError,
  FamiliarTimeoutError,
} from '../errors';
export type { WorkerPool } from '../types';
