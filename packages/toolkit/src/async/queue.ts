import { assert } from '../function/assert';
import { Scheduler } from './scheduler';

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
 * @returns Queue instance with add, onIdle, and clear methods
 */
export function queue(options: { concurrency?: number } = {}) {
  const { concurrency = 1 } = options;

  assert(concurrency >= 1, 'Concurrency must be at least 1', {
    args: { concurrency },
    type: RangeError,
  });

  let activeCount = 0;
  let idlePromise: Promise<void> | null = null;
  let idleResolve: (() => void) | null = null;

  const tasks: Array<{
    fn: () => Promise<unknown>;
    reject: (error: unknown) => void;
    resolve: (value: unknown) => void;
  }> = [];

  let flushQueued = false;

  const scheduleNext = (): void => {
    if (flushQueued) return;

    flushQueued = true;

    const scheduler = new Scheduler();

    void scheduler.postTask(
      () => {
        flushQueued = false;
        next();
      },
      { priority: 'user-visible' },
    );
  };

  const next = (): void => {
    if (activeCount < concurrency && tasks.length > 0) {
      const task = tasks.shift()!;

      activeCount++;

      task
        .fn()
        .then(task.resolve)
        .catch(task.reject)
        .finally(() => {
          activeCount--;
          scheduleNext();

          if (activeCount === 0 && tasks.length === 0 && idleResolve) {
            idleResolve();
            idlePromise = null;
            idleResolve = null;
          }
        });
    }
  };

  return {
    /**
     * Adds a promise-returning function to the queue
     */
    add: <T>(fn: () => Promise<T>): Promise<T> => {
      const { promise, reject, resolve } = Promise.withResolvers<T>();

      tasks.push({
        fn: fn as () => Promise<unknown>,
        reject,
        resolve: resolve as (value: unknown) => void,
      });
      scheduleNext();

      return promise;
    },

    /**
     * Clears all pending tasks from the queue
     */
    clear: (): void => {
      tasks.length = 0;
    },

    /**
     * Returns a promise that resolves when the queue becomes idle
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
     * Returns the number of currently active promises
     */
    get pending(): number {
      return activeCount;
    },

    /**
     * Returns the current size of the queue
     */
    get size(): number {
      return tasks.length;
    },
  };
}
