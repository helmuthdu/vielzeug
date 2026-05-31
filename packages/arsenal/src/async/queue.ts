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
 * @returns Queue instance with add, onIdle, and clear methods
 */
export function queue(options: { concurrency?: number } = {}) {
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
    reject: (error: unknown) => void;
    resolve: (value: unknown) => void;
  }> = [];

  const resolveIdle = (): void => {
    if (activeCount === 0 && tasks.length === 0 && idleResolve) {
      idleResolve();
      idlePromise = null;
      idleResolve = null;
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
        .then(task.resolve)
        .catch(task.reject)
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
     * Adds a promise-returning function to the queue
     */
    add: <T>(fn: () => Promise<T>): Promise<T> => {
      const { promise, reject, resolve } = Promise.withResolvers<T>();

      tasks.push({
        fn: fn as () => Promise<unknown>,
        reject,
        resolve: resolve as (value: unknown) => void,
      });
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
