import type { RunOptions, TaskFn, WorkerHandle, WorkerStatus } from '../workit';

import { createAbortError } from '../_internal';
import { TerminatedError } from '../workit';

export type TestWorkerHandle<TInput, TOutput> = WorkerHandle<TInput, TOutput> & {
  /** Recorded { input, output } pairs for every successful run(), in call order. */
  readonly calls: ReadonlyArray<{ input: TInput; output: TOutput }>;
};

export function createTestWorker<TInput, TOutput>(fn: TaskFn<TInput, TOutput>): TestWorkerHandle<TInput, TOutput> {
  const calls: { input: TInput; output: TOutput }[] = [];
  let status: WorkerStatus = 'idle';
  let running = false;
  const queue: Array<{
    input: TInput;
    reject: (reason: unknown) => void;
    resolve: (value: TOutput) => void;
    signal?: AbortSignal;
  }> = [];

  function updateStatus(): void {
    if (status === 'terminated') return;

    status = running || queue.length > 0 ? 'running' : 'idle';
  }

  async function processQueue(): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift();

      if (!item) break;

      if (item.signal?.aborted) {
        item.reject(createAbortError(item.signal));
        updateStatus();
        continue;
      }

      running = true;
      updateStatus();

      try {
        const output = await fn(item.input);

        calls.push({ input: item.input, output });
        item.resolve(output);
      } catch (error) {
        item.reject(error);
      }

      running = false;
      updateStatus();
    }
  }

  return {
    get calls(): ReadonlyArray<{ input: TInput; output: TOutput }> {
      return calls;
    },
    get concurrency(): number {
      return 1;
    },
    dispose(): void {
      status = 'terminated';
      for (const item of queue) item.reject(new TerminatedError());
      queue.length = 0;
    },
    drain(): Promise<void> {
      return new Promise<void>((resolve) => {
        const check = (): void => {
          if (queue.length === 0 && !running) {
            resolve();
          } else {
            setTimeout(check, 0);
          }
        };

        check();
      });
    },
    run(input: TInput, options: RunOptions = {}): Promise<TOutput> {
      if (status === 'terminated') {
        return Promise.reject(new TerminatedError());
      }

      if (options.signal?.aborted) {
        return Promise.reject(createAbortError(options.signal));
      }

      return new Promise<TOutput>((resolve, reject) => {
        const item = { input, reject, resolve, signal: options.signal };

        queue.push(item);
        updateStatus();

        if (!running) {
          void processQueue();
        }
      });
    },
    get size(): number {
      return queue.length;
    },
    get status(): WorkerStatus {
      return status;
    },
    [Symbol.dispose](): void {
      this.dispose();
    },
  };
}
