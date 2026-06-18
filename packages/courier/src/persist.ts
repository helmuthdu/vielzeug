import type { QueryKey, QueryState } from './types';

import { hash } from './serialize';

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
   * The query keys to persist or hydrate. Accepts either:
   * - `QueryKey[]` — an explicit list of keys to observe/restore.
   * - `(key: QueryKey) => boolean` — a predicate applied to all currently cached keys.
   *
   * Both `persistQueryCache` and `hydrateQueryCache` evaluate this consistently.
   */
  keys: QueryKey[] | ((key: QueryKey) => boolean);
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
    getState(key: QueryKey): QueryState | null;
    keys(): QueryKey[];
    watchKey(key: QueryKey): { peek(): QueryState; subscribe(listener: () => void): () => void };
  },
  opts: PersistOptions,
): () => void {
  const { keys: keysOpt, onError, prefix = 'courier:', storage } = opts;
  const allKeys = qc.keys();
  const keys = typeof keysOpt === 'function' ? allKeys.filter(keysOpt) : keysOpt;
  const unsubs: Array<() => void> = [];

  function storageKey(key: QueryKey): string {
    return `${prefix}${hash(key)}`;
  }

  function persistState(key: QueryKey, state: QueryState): void {
    if (state.status !== 'success') return;

    const entry: SerializedEntry = { data: state.data, updatedAt: state.updatedAt };

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
    const current = qc.getState(key);

    if (current) persistState(key, current);

    const store = qc.watchKey(key);
    const unsub = store.subscribe(() => persistState(key, store.peek()));

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
  qc: { keys(): QueryKey[]; set(key: QueryKey, data: unknown, opts?: { updatedAt?: number }): void },
  opts: PersistOptions,
): Promise<void> {
  const { keys: keysOpt, maxAge, onError, prefix = 'courier:', storage } = opts;
  const allKeys = qc.keys();
  const keys = typeof keysOpt === 'function' ? allKeys.filter(keysOpt) : keysOpt;

  await Promise.all(
    keys.map(async (key) => {
      try {
        const raw = await storage.getItem(`${prefix}${hash(key)}`);

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
