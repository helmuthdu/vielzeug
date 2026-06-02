/**
 * Internal fetch deduplication and in-flight request manager.
 *
 * - Deduplicates identical concurrent queries: joiners await the existing in-flight promise.
 * - Aborts superseded in-flight requests when a new query key arrives.
 * - Tracks pending count so callers can reflect loading state.
 *
 * Not exported from the public API — consumed by remoteSource and cursorSource.
 */

type InFlightEntry = { controller: AbortController; promise: Promise<void> };

export type FetchManager<TQuery> = {
  /** Abort all in-flight requests and clear the registry. */
  dispose(): void;
  /** Number of currently in-flight requests (including joiners). */
  readonly pendingCount: number;
  /**
   * Run a fetch for query `q`.
   *
   * - If an identical key is already in-flight, joins as a waiter.
   * - If a different key is in-flight, aborts it and starts a new request.
   * - Calls `onPendingChange()` whenever `pendingCount` changes.
   * - Passes an `isLatest()` predicate to `execute` so it can skip stale responses.
   */
  run(
    q: TQuery,
    execute: (q: TQuery, signal: AbortSignal, isLatest: () => boolean) => Promise<void>,
    onPendingChange: () => void,
  ): Promise<void>;
};

export function createFetchManager<TQuery>(keyOf: (q: TQuery) => string): FetchManager<TQuery> {
  const inflight = new Map<string, InFlightEntry>();
  let latestKey = '';
  let _pendingCount = 0;

  return {
    dispose() {
      for (const entry of inflight.values()) {
        entry.controller.abort();
      }

      inflight.clear();
    },

    get pendingCount() {
      return _pendingCount;
    },

    async run(q, execute, onPendingChange) {
      const key = keyOf(q);

      latestKey = key;

      // Abort all superseded in-flight requests.
      for (const [k, entry] of inflight) {
        if (k !== key) entry.controller.abort();
      }

      // Join an identical in-flight request rather than issuing a duplicate.
      if (inflight.has(key)) {
        _pendingCount++;
        onPendingChange();

        try {
          await inflight.get(key)!.promise;
        } finally {
          _pendingCount--;
          onPendingChange();
        }

        return;
      }

      // New request.
      const controller = new AbortController();

      _pendingCount++;
      onPendingChange();

      const promise = execute(q, controller.signal, () => key === latestKey).finally(() => {
        inflight.delete(key);
        _pendingCount--;
        onPendingChange();
      });

      inflight.set(key, { controller, promise });
      await promise;
    },
  };
}
