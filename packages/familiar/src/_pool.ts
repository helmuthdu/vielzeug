/**
 * Shared pool orchestration engine used by both the real worker implementation and the test
 * double. Handles queue management, iterative drain loop, abort handling, lifecycle (close /
 * dispose), metrics, batch streaming, task groups, and backpressure.
 *
 * Callers provide a SlotStrategy array — each slot encapsulates run/runStream/prime/terminate.
 * The pool does not care whether slots use a Web Worker or run in-process.
 *
 * Not part of the public API surface.
 */

import { abortError } from '@vielzeug/arsenal';

import type {
  BatchOptions,
  GroupOptions,
  RunOptions,
  SlotStrategy,
  TaskGroup,
  WorkerHandle,
  WorkerStatus,
} from './_types';

import { type QueueItem, TaskQueue } from './_queue';
import { WorkerQueueFullError, WorkerRuntimeError, WorkerTerminatedError, WorkerTimeoutError } from './_types';

export type PoolOptions = {
  concurrency: number;
  defaultTimeout: number | undefined;
  maxQueue: number | undefined;
  onFull: 'reject' | 'wait';
};

export function createPool<TInput, TOutput>(
  slots: SlotStrategy<TInput, TOutput>[],
  options: PoolOptions,
): WorkerHandle<TInput, TOutput> {
  const { concurrency, defaultTimeout, maxQueue, onFull } = options;
  const freeSlots = [...slots];
  const queue = new TaskQueue<TInput, TOutput>();
  const disposeController = new AbortController();
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

    while (!terminated && freeSlots.length > 0 && queue.size > 0) {
      const item = nextItem();

      if (!item) break;

      const slot = freeSlots.pop()!;

      item.cleanupAbort?.();
      activeCount += 1;
      releaseOneFullWaiter();

      const taskTimeout = item.timeout ?? defaultTimeout;

      slot.run(item.input, item.transferables, taskTimeout).then(
        (result) => {
          freeSlots.push(slot);
          activeCount -= 1;
          completedCount += 1;
          item.resolve(result);
          drainLoop();

          if (isIdle()) notifyIdle();
        },
        (error: unknown) => {
          freeSlots.push(slot);
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
    disposeController.abort();

    for (const slot of slots) slot.terminate();

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
    const { priority = 0, signal, timeout, transferables = [] } = runOptions;

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

  // ─── runStream() ─────────────────────────────────────────────────────────────

  function runStream(input: TInput, options: Omit<RunOptions, 'signal'> = {}): AsyncIterable<TOutput> {
    if (terminated) {
      throw new WorkerRuntimeError('Worker was terminated');
    }

    const slot = freeSlots.pop();

    if (!slot) {
      throw new WorkerRuntimeError(
        `runStream() requires a free worker slot; all ${slots.length} slot${slots.length === 1 ? '' : 's'} are busy`,
      );
    }

    const { timeout, transferables = [] } = options;
    const iter = slot.runStream(input, transferables, timeout);

    return {
      [Symbol.asyncIterator]() {
        const inner = iter[Symbol.asyncIterator]();
        let released = false;

        const releaseSlot = () => {
          if (!released) {
            released = true;
            freeSlots.push(slot);
          }
        };

        return {
          async next() {
            const result = await inner.next();

            if (result.done) releaseSlot();

            return result;
          },

          async return(value?: unknown) {
            slot.cancel();
            releaseSlot();

            return inner.return?.(value) ?? { done: true as const, value };
          },

          async throw(error?: unknown) {
            slot.cancel();
            releaseSlot();

            if (inner.throw) return inner.throw(error);

            throw error;
          },
        };
      },
    };
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
        // Note: `completions` accumulates all settled results until the consumer reads them.
        // For large batches this retains all outputs in memory simultaneously.
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

  function group(name?: string, options: GroupOptions = {}): TaskGroup<TInput, TOutput> {
    const ac = new AbortController();

    if (options.signal) {
      const sig = options.signal;

      if (sig.aborted) {
        ac.abort(sig.reason);
      } else {
        sig.addEventListener('abort', () => ac.abort(sig.reason), { once: true });
      }
    }

    let submittedCount = 0;
    let settledCount = 0;
    const pendingPromises: Promise<TOutput>[] = [];

    return {
      abort(reason?: unknown): void {
        ac.abort(reason);
      },

      drain(): Promise<PromiseSettledResult<TOutput>[]> {
        const snapshot = pendingPromises.splice(0);

        return Promise.allSettled(snapshot);
      },

      get name() {
        return name;
      },

      get pending() {
        return submittedCount - settledCount;
      },

      run(input: TInput, runOpts: Omit<RunOptions, 'signal'> = {}): Promise<TOutput> {
        submittedCount += 1;

        const p = run(input, { ...runOpts, signal: ac.signal });

        pendingPromises.push(p);
        p.then(
          () => {
            settledCount += 1;
          },
          () => {
            settledCount += 1;
          },
        );

        return p;
      },

      get size() {
        return submittedCount;
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
    get disposalSignal(): AbortSignal {
      return disposeController.signal;
    },
    dispose,
    get disposed(): boolean {
      return terminated;
    },
    get failed(): number {
      return failedCount;
    },
    group,
    prime(): Promise<void> {
      return Promise.all(slots.map((s) => s.prime())).then(() => {});
    },
    get queued(): number {
      return queue.size;
    },
    run,
    runStream,
    get status(): WorkerStatus {
      return getStatus();
    },
    [Symbol.asyncDispose]: () => close(),
    [Symbol.dispose]: dispose,
  };
}
