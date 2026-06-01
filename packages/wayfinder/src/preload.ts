/**
 * PreloadManager — FIFO cache for preloaded data loader results with concurrent-call deduplication.
 * Eviction removes the oldest inserted entry (insertion-order FIFO, not access-order LRU).
 *
 * - `set(key, results)` — store results; evicts the oldest entry when the cache is full.
 * - `consume(key)` — retrieve and delete results (consume-once semantics).
 * - `track(key, work)` / `untrack(key)` — deduplicate concurrent `preload()` calls for the same route.
 * - `getInflight(key)` — return the in-flight promise if one exists.
 */
export type PreloadManager = ReturnType<typeof createPreloadManager>;

export function createPreloadManager(max = 20) {
  const results = new Map<string, unknown[]>();
  const inflight = new Map<string, Promise<void>>();

  return {
    consume(key: string): unknown[] | undefined {
      const cached = results.get(key);

      if (cached !== undefined) results.delete(key);

      return cached;
    },

    getInflight(key: string): Promise<void> | undefined {
      return inflight.get(key);
    },

    set(key: string, data: unknown[]): void {
      if (results.size >= max) {
        const oldest = results.keys().next().value as string;

        results.delete(oldest);
      }

      results.set(key, data);
    },

    track(key: string, work: Promise<void>): void {
      inflight.set(key, work);
    },

    untrack(key: string): void {
      inflight.delete(key);
    },
  };
}
