import { CourierBatcherError, CourierDisposedError } from './errors';

type BatcherBase = {
  /** Maximum batch size before a flush is forced. Defaults to `25`. */
  maxSize?: number;
  /**
   * Scheduling window in ms. Defaults to `0` (next microtask), which coalesces
   * all `load()` calls within the same synchronous block into one batch.
   * Set a positive value (e.g. `16`) to coalesce across async boundaries.
   */
  window?: number;
};

/**
 * Batcher options. Exactly one of `resolve` or `resolveSettled` must be provided — they are mutually exclusive.
 *
 * - **`resolve`**: execute a batch and return results in the same order. All succeed or all fail.
 * - **`resolveSettled`**: per-key error isolation — each `load()` fulfills or rejects independently.
 */
export type BatcherOptions<K, V> =
  | (BatcherBase & {
      /**
       * Execute a batch of keys and return results in the same order.
       * The returned array must have the same length as `keys`.
       */
      resolve: (keys: K[]) => Promise<V[]>;
      resolveSettled?: never;
    })
  | (BatcherBase & {
      resolve?: never;
      /**
       * Per-key error isolation. Receives the same key array but must return a
       * `PromiseSettledResult<V>[]` of equal length. Each `load()` promise fulfills
       * or rejects independently based on its corresponding settled result.
       */
      resolveSettled: (keys: K[]) => Promise<PromiseSettledResult<V>[]>;
    });

type PendingItem<K, V> = {
  key: K;
  reject: (reason: unknown) => void;
  resolve: (value: V) => void;
};

/**
 * DataLoader-style request batcher. Coalesces individual `load()` calls made
 * within the same scheduling window into a single `resolve()` call.
 *
 * Typical use: N+1 query elimination, request fan-out coalescing.
 *
 * @example
 * ```ts
 * const userLoader = createBatcher({
 *   resolve: async (ids) => api.post<User[]>('/users/batch', { body: { ids } }),
 * });
 *
 * // These 3 calls collapse into 1 POST /users/batch { ids: [1, 2, 3] }
 * const [alice, bob, carol] = await Promise.all([
 *   userLoader.load(1),
 *   userLoader.load(2),
 *   userLoader.load(3),
 * ]);
 * ```
 */
export function createBatcher<K, V>(opts: BatcherOptions<K, V>) {
  const { maxSize = 25, resolve, resolveSettled, window: windowMs = 0 } = opts;

  const queue: PendingItem<K, V>[] = [];
  const controller = new AbortController();
  let scheduled = false;
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function flush(): void {
    if (queue.length === 0) return;

    const batch = queue.splice(0, maxSize);

    // If more items remain after taking maxSize, schedule another flush immediately.
    if (queue.length > 0) schedule();

    const keys = batch.map((item) => item.key);

    if (resolveSettled) {
      resolveSettled(keys)
        .then((results) => {
          if (results.length !== batch.length) {
            const err = new CourierBatcherError(
              `Batcher: resolveSettled() returned ${results.length} results for ${batch.length} keys`,
            );

            for (const item of batch) item.reject(err);

            return;
          }

          batch.forEach((item, i) => {
            const r = results[i];

            if (r.status === 'fulfilled') {
              item.resolve(r.value);
            } else {
              item.reject(r.reason);
            }
          });
        })
        .catch((err: unknown) => {
          for (const item of batch) item.reject(err);
        });
    } else {
      resolve(keys)
        .then((results) => {
          if (results.length !== batch.length) {
            const err = new CourierBatcherError(
              `Batcher: resolve() returned ${results.length} results for ${batch.length} keys`,
            );

            for (const item of batch) item.reject(err);

            return;
          }

          batch.forEach((item, i) => item.resolve(results[i]));
        })
        .catch((err: unknown) => {
          for (const item of batch) item.reject(err);
        });
    }
  }

  function schedule(): void {
    if (scheduled) return;

    scheduled = true;

    if (windowMs === 0) {
      queueMicrotask(() => {
        scheduled = false;
        flush();
      });
    } else {
      pendingTimer = setTimeout(() => {
        pendingTimer = null;
        scheduled = false;
        flush();
      }, windowMs);
    }
  }

  return {
    get disposalSignal(): AbortSignal {
      return controller.signal;
    },

    /**
     * Cancels all pending `load()` promises with a disposal error and stops
     * any scheduled flushes. Safe to call multiple times.
     */
    dispose(): void {
      if (disposed) return;

      disposed = true;

      if (pendingTimer !== null) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }

      const err = new CourierDisposedError('Batcher');

      for (const item of queue.splice(0)) item.reject(err);

      scheduled = false;
      controller.abort();
    },

    get disposed(): boolean {
      return disposed;
    },

    load(key: K): Promise<V> {
      if (disposed) return Promise.reject(new CourierDisposedError('Batcher'));

      return new Promise<V>((res, rej) => {
        queue.push({ key, reject: rej, resolve: res });

        if (queue.length >= maxSize) {
          // Force-flush immediately when the batch is full.
          // Cancel any pending timer first so it cannot fire a second flush.
          if (pendingTimer !== null) {
            clearTimeout(pendingTimer);
            pendingTimer = null;
          }

          scheduled = false;
          flush();
        } else {
          schedule();
        }
      });
    },

    [Symbol.dispose](): void {
      this.dispose();
    },
  };
}

export type Batcher<K, V> = ReturnType<typeof createBatcher<K, V>>;
