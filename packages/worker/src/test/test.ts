import type { RunOptions, TaskFn, WorkerHandle, WorkerStatus } from '../worker';

import { type QueueItem, TaskQueue, createAbortError } from '../_queue';
import { WorkerError } from '../worker';

export type TestWorkerOptions = {
  maxQueue?: number;
};

export type TestWorkerHandle<TInput, TOutput> = WorkerHandle<TInput, TOutput> & {
  /** Recorded { input, output } pairs for every successful run(), in call order. */
  readonly calls: ReadonlyArray<{ input: TInput; output: TOutput }>;
};

export function createTestWorker<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
  options: TestWorkerOptions = {},
): TestWorkerHandle<TInput, TOutput> {
  const { maxQueue } = options;

  if (maxQueue !== undefined && (!Number.isInteger(maxQueue) || maxQueue < 1)) {
    throw new WorkerError('invalid_options', '[worker/test] `maxQueue` must be a positive integer');
  }

  const calls: { input: TInput; output: TOutput }[] = [];
  const idleResolvers: Array<() => void> = [];
  const queue = new TaskQueue<TInput, TOutput>();
  let closePromise: Promise<void> | undefined;
  let completed = 0;
  let activeItem: QueueItem<TInput, TOutput> | null = null;
  let processing = false;
  let running = false;
  let terminated = false;

  function isIdle(): boolean {
    return !running && queue.size === 0;
  }

  function computeStatus(): WorkerStatus {
    if (terminated) return 'terminated';

    return running || queue.size > 0 ? 'running' : 'idle';
  }

  function nextItem(): QueueItem<TInput, TOutput> | undefined {
    while (queue.size > 0) {
      const item = queue.shift();

      if (item.signal?.aborted) {
        item.cleanupAbort?.();
        item.reject(createAbortError(item.signal));
        continue;
      }

      return item;
    }
  }

  function notifyIdle(): void {
    if (!isIdle() || idleResolvers.length === 0) return;

    const resolvers = idleResolvers.splice(0);

    for (const resolve of resolvers) {
      resolve();
    }
  }

  function waitForIdle(): Promise<void> {
    if (terminated || isIdle()) return Promise.resolve();

    return new Promise<void>((resolve) => {
      idleResolvers.push(resolve);
    });
  }

  async function drainLoop(): Promise<void> {
    if (processing || terminated) return;

    processing = true;

    try {
      while (!terminated) {
        const item = nextItem();

        if (!item) break;

        running = true;
        activeItem = item;
        item.cleanupAbort?.();

        try {
          const output = await fn(item.input);

          if (terminated || activeItem !== item) continue;

          calls.push({ input: item.input, output });
          completed += 1;
          item.resolve(output);
        } catch (error) {
          if (terminated || activeItem !== item) continue;

          item.reject(new WorkerError('task', error instanceof Error ? error.message : String(error), error));
        } finally {
          if (activeItem === item) {
            activeItem = null;
          }

          running = false;
          notifyIdle();
        }
      }
    } finally {
      processing = false;
      notifyIdle();
    }
  }

  function disposeWorker(): void {
    if (terminated) return;

    terminated = true;

    if (activeItem) {
      activeItem.reject(new WorkerError('terminated', '[worker] Worker was terminated'));
      activeItem = null;
    }

    running = false;

    while (queue.size > 0) {
      const item = queue.shift();

      item.cleanupAbort?.();
      item.reject(new WorkerError('terminated', '[worker] Worker was terminated'));
    }

    const resolvers = idleResolvers.splice(0);

    for (const resolve of resolvers) {
      resolve();
    }
  }

  function closeWorker(): Promise<void> {
    if (terminated) return Promise.resolve();

    if (closePromise) return closePromise;

    closePromise = waitForIdle().then(disposeWorker);

    return closePromise;
  }

  return {
    get active(): number {
      return running ? 1 : 0;
    },
    get calls(): ReadonlyArray<{ input: TInput; output: TOutput }> {
      return calls;
    },
    close: closeWorker,
    get completed(): number {
      return completed;
    },
    get concurrency(): number {
      return 1;
    },
    dispose: disposeWorker,
    get queued(): number {
      return queue.size;
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

      let resolve!: (value: TOutput) => void;
      let reject!: (reason: unknown) => void;

      const promise = new Promise<TOutput>((res, rej) => {
        resolve = res;
        reject = rej;
      });

      const item: QueueItem<TInput, TOutput> = {
        input,
        reject,
        resolve,
        signal: options.signal,
        transferables: options.transferables ?? [],
      };

      if (!queue.enqueue(item, maxQueue)) {
        return Promise.reject(new WorkerError('queue_full', `[worker] Queue is full (${maxQueue})`));
      }

      if (options.signal) {
        const signal = options.signal;

        const onAbort = () => {
          if (!queue.remove(item)) return;

          item.cleanupAbort?.();
          reject(createAbortError(signal));
          notifyIdle();
        };

        item.cleanupAbort = () => {
          signal.removeEventListener('abort', onAbort);
          item.cleanupAbort = undefined;
        };

        signal.addEventListener('abort', onAbort, { once: true });
      }

      void drainLoop();

      return promise;
    },
    get status(): WorkerStatus {
      return computeStatus();
    },
    [Symbol.asyncDispose]: closeWorker,
    [Symbol.dispose]: disposeWorker,
    get utilization(): number {
      return Number(running);
    },
    warmup(): void {
      // No-op: test worker runs in-process, no pre-initialization needed.
    },
  };
}
