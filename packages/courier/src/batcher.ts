export type BatcherOptions<K, V> = {
  /** Maximum batch size before a flush is forced. Defaults to `25`. */
  maxSize?: number;
  /**
   * Execute a batch of keys and return results in the same order.
   * The returned array must have the same length as `keys`.
   */
  resolve: (keys: K[]) => Promise<V[]>;
  /**
   * Scheduling window in ms. Defaults to `0` (next microtask), which coalesces
   * all `load()` calls within the same synchronous block into one batch.
   * Set a positive value (e.g. `16`) to coalesce across async boundaries.
   */
  window?: number;
};

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
  const { maxSize = 25, resolve, window: windowMs = 0 } = opts;

  const queue: PendingItem<K, V>[] = [];
  let scheduled = false;
  let disposed = false;

  function flush(): void {
    if (queue.length === 0) return;

    const batch = queue.splice(0, maxSize);

    // If more items remain after taking maxSize, schedule another flush immediately.
    if (queue.length > 0) schedule();

    resolve(batch.map((item) => item.key))
      .then((results) => {
        if (results.length !== batch.length) {
          const err = new Error(
            `[courier] Batcher: resolve() returned ${results.length} results for ${batch.length} keys`,
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

  function schedule(): void {
    if (scheduled) return;

    scheduled = true;

    if (windowMs === 0) {
      queueMicrotask(() => {
        scheduled = false;
        flush();
      });
    } else {
      setTimeout(() => {
        scheduled = false;
        flush();
      }, windowMs);
    }
  }

  return {
    /**
     * Cancels all pending `load()` promises with a disposal error and stops
     * any scheduled flushes. Safe to call multiple times.
     */
    dispose(): void {
      disposed = true;

      const err = new Error('[courier] Batcher disposed');

      for (const item of queue.splice(0)) item.reject(err);

      scheduled = false;
    },

    load(key: K): Promise<V> {
      if (disposed) return Promise.reject(new Error('[courier] Batcher disposed'));

      return new Promise<V>((res, rej) => {
        queue.push({ key, reject: rej, resolve: res });

        if (queue.length >= maxSize) {
          // Force-flush immediately when the batch is full.
          scheduled = false;
          flush();
        } else {
          schedule();
        }
      });
    },
  };
}

export type Batcher<K, V> = ReturnType<typeof createBatcher<K, V>>;
