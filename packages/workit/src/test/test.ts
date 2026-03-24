import type { RunOptions, TaskFn, WorkerHandle, WorkerStatus } from '../workit';

import { TerminatedError } from '../workit';

export type TestWorkerHandle<TInput, TOutput> = WorkerHandle<TInput, TOutput> & {
  /** Recorded { input, output } pairs for every successful run(), in call order. */
  readonly calls: ReadonlyArray<{ input: TInput; output: TOutput }>;
};

export function createTestWorker<TInput, TOutput>(fn: TaskFn<TInput, TOutput>): TestWorkerHandle<TInput, TOutput> {
  const calls: { input: TInput; output: TOutput }[] = [];
  let status: WorkerStatus = 'idle';

  return {
    get calls(): ReadonlyArray<{ input: TInput; output: TOutput }> {
      return calls;
    },
    dispose(): void {
      status = 'terminated';
    },
    run(input: TInput, _options?: RunOptions): Promise<TOutput> {
      if (status === 'terminated') {
        return Promise.reject(new TerminatedError());
      }

      status = 'running';

      return Promise.resolve()
        .then(() => fn(input))
        .then((output) => {
          calls.push({ input, output });

          if (status !== 'terminated') status = 'idle';

          return output;
        })
        .catch((err: unknown) => {
          if (status !== 'terminated') status = 'idle';

          throw err;
        });
    },
    get size(): number {
      return 1;
    },
    get status(): WorkerStatus {
      return status;
    },
    [Symbol.dispose](): void {
      status = 'terminated';
    },
  };
}
