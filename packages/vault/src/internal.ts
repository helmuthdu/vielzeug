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
  getAll: <K extends keyof S>(table: K) => Promise<RecordOf<S, K>[]>,
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

  const notify = <K extends keyof S>(table: K): void => {
    if (disposed) return;

    const listeners = observers.get(String(table));

    if (!listeners || listeners.size === 0) return;

    void getAll(table)
      .then((records) => {
        if (disposed) return;

        const current = observers.get(String(table));

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

  const observe = <K extends keyof S>(
    table: K,
    listener: (records: RecordOf<S, K>[]) => void,
    { immediate = false }: { immediate?: boolean } = {},
  ): (() => void) => {
    if (disposed) {
      throw new VaultDisposedError('observer hub is disposed');
    }

    const key = String(table);
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
 * **Latest-only semantics:** if multiple mutations arrive while the consumer is
 * not calling `next()`, only the most recent snapshot is retained. This prevents
 * stale intermediate states from accumulating for slow consumers.
 */
export function createWatchIterable<T>(
  subscribe: (listener: (snapshot: T[]) => void) => () => void,
): AsyncIterable<T[]> {
  return {
    [Symbol.asyncIterator]() {
      let pending: T[] | null = null;
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
          } else {
            // No consumer waiting — store latest only (overwrite any previous pending).
            pending = snapshot;
          }
        });
      };

      return {
        async next(): Promise<IteratorResult<T[]>> {
          if (done) return { done: true, value: undefined };

          ensureSubscribed();

          if (pending !== null) {
            const value = pending;

            pending = null;

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
 * Extracted from `buildAdapterOps` to be independently testable and to reduce
 * the cognitive load of the adapter-core factory.
 */
export function createObserveMany<S extends AnySchema>(
  hub: ReturnType<typeof createObserverHub<S>>,
  getAll: <K extends keyof S>(table: K) => Promise<RecordOf<S, K>[]>,
  logger?: { error(msg: Error | string, context?: string): void },
) {
  return function observeMany<K extends keyof S>(
    tables: readonly K[],
    listener: (snapshots: { [T in K]: RecordOf<S, T>[] }) => void,
    opts?: { immediate?: boolean },
  ): () => void {
    const distinctTables = [...new Set(tables.map(String))] as (keyof S)[];

    if (distinctTables.length === 0) throw new VaultScopeError('observeMany requires at least one table');

    const snapshotMap = new Map<string, RecordOf<S, keyof S>[]>();
    let microtaskQueued = false;
    let stopped = false;

    const buildCombined = (): { [T in K]: RecordOf<S, T>[] } =>
      Object.fromEntries(tables.map((t) => [String(t), snapshotMap.get(String(t)) ?? []])) as {
        [T in K]: RecordOf<S, T>[];
      };

    const scheduleFlush = (): void => {
      if (microtaskQueued || snapshotMap.size < distinctTables.length) return;

      microtaskQueued = true;
      queueMicrotask(() => {
        microtaskQueued = false;

        if (!stopped) listener(buildCombined());
      });
    };

    let cleanupObservers: (() => void) | null = null;

    void Promise.all(
      distinctTables.map((t) =>
        getAll(t)
          .then((records) => {
            if (!stopped) snapshotMap.set(String(t), records as RecordOf<S, keyof S>[]);
          })
          .catch((err: unknown) => {
            logger?.error(err instanceof Error ? err : new Error(String(err)), '[vault] observeMany prefetch failed');

            if (!stopped) snapshotMap.set(String(t), []);
          }),
      ),
    ).then(() => {
      if (stopped) return;

      const stopFns = distinctTables.map((t) =>
        hub.observe(
          t,
          (records) => {
            snapshotMap.set(String(t), records as RecordOf<S, keyof S>[]);
            scheduleFlush();
          },
          { immediate: false },
        ),
      );

      cleanupObservers = () => {
        for (const s of stopFns) s();
      };

      if (stopped) {
        cleanupObservers();

        return;
      }

      if (opts?.immediate) scheduleFlush();
    });

    return () => {
      stopped = true;
      cleanupObservers?.();
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
