import type { RunOptions, TaskFn, WorkerHandle, WorkerStatus } from '../worker';

import { createAbortError } from '../_internal';
import { TaskQueue, type TaskQueueItem } from '../_task-queue';
import { WorkerError } from '../worker';

export type TestWorkerOptions = {
  maxQueue?: number | 'auto';
};

export type TestWorkerHandle<TInput, TOutput> = WorkerHandle<TInput, TOutput> & {
  /** Recorded { input, output } pairs for every successful run(), in call order. */
  readonly calls: ReadonlyArray<{ input: TInput; output: TOutput }>;
};

function resolveMaxQueue(value: TestWorkerOptions['maxQueue']): number | undefined {
  if (value === undefined) return undefined;

  if (value === 'auto') {
    return 2;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new WorkerError('invalid_options', '[worker/test] `maxQueue` must be a positive integer or "auto"');
  }

  return value;
}

export function createTestWorker<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
  options: TestWorkerOptions = {},
): TestWorkerHandle<TInput, TOutput> {
  const calls: { input: TInput; output: TOutput }[] = [];
  let closePromise: Promise<void> | undefined;
  let completed = 0;
  let activeItem: TaskQueueItem<TInput, TOutput> | null = null;
  let activeRejected = false;
  const queue = new TaskQueue<TInput, TOutput>();
  const maxQueue = resolveMaxQueue(options.maxQueue);
  let processing = false;
  let running = false;
  let terminated = false;

  function isIdle(): boolean {
    return !terminated && !running && queue.size === 0;
  }

  function status(): WorkerStatus {
    if (terminated) return 'terminated';

    return running || queue.size > 0 ? 'running' : 'idle';
  }

  function nextItem(): TaskQueueItem<TInput, TOutput> | undefined {
    while (queue.size > 0) {
      const item = queue.shift();

      if (!item) return undefined;

      if (item.signal?.aborted) {
        item.cleanupAbort?.();
        item.reject(createAbortError(item.signal));
        continue;
      }

      return item;
    }
  }

  function waitForIdle(): Promise<void> {
    if (terminated || isIdle()) {
      return Promise.resolve();
    }

    return queue.waitForIdle(() => isIdle());
  }

  async function drainLoop(): Promise<void> {
    if (processing || terminated) return;

    processing = true;

    try {
      while (!terminated) {
        const item = nextItem();

        if (!item) break;

        running = true;
        activeRejected = false;
        activeItem = item;
        item.cleanupAbort?.();

        try {
          const output = await fn(item.input);

          if (terminated || activeItem !== item || activeRejected) continue;

          calls.push({ input: item.input, output });
          completed += 1;
          item.resolve(output);
        } catch (error) {
          if (terminated || activeItem !== item || activeRejected) continue;

          item.reject(new WorkerError('task', error instanceof Error ? error.message : String(error), error));
        } finally {
          if (activeItem === item) {
            activeItem = null;
          }

          running = false;
          queue.notifyIdleIfReady(() => isIdle());
        }
      }
    } finally {
      processing = false;
      queue.notifyIdleIfReady(() => isIdle());
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

      if (activeItem) {
        activeRejected = true;
        activeItem.reject(new WorkerError('terminated', '[worker] Worker was terminated'));
        activeItem = null;
      }

      running = false;

      while (queue.size > 0) {
        const item = queue.shift()!;

        item.cleanupAbort?.();
        item.reject(new WorkerError('terminated', '[worker] Worker was terminated'));
      }

      queue.notifyIdleIfReady(() => isIdle());
    },
    run(input: TInput, options: RunOptions = {}): Promise<TOutput> {
      if (terminated) {
        return Promise.reject(new WorkerError('terminated', '[worker] Worker was terminated'));
      }

      if (closePromise) {
        return Promise.reject(new WorkerError('terminated', '[worker] Worker is closing'));
      }

      if (options.signal?.aborted) {
        return Promise.reject(createAbortError(options.signal));
      }

      const item: TaskQueueItem<TInput, TOutput> = {
        input,
        reject: () => {},
        resolve: () => {},
        signal: options.signal,
        transferables: options.transferables ?? [],
      };

      if (!queue.enqueue(item, maxQueue)) {
        return Promise.reject(new WorkerError('queue_full', `[worker] Queue is full (${maxQueue})`));
      }

      return new Promise<TOutput>((resolve, reject) => {
        item.reject = reject;
        item.resolve = resolve;

        if (options.signal) {
          const onAbort = () => {
            if (!queue.remove(item)) return;

            item.cleanupAbort?.();
            reject(createAbortError(options.signal!));
            queue.notifyIdleIfReady(() => isIdle());
          };

          item.cleanupAbort = () => {
            options.signal!.removeEventListener('abort', onAbort);
            item.cleanupAbort = undefined;
          };

          options.signal.addEventListener('abort', onAbort, { once: true });
        }

        void drainLoop();
      });
    },
    get size(): number {
      return queue.size;
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
