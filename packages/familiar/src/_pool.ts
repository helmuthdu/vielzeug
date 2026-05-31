/**
 * Shared pool orchestration engine used by both the real worker implementation and the test
 * double. Handles queue management, iterative drain loop, abort handling, lifecycle (close /
 * dispose), metrics, batch streaming, task groups, and backpressure.
 *
 * Callers provide an executor — a function that runs a single task and returns a Promise.
 * The pool does not care whether the executor uses a Web Worker or runs in-process.
 *
 * Not part of the public API surface.
 */

import { abortError } from '@vielzeug/arsenal';

import type { BatchOptions, RunOptions, TaskGroup, WorkerHandle, WorkerStatus } from './_types';

import { type QueueItem, TaskQueue } from './_queue';
import { WorkerQueueFullError, WorkerRuntimeError, WorkerTerminatedError, WorkerTimeoutError } from './_types';

/** Strategy that executes one task. Provided by the caller (real Slot or in-process fn). */
export type Executor<TInput, TOutput> = (
  input: TInput,
  transferables: Transferable[],
  timeout: number | undefined,
  heartbeatTimeout: number | undefined,
) => Promise<TOutput>;

export type PoolOptions = {
  concurrency: number;
  defaultTimeout: number | undefined;
  maxQueue: number | undefined;
  /** Called during dispose() — used by the real worker to terminate Worker threads. */
  onDispose?: () => void;
  /** 'wait' suspends run() callers when the queue is full instead of rejecting. */
  onFull: 'reject' | 'wait';
  /** Called during prime() — used by the real worker to pre-initialize slots. */
  prime?: () => Promise<void>;
};

export function createPool<TInput, TOutput>(
  executor: Executor<TInput, TOutput>,
  options: PoolOptions,
): WorkerHandle<TInput, TOutput> {
  const { concurrency, defaultTimeout, maxQueue, onDispose, onFull } = options;
  const queue = new TaskQueue<TInput, TOutput>();
  const idleResolvers: Array<() => void> = [];
  /** Waiters blocked on run() because the queue is full (onFull='wait' mode). */
  const fullWaiters: Array<() => void> = [];

  let activeCount = 0;
  let closePromise: Promise<void> | undefined;
  let completedCount = 0;
  let failedCount = 0;
  let terminated = false;

  // ─── Idle tracking ────────────────────────────────────────────────────────────

  function isIdle(): boolean {
    return activeCount === 0 && queue.size === 0;
  }

  function notifyIdle(): void {
    if (!isIdle() || idleResolvers.length === 0) return;

    const resolvers = idleResolvers.splice(0);

    for (const resolve of resolvers) resolve();
  }

  function waitForIdle(timeoutMs?: number): Promise<void> {
    if (isIdle()) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      idleResolvers.push(resolve);

      if (timeoutMs !== undefined) {
        const timer = setTimeout(() => {
          const idx = idleResolvers.indexOf(resolve);

          if (idx !== -1) idleResolvers.splice(idx, 1);

          reject(new WorkerTimeoutError(timeoutMs));
        }, timeoutMs);

        if (typeof timer === 'object' && 'unref' in timer) (timer as { unref(): void }).unref();
      }
    });
  }

  // ─── Full-queue backpressure (onFull='wait') ──────────────────────────────────

  function releaseOneFullWaiter(): void {
    const waiter = fullWaiters.shift();

    if (waiter) waiter();
  }

  // ─── Drain loop (iterative) ───────────────────────────────────────────────────

  let draining = false;

  function drainLoop(): void {
    if (terminated || draining) return;

    draining = true;

    while (!terminated && activeCount < concurrency && queue.size > 0) {
      const item = nextItem();

      if (!item) break;

      item.cleanupAbort?.();
      activeCount += 1;
      releaseOneFullWaiter();

      const taskTimeout = item.timeout ?? defaultTimeout;

      executor(item.input, item.transferables, taskTimeout, item.heartbeatTimeout).then(
        (result) => {
          activeCount -= 1;
          completedCount += 1;
          item.resolve(result);
          drainLoop();

          if (isIdle()) notifyIdle();
        },
        (error: unknown) => {
          activeCount -= 1;

          if (!(error instanceof WorkerTerminatedError)) failedCount += 1;

          item.reject(error);
          drainLoop();

          if (isIdle()) notifyIdle();
        },
      );
    }

    draining = false;
  }

  // ─── Queue helpers ────────────────────────────────────────────────────────────

  function nextItem(): QueueItem<TInput, TOutput> | undefined {
    while (queue.size > 0) {
      const item = queue.shift();

      if (!item) break;

      if (item.signal?.aborted) {
        item.cleanupAbort?.();
        item.reject(abortError(item.signal));
        continue;
      }

      return item;
    }

    return undefined;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  function dispose(): void {
    if (terminated) return;

    terminated = true;
    onDispose?.();

    while (queue.size > 0) {
      const item = queue.shift();

      if (!item) break;

      item.cleanupAbort?.();
      item.reject(new WorkerTerminatedError());
    }

    const resolvers = idleResolvers.splice(0);

    for (const resolve of resolvers) resolve();

    for (const waiter of fullWaiters.splice(0)) waiter();
  }

  function close(timeoutMs?: number): Promise<void> {
    if (terminated) return Promise.resolve();

    if (closePromise) return closePromise;

    closePromise = waitForIdle(timeoutMs).then(dispose, (err) => {
      dispose();
      throw err;
    });

    return closePromise;
  }

  // ─── run() ───────────────────────────────────────────────────────────────────

  async function run(input: TInput, runOptions: RunOptions = {}): Promise<TOutput> {
    const { heartbeatTimeout, priority = 0, signal, timeout, transferables = [] } = runOptions;

    if (terminated) {
      throw new WorkerTerminatedError();
    }

    if (closePromise) {
      throw new WorkerTerminatedError('Worker is closing');
    }

    if (signal?.aborted) {
      throw abortError(signal);
    }

    if (onFull === 'wait' && maxQueue !== undefined) {
      while (!terminated && !closePromise && queue.size >= maxQueue) {
        await new Promise<void>((resolve) => fullWaiters.push(resolve));
      }

      if (terminated) throw new WorkerTerminatedError();

      if (closePromise) throw new WorkerTerminatedError('Worker is closing');
    }

    let resolve!: (value: TOutput) => void;
    let reject!: (reason: unknown) => void;

    const promise = new Promise<TOutput>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const item: QueueItem<TInput, TOutput> = {
      heartbeatTimeout,
      input,
      priority,
      reject,
      resolve,
      signal,
      timeout,
      transferables,
    };

    if (!queue.enqueue(item, onFull === 'wait' ? undefined : maxQueue)) {
      // maxQueue is guaranteed defined here: enqueue() only returns false when maxQueue is set.
      throw new WorkerQueueFullError(maxQueue as number);
    }

    if (signal) {
      const onAbort = () => {
        if (!queue.remove(item)) return;

        item.cleanupAbort?.();
        reject(abortError(signal));
        notifyIdle();
      };

      item.cleanupAbort = () => {
        signal.removeEventListener('abort', onAbort);
        item.cleanupAbort = undefined;
      };

      signal.addEventListener('abort', onAbort, { once: true });
    }

    drainLoop();

    return promise;
  }

  // ─── batch() ─────────────────────────────────────────────────────────────────

  async function* batch(inputs: TInput[], batchOptions: BatchOptions = {}): AsyncIterable<TOutput> {
    if (inputs.length === 0) return;

    const { ordered = true, ...runOpts } = batchOptions;
    const ac = new AbortController();

    try {
      const promises = inputs.map((input) => run(input, { ...runOpts, signal: ac.signal }));

      if (ordered) {
        for (const p of promises) {
          yield await p;
        }
      } else {
        // As-completed: yield results in the order tasks finish, not submission order.
        // A single-slot notification channel wakes the consumer when the next result is ready.
        type Completion = { error: unknown } | { value: TOutput };

        const completions: Completion[] = [];
        let notifier: (() => void) | null = null;

        for (const p of promises) {
          p.then(
            (value) => {
              completions.push({ value });
              notifier?.();
              notifier = null;
            },
            (error: unknown) => {
              completions.push({ error });
              notifier?.();
              notifier = null;
            },
          );
        }

        for (let i = 0; i < promises.length; i++) {
          while (completions.length === 0) {
            await new Promise<void>((resolve) => {
              notifier = resolve;
            });
          }

          const next = completions.shift()!;

          if ('error' in next) throw next.error;

          yield next.value;
        }
      }
    } finally {
      // Abort remaining in-flight tasks on any exit path (normal, consumer break, or error).
      ac.abort();
    }
  }

  // ─── group() ─────────────────────────────────────────────────────────────────

  function group(): TaskGroup<TInput, TOutput> {
    const ac = new AbortController();
    const promises: Promise<TOutput>[] = [];

    return {
      abort(reason?: unknown): void {
        ac.abort(reason);
      },

      async drain(): Promise<void> {
        // Snapshot before awaiting so tasks added concurrently with drain() are not included.
        const snapshot = promises.slice();
        const results = await Promise.allSettled(snapshot);
        const failure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');

        if (failure) throw failure.reason;
      },

      run(input: TInput, runOpts: Omit<RunOptions, 'signal'> = {}): Promise<TOutput> {
        const p = run(input, { ...runOpts, signal: ac.signal });

        promises.push(p);

        return p;
      },

      get size() {
        return promises.length;
      },
    };
  }

  // ─── runStream() ─────────────────────────────────────────────────────────────
  // Default implementation; the real worker overrides this via the handle returned by createWorker.

  function runStreamUnsupported(): AsyncIterable<never> {
    return {
      [Symbol.asyncIterator]() {
        return {
          next(): Promise<IteratorResult<never>> {
            return Promise.reject(new WorkerRuntimeError('runStream() is not supported by this handle type'));
          },
        };
      },
    };
  }

  // ─── Status ──────────────────────────────────────────────────────────────────

  function getStatus(): WorkerStatus {
    if (terminated) return 'terminated';

    return activeCount > 0 || queue.size > 0 ? 'running' : 'idle';
  }

  return {
    get active(): number {
      return activeCount;
    },
    batch,
    close,
    get completed(): number {
      return completedCount;
    },
    get concurrency(): number {
      return concurrency;
    },
    dispose,
    get failed(): number {
      return failedCount;
    },
    group,

    prime: options.prime ?? (() => Promise.resolve()),
    get queued(): number {
      return queue.size;
    },
    run,
    runStream: runStreamUnsupported,
    get status(): WorkerStatus {
      return getStatus();
    },
    [Symbol.asyncDispose]: () => close(),
    [Symbol.dispose]: dispose,

    get utilization(): number {
      return activeCount / concurrency;
    },
  };
}
