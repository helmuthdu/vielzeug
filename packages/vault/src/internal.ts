import type { AnySchema, KeyOf, RecordOf } from './types';

import { VaultDisposedError, VaultError, VaultScopeError } from './errors';

type ObserverListener<T> = (records: T[]) => void;

/**
 * Separator used between encoded key segments. The null byte (\x00) is safe
 * because `encodeURIComponent` always percent-encodes it to `%00` (a 3-character
 * string), so the raw `\x00` byte can never appear inside an encoded segment —
 * eliminating key-collision risk that a URL-safe character like `~` would carry.
 */
const SEP = '\x00';

export function encodeDbPrefix(dbName: string): string {
  return `${encodeURIComponent(dbName)}${SEP}`;
}

export function encodeStorageKey(dbName: string, table: string, key: string): string {
  return `${encodeURIComponent(dbName)}${SEP}${encodeURIComponent(table)}${SEP}${encodeURIComponent(key)}`;
}

export function encodeStorageTablePrefix(dbName: string, table: string): string {
  return `${encodeURIComponent(dbName)}${SEP}${encodeURIComponent(table)}${SEP}`;
}

export function decodeStorageTableFromKey(dbName: string, storageKey: string | null): string | undefined {
  if (!storageKey) return undefined;

  const prefix = encodeDbPrefix(dbName);

  if (!storageKey.startsWith(prefix)) return undefined;

  const tail = storageKey.slice(prefix.length);
  const end = tail.indexOf(SEP);

  if (end === -1) return undefined;

  try {
    return decodeURIComponent(tail.slice(0, end));
  } catch {
    return undefined;
  }
}

export function createObserverHub<S extends AnySchema>(
  getAll: <K extends keyof S & string>(table: K) => Promise<RecordOf<S, K>[]>,
  onError?: (error: unknown) => void,
) {
  const observers = new Map<string, Set<ObserverListener<unknown>>>();
  let disposed = false;

  const reportObserverError = (error: unknown): void => {
    if (onError) {
      onError(error);
    } else if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('[vault] observer notification failed', error);
    }
  };

  const notify = <K extends keyof S & string>(table: K): void => {
    if (disposed) return;

    const listeners = observers.get(table);

    if (!listeners || listeners.size === 0) return;

    void getAll(table)
      .then((records) => {
        if (disposed) return;

        const current = observers.get(table);

        if (!current || current.size === 0) return;

        for (const listener of current) {
          try {
            listener(records as unknown[]);
          } catch (error) {
            reportObserverError(error);
          }
        }
      })
      .catch((error) => reportObserverError(error));
  };

  const observe = <K extends keyof S & string>(
    table: K,
    listener: (records: RecordOf<S, K>[]) => void,
    { immediate = false }: { immediate?: boolean } = {},
  ): (() => void) => {
    if (disposed) {
      throw new VaultDisposedError('observer hub is disposed');
    }

    const key = table;
    const wrapped = listener as ObserverListener<unknown>;
    let listeners = observers.get(key);

    if (!listeners) {
      listeners = new Set();
      observers.set(key, listeners);
    }

    listeners.add(wrapped);

    if (immediate) notify(table);

    return () => {
      const current = observers.get(key);

      if (!current) return;

      current.delete(wrapped);

      if (current.size === 0) observers.delete(key);
    };
  };

  const dispose = (): void => {
    disposed = true;
    observers.clear();
  };

  return { dispose, notify, observe };
}

/**
 * Creates an AsyncIterable that yields a snapshot on every mutation.
 * The first snapshot is emitted on the first `next()` call (lazy registration).
 *
 * `mode` controls back-pressure:
 * - `'latest'` (default): if the consumer lags, only the most recent snapshot is retained.
 *   Intermediate states are discarded. Best for rendering/display use-cases.
 * - `'all'`: every snapshot is queued and delivered in order. Use when every intermediate
 *   state matters (audit trails, animation).
 */
export function createWatchIterable<T>(
  subscribe: (listener: (snapshot: T[]) => void) => () => void,
  mode: 'all' | 'latest' = 'latest',
): AsyncIterable<T[]> {
  return {
    [Symbol.asyncIterator]() {
      let pending: T[][] = [];
      let waiting: ((value: IteratorResult<T[]>) => void) | null = null;
      let done = false;
      let unsubscribe: (() => void) | null = null;

      const finish = (): void => {
        if (done) return;

        done = true;
        unsubscribe?.();
        unsubscribe = null;

        if (waiting) {
          waiting({ done: true, value: undefined });
          waiting = null;
        }
      };

      const ensureSubscribed = (): void => {
        if (unsubscribe || done) return;

        // Lazy registration: observer is wired on first next() call.
        unsubscribe = subscribe((snapshot) => {
          if (done) return;

          if (waiting) {
            // Consumer is actively waiting — deliver immediately.
            const resolve = waiting;

            waiting = null;
            resolve({ done: false, value: snapshot });
          } else if (mode === 'all') {
            // Queue all snapshots — consumer will drain them in order.
            pending.push(snapshot);
          } else {
            // 'latest' mode: discard any queued intermediate state.
            pending = [snapshot];
          }
        });
      };

      return {
        async next(): Promise<IteratorResult<T[]>> {
          if (done) return { done: true, value: undefined };

          ensureSubscribed();

          if (pending.length > 0) {
            const value = pending.shift()!;

            return { done: false, value };
          }

          return new Promise<IteratorResult<T[]>>((resolve) => {
            waiting = resolve;
          });
        },

        async return(): Promise<IteratorResult<T[]>> {
          finish();

          return { done: true, value: undefined };
        },

        async throw(err?: unknown): Promise<IteratorResult<T[]>> {
          finish();

          return Promise.reject(err);
        },
      };
    },
  };
}

/**
 * Observes multiple tables simultaneously. The listener receives a combined snapshot
 * `{ [tableName]: RecordOf<S, T>[] }` and fires once after all tables have delivered
 * their first snapshot. Subsequent firings are coalesced per microtask.
 *
 * Race-free design: observers are registered BEFORE the prefetch starts. Any mutation
 * that arrives during the async prefetch is captured by the observer and its data takes
 * precedence over the (now-stale) prefetch result. This eliminates the window in which
 * a mutation could be missed when observers were registered only after prefetch completion.
 */
export function createObserveMany<S extends AnySchema>(
  hub: ReturnType<typeof createObserverHub<S>>,
  getAll: <K extends keyof S & string>(table: K) => Promise<RecordOf<S, K>[]>,
  logger?: { error(msg: Error | string, context?: string): void },
) {
  return function observeMany<K extends keyof S & string>(
    tables: readonly K[],
    listener: (snapshots: { [T in K]: RecordOf<S, T>[] }) => void,
  ): () => void {
    const distinctTables = [...new Set(tables)] as K[];

    if (distinctTables.length === 0) throw new VaultScopeError('observeMany requires at least one table');

    const snapshotMap = new Map<string, RecordOf<S, K>[]>();
    let microtaskQueued = false;
    let stopped = false;

    const buildCombined = (): { [T in K]: RecordOf<S, T>[] } =>
      Object.fromEntries(tables.map((t) => [t, snapshotMap.get(t) ?? []])) as { [T in K]: RecordOf<S, T>[] };

    const scheduleFlush = (): void => {
      if (microtaskQueued || snapshotMap.size < distinctTables.length) return;

      microtaskQueued = true;
      queueMicrotask(() => {
        microtaskQueued = false;

        if (!stopped) listener(buildCombined());
      });
    };

    // Step 1: Register observers BEFORE the prefetch so that mutations arriving during
    // the async prefetch are captured. The snapshot they deliver takes precedence over
    // the prefetch data for that table.
    const stopFns = distinctTables.map((t) =>
      hub.observe(
        t,
        (records) => {
          snapshotMap.set(t, records as RecordOf<S, K>[]);
          scheduleFlush();
        },
        { immediate: false },
      ),
    );

    // Step 2: Prefetch initial state. Only writes to snapshotMap for tables that the
    // observer has not already populated (i.e. no mutation arrived during the fetch).
    // Always fires scheduleFlush after all prefetches complete — the listener will
    // receive the initial snapshot regardless of whether any mutations have occurred.
    void Promise.all(
      distinctTables.map((t) =>
        getAll(t)
          .then((records) => {
            if (stopped) return;

            // Don't overwrite if a mutation already delivered fresher data for this table.
            if (!snapshotMap.has(t)) {
              snapshotMap.set(t, records as RecordOf<S, K>[]);
              scheduleFlush();
            }
          })
          .catch((err: unknown) => {
            logger?.error(err instanceof Error ? err : new Error(String(err)), '[vault] observeMany prefetch failed');

            if (stopped) return;

            // Empty-array fallback ensures snapshotMap is complete even on error,
            // so the size guard in scheduleFlush can eventually be satisfied.
            if (!snapshotMap.has(t)) {
              snapshotMap.set(t, []);
              scheduleFlush();
            }
          }),
      ),
    );

    return () => {
      stopped = true;

      for (const s of stopFns) s();
    };
  };
}

export function getRecordKey<S extends AnySchema, K extends keyof S>(
  schema: S,
  table: K,
  value: RecordOf<S, K>,
): KeyOf<S, K> {
  const keyField = String(schema[table].key);
  const keyValue = (value as Record<string, unknown>)[keyField];

  if (keyValue === undefined || keyValue === null) {
    throw new VaultError(
      `key field "${keyField}" in table "${String(table)}" must be a non-null value, got ${String(keyValue)}`,
    );
  }

  return keyValue as KeyOf<S, K>;
}
