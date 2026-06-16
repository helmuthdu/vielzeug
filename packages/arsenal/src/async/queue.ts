import type { AttemptResult } from './attempt';

import { assert } from '../function/assert';

/**
 * Creates a promise queue that processes promises sequentially with optional concurrency limit.
 *
 * @example
 * ```ts
 * const requestQueue = queue({ concurrency: 2 });
 *
 * requestQueue.add(() => fetch('/api/1'));
 * requestQueue.add(() => fetch('/api/2'));
 * requestQueue.add(() => fetch('/api/3'));
 *
 * await requestQueue.onIdle(); // Wait for all tasks to complete
 * ```
 *
 * @param options - Queue configuration
 * @param options.concurrency - Maximum number of concurrent promises (default: 1)
 * @returns Queue instance with add, onIdle, clear, and onSettled methods
 */
export type QueueSettledCallback<T = unknown> = (result: AttemptResult<T>) => void;

export interface Queue {
  /** Adds a task to the queue. Returns a promise that resolves/rejects with the task result. */
  add<T>(fn: () => Promise<T>, options?: { priority?: number }): Promise<T>;
  /** Clears all pending tasks, rejecting them with the given reason. Running tasks are unaffected. */
  clear(reason?: unknown): void;
  /** Returns a promise that resolves when the queue becomes idle (no active or pending tasks). */
  onIdle(): Promise<void>;
  /** Subscribes to settled results (both resolved and rejected). Returns an unsubscribe function. */
  onSettled<T>(cb: QueueSettledCallback<T>): () => void;
  /** Number of currently running tasks. */
  readonly active: number;
  /** Number of tasks waiting to run. */
  readonly pending: number;
  /** Total tasks (active + pending). */
  readonly size: number;
}

export function queue(options: { concurrency?: number } = {}): Queue {
  const { concurrency = 1 } = options;

  assert(concurrency >= 1, 'Concurrency must be at least 1', {
    type: RangeError,
  });

  let activeCount = 0;
  let isDraining = false;
  let idlePromise: Promise<void> | null = null;
  let idleResolve: (() => void) | null = null;

  const tasks: Array<{
    fn: () => Promise<unknown>;
    priority: number;
    reject: (error: unknown) => void;
    resolve: (value: unknown) => void;
  }> = [];

  const settledListeners = new Set<QueueSettledCallback>();

  const resolveIdle = (): void => {
    if (activeCount === 0 && tasks.length === 0 && idleResolve) {
      idleResolve();
      idlePromise = null;
      idleResolve = null;
    }
  };

  const notifySettled = (result: AttemptResult<unknown>): void => {
    for (const cb of settledListeners) {
      cb(result);
    }
  };

  const drain = (): void => {
    if (isDraining) {
      return;
    }

    isDraining = true;

    while (activeCount < concurrency && tasks.length > 0) {
      const task = tasks.shift()!;

      activeCount++;

      void Promise.resolve(task.fn())
        .then((v) => {
          notifySettled({ ok: true, value: v });
          task.resolve(v);
        })
        .catch((e: unknown) => {
          notifySettled({ error: e, ok: false });
          task.reject(e);
        })
        .finally(() => {
          activeCount--;
          drain();
          resolveIdle();
        });
    }

    isDraining = false;
    resolveIdle();
  };

  return {
    /**
     * Returns the number of currently running tasks.
     */
    get active(): number {
      return activeCount;
    },

    /**
     * Adds a promise-returning function to the queue.
     * Tasks with a higher `priority` number run before lower-priority tasks.
     * Tasks with equal priority run in insertion order (FIFO).
     *
     * @param fn - The async function to queue.
     * @param options.priority - Task priority. Higher numbers run first. Default: 0.
     */
    add: <T>(fn: () => Promise<T>, options?: { priority?: number }): Promise<T> => {
      const { promise, reject, resolve } = Promise.withResolvers<T>();
      const priority = options?.priority ?? 0;

      const task = {
        fn: fn as () => Promise<unknown>,
        priority,
        reject,
        resolve: resolve as (value: unknown) => void,
      };

      let i = tasks.length;

      while (i > 0 && tasks[i - 1]!.priority < priority) {
        i--;
      }

      tasks.splice(i, 0, task);
      drain();

      return promise;
    },

    /**
     * Clears all pending tasks from the queue and rejects them.
     * Running tasks are not affected.
     * @param reason - The error reason for the rejection (defaults to 'Queue cleared')
     */
    clear: (reason?: unknown): void => {
      const clearReason = reason ?? new Error('Queue cleared');

      for (const task of tasks.splice(0)) {
        task.reject(clearReason);
      }

      resolveIdle();
    },

    /**
     * Returns a promise that resolves when the queue becomes idle.
     */
    onIdle: (): Promise<void> => {
      if (activeCount === 0 && tasks.length === 0) {
        return Promise.resolve();
      }

      if (!idlePromise) {
        const deferred = Promise.withResolvers<void>();

        idlePromise = deferred.promise;
        idleResolve = deferred.resolve;
      }

      return idlePromise;
    },

    /**
     * Subscribes to settled task results (both resolved and rejected).
     * The callback fires once per task, in completion order.
     * Returns an unsubscribe function.
     *
     * Unlike a `for await` loop, multiple subscribers are supported and
     * no results are accumulated in memory.
     *
     * @example
     * ```ts
     * const q = queue({ concurrency: 2 });
     * const unsub = q.onSettled((result) => {
     *   if (result.ok) console.log(result.value);
     *   else console.error(result.error);
     * });
     *
     * q.add(() => fetchUser(1));
     * q.add(() => fetchUser(2));
     *
     * await q.onIdle();
     * unsub(); // stop listening
     * ```
     */
    onSettled: <T = unknown>(cb: QueueSettledCallback<T>): (() => void) => {
      settledListeners.add(cb as QueueSettledCallback);

      return () => {
        settledListeners.delete(cb as QueueSettledCallback);
      };
    },

    /**
     * Returns the number of tasks waiting to run (queued but not yet started).
     */
    get pending(): number {
      return tasks.length;
    },

    /**
     * Returns the total number of tasks (active + pending).
     */
    get size(): number {
      return activeCount + tasks.length;
    },
  };
}
