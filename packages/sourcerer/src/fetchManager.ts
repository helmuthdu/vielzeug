/**
 * Internal fetch deduplication and in-flight request manager.
 *
 * - Deduplicates identical concurrent queries: joiners await the existing in-flight promise.
 * - Aborts superseded in-flight requests when a new query key arrives.
 * - Tracks pending count so callers can reflect loading state.
 *
 * Not exported from the public API — consumed via `asyncSource.ts` by remoteSource,
 * cursorSource, and infiniteSource.
 *
 * Deliberately not `@vielzeug/courier`'s query cache: retry itself already comes from the
 * one shared implementation both packages use (`retry` from `@vielzeug/arsenal` — see
 * `_utils.ts`), so there's no retry logic duplicated here to remove. What's left — "only one
 * query is ever active per source instance; a new query always supersedes and aborts the
 * previous one, regardless of key" — is a narrower, different contract than courier's, which
 * is a shared cross-consumer cache keyed by query (many independent entries, each with its own
 * staleness window, meant to be read by multiple observers). Forcing this single-active-query
 * source to route through a per-key shared cache would need as much glue code to reconcile the
 * two models as this file already is, for no behavioral win. See `docs/sourcerer/examples/
 * sourcerer-with-courier.md` for the actually-intended integration point: pass a courier-backed
 * client call as the `fetch` callback into `createRemoteSource()` — composition at the
 * transport layer, not inside this dedup manager.
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
      _pendingCount = 0;
    },

    get pendingCount() {
      return _pendingCount;
    },

    async run(q, execute, onPendingChange) {
      const key = keyOf(q);

      latestKey = key;

      // Abort and remove all superseded in-flight requests.
      for (const [k, entry] of inflight) {
        if (k !== key) {
          entry.controller.abort();
          inflight.delete(k);
        }
      }

      // Join an identical in-flight request rather than issuing a duplicate.
      const existing = inflight.get(key);

      if (existing) {
        _pendingCount++;
        onPendingChange();

        try {
          await existing.promise;
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
