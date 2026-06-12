import type { QueryKey } from './types';

import { stableStringify } from './serialize';

/**
 * A sync-or-async key-value storage backend. Compatible with `localStorage`,
 * `sessionStorage`, and any async adapter (IndexedDB, filesystem, etc.).
 */
export interface PersistStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
}

export interface PersistOptions {
  /**
   * When `true`, persists every key currently held in the cache at the time
   * `persistQueryCache` is called. Equivalent to passing `keys: qc.keys()`.
   * Keys added to the cache after this call are **not** automatically observed —
   * call `persistQueryCache` again or pass an explicit `keys` array to cover them.
   * Requires the query client to expose `keys()`.
   */
  all?: boolean;
  /**
   * Predicate to decide which query keys are persisted or hydrated.
   * Applied consistently by both `persistQueryCache` and `hydrateQueryCache`.
   * When omitted all keys are included.
   */
  include?: (key: QueryKey) => boolean;
  /**
   * The query keys to persist or hydrate. Only these keys are observed /
   * read from storage; use `include` to further filter them.
   * When omitted, `persistQueryCache` uses `qc.keys()` to enumerate all
   * currently cached keys (requires the query client to expose `keys()`).
   */
  keys?: QueryKey[];
  /**
   * Maximum age in ms for a persisted entry to be eligible for hydration.
   * Entries whose `updatedAt` timestamp is older than `Date.now() - maxAge` are
   * skipped during hydration and left for a fresh network fetch.
   * When omitted, all entries are hydrated regardless of age.
   */
  maxAge?: number;
  /**
   * Called when a storage operation (read or write) throws.
   * If omitted, storage errors are silently swallowed.
   */
  onError?: (err: unknown, key: QueryKey) => void;
  /**
   * Storage key prefix to namespace entries and avoid collisions.
   * Defaults to `'courier:'`.
   */
  prefix?: string;
  /** Storage backend. */
  storage: PersistStorage;
}

type SerializedEntry = {
  data: unknown;
  updatedAt: number;
};

/**
 * Subscribes a query client to state changes and writes successful entries to
 * a storage backend on every update. Returns a disposer that stops persistence.
 *
 * Pair with `hydrateQueryCache` to restore entries on page load.
 *
 * @example
 * ```ts
 * const qc = createQuery({ staleTime: 60_000 });
 * const stop = persistQueryCache(qc, {
 *   keys: [['users', 1], ['settings']],
 *   storage: localStorage,
 * });
 *
 * // On next page load:
 * await hydrateQueryCache(qc, { keys: [['users', 1], ['settings']], storage: localStorage });
 * ```
 */
export function persistQueryCache(
  qc: {
    getState(key: QueryKey): { data: unknown; status: string; updatedAt?: number } | null;
    keys?(): QueryKey[];
    subscribe(
      key: QueryKey,
      listener: (state: { data: unknown; status: string; updatedAt?: number }) => void,
    ): () => void;
  },
  opts: PersistOptions,
): () => void {
  const { all, include, keys: optsKeys, onError, prefix = 'courier:', storage } = opts;
  const keys = optsKeys ?? (all ? (qc.keys?.() ?? []) : []);
  const unsubs: Array<() => void> = [];

  function storageKey(key: QueryKey): string {
    return `${prefix}${stableStringify(key)}`;
  }

  function persistState(key: QueryKey, state: { data: unknown; status: string; updatedAt?: number }): void {
    if (state.status !== 'success' || state.data === undefined) return;

    const entry: SerializedEntry = { data: state.data, updatedAt: state.updatedAt ?? Date.now() };

    try {
      const result = storage.setItem(storageKey(key), JSON.stringify(entry));

      if (result instanceof Promise) {
        result.catch((err: unknown) => onError?.(err, key));
      }
    } catch (err) {
      onError?.(err, key);
    }
  }

  for (const key of keys) {
    if (include && !include(key)) continue;

    // Eagerly persist any already-successful entry so callers that set up persistence
    // after fetching don't silently lose data across a page reload.
    const current = qc.getState(key);

    if (current) persistState(key, current);

    const unsub = qc.subscribe(key, (state) => persistState(key, state));

    unsubs.push(unsub);
  }

  return () => {
    for (const unsub of unsubs) unsub();
    unsubs.length = 0;
  };
}

/**
 * Hydrates a query client from persisted storage before any fetches are made.
 * Entries are written via `qc.set()` so observers are notified immediately.
 *
 * @example
 * ```ts
 * await hydrateQueryCache(qc, {
 *   keys: [['users', 1], ['settings']],
 *   storage: localStorage,
 * });
 * ```
 */
export async function hydrateQueryCache(
  qc: { keys?(): QueryKey[]; set(key: QueryKey, data: unknown, opts?: { updatedAt?: number }): void },
  opts: PersistOptions,
): Promise<void> {
  const { all, include, keys: optsKeys, maxAge, onError, prefix = 'courier:', storage } = opts;
  const keys = optsKeys ?? (all ? (qc.keys?.() ?? []) : []);

  const eligibleKeys = include ? keys.filter((key) => include(key)) : keys;

  await Promise.all(
    eligibleKeys.map(async (key) => {
      try {
        const raw = await storage.getItem(`${prefix}${stableStringify(key)}`);

        if (!raw) return;

        // Use the caller's key — not any key embedded in stored JSON — so the correct
        // cache entry is populated regardless of JSON serialisation edge cases.
        const parsed: unknown = JSON.parse(raw);

        // Validate structure before use to guard against schema migrations,
        // corrupt storage, or entries written by older versions of the app.
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          !('data' in parsed) ||
          typeof (parsed as { updatedAt?: unknown }).updatedAt !== 'number'
        ) {
          onError?.(new Error('[courier] Malformed persisted entry'), key);

          return;
        }

        const entry = parsed as SerializedEntry;

        // Skip entries that exceed the caller's maximum age threshold.
        if (maxAge !== undefined && Date.now() - entry.updatedAt > maxAge) return;

        // Restore the original updatedAt so staleTime checks after hydration are
        // accurate — data hydrated from a 55-second-old entry should be considered
        // almost stale, not brand-new.
        qc.set(key, entry.data, { updatedAt: entry.updatedAt });
      } catch (err) {
        onError?.(err, key);
      }
    }),
  );
}
