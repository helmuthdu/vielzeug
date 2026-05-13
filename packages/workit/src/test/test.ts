import type { RunOptions, TaskFn, WorkerHandle, WorkerStatus } from '../workit';

import { createAbortError } from '../_internal';
import { WorkerError } from '../workit';

export type TestWorkerOptions = {
  maxQueue?: number | 'auto';
};

export type TestWorkerHandle<TInput, TOutput> = WorkerHandle<TInput, TOutput> & {
  /** Recorded { input, output } pairs for every successful run(), in call order. */
  readonly calls: ReadonlyArray<{ input: TInput; output: TOutput }>;
};

export function createTestWorker<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
  options: TestWorkerOptions = {},
): TestWorkerHandle<TInput, TOutput> {
  const calls: { input: TInput; output: TOutput }[] = [];
  let closePromise: Promise<void> | undefined;
  let completed = 0;
  const idleResolvers: Array<() => void> = [];
  let running = false;
  let terminated = false;
  const maxQueue = options.maxQueue === 'auto' ? 2 : options.maxQueue;
  const queue: Array<{
    cleanupAbort?: () => void;
    input: TInput;
    reject: (reason: unknown) => void;
    resolve: (value: TOutput) => void;
    signal?: AbortSignal;
  }> = [];

  function status(): WorkerStatus {
    if (terminated) return 'terminated';

    return running || queue.length > 0 ? 'running' : 'idle';
  }

  function notifyIdleIfReady(): void {
    if (terminated || running || queue.length > 0 || idleResolvers.length === 0) return;

    const resolvers = idleResolvers.splice(0, idleResolvers.length);

    for (const resolve of resolvers) {
      resolve();
    }
  }

  function waitForIdle(): Promise<void> {
    if (terminated || (!running && queue.length === 0)) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      idleResolvers.push(resolve);
    });
  }

  async function processQueue(): Promise<void> {
    while (!terminated && queue.length > 0) {
      const item = queue.shift();

      if (!item) break;

      if (item.signal?.aborted) {
        item.cleanupAbort?.();
        item.reject(createAbortError(item.signal));
        notifyIdleIfReady();
        continue;
      }

      running = true;
      item.cleanupAbort?.();

      try {
        const output = await fn(item.input);

        calls.push({ input: item.input, output });
        completed += 1;
        item.resolve(output);
      } catch (error) {
        item.reject(error);
      }

      running = false;
      notifyIdleIfReady();
    }
  }

  return {
    get calls(): ReadonlyArray<{ input: TInput; output: TOutput }> {
      return calls;
    },
    close(): Promise<void> {
      if (terminated) {
        return Promise.resolve();
      }

      if (closePromise) {
        return closePromise;
      }

      closePromise = waitForIdle().then(() => {
        this.dispose();
      });

      return closePromise;
    },
    get completed(): number {
      return completed;
    },
    get concurrency(): number {
      return 1;
    },
    dispose(): void {
      if (terminated) return;

      terminated = true;
      for (const item of queue) {
        item.cleanupAbort?.();
        item.reject(new WorkerError('terminated', '[workit] Worker was terminated'));
      }
      queue.length = 0;
      notifyIdleIfReady();
    },
    run(input: TInput, options: RunOptions = {}): Promise<TOutput> {
      if (terminated) {
        return Promise.reject(new WorkerError('terminated', '[workit] Worker was terminated'));
      }

      if (options.signal?.aborted) {
        return Promise.reject(createAbortError(options.signal));
      }

      if (maxQueue !== undefined && queue.length >= maxQueue) {
        return Promise.reject(new WorkerError('queue_full', `[workit] Queue is full (${maxQueue})`));
      }

      return new Promise<TOutput>((resolve, reject) => {
        const item: {
          cleanupAbort?: () => void;
          input: TInput;
          reject: (reason: unknown) => void;
          resolve: (value: TOutput) => void;
          signal?: AbortSignal;
        } = { input, reject, resolve, signal: options.signal };

        if (options.signal) {
          const onAbort = () => {
            const index = queue.indexOf(item);

            if (index === -1) return;

            queue.splice(index, 1);
            item.cleanupAbort?.();
            reject(createAbortError(options.signal!));
            notifyIdleIfReady();
          };

          item.cleanupAbort = () => {
            options.signal!.removeEventListener('abort', onAbort);
            item.cleanupAbort = undefined;
          };

          options.signal.addEventListener('abort', onAbort, { once: true });
        }

        queue.push(item);

        if (!running) {
          void processQueue();
        }
      });
    },
    get size(): number {
      return queue.length;
    },
    get status(): WorkerStatus {
      return status();
    },
    [Symbol.asyncDispose](): Promise<void> {
      return this.close();
    },
    [Symbol.dispose](): void {
      this.dispose();
    },
    get utilization(): number {
      return Number(running);
    },
  };
}
