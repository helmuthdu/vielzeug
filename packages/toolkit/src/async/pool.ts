import { assert } from '../function/assert';

/**
 * Creates a promise pool that limits the number of concurrent promises.
 * Useful for rate limiting API calls or controlling resource usage.
 *
 * @example
 * ```ts
 * const requestPool = pool(3);
 *
 * const results = await Promise.all([
 *   requestPool(() => fetch('/api/1')),
 *   requestPool(() => fetch('/api/2')),
 *   requestPool(() => fetch('/api/3')),
 *   requestPool(() => fetch('/api/4')), // Will wait for one of the above to finish
 * ]);
 * ```
 *
 * @param limit - Maximum number of concurrent promises
 * @returns Function that accepts a promise-returning function and executes it when a slot is available
 */
export function pool(limit: number): <T>(fn: () => Promise<T>) => Promise<T> {
  assert(limit >= 1, 'Pool limit must be at least 1', { args: { limit }, type: RangeError });

  let activeCount = 0;
  const queue: Array<() => void> = [];

  const dequeue = (): void => {
    if (queue.length > 0 && activeCount < limit) {
      const next = queue.shift();
      next?.();
    }
  };

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    while (activeCount >= limit) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }

    activeCount++;

    try {
      return await fn();
    } finally {
      activeCount--;
      dequeue();
    }
  };
}
