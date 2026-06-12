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
    { signal }: { signal?: AbortSignal } = {},
  ): (() => void) => {
    if (disposed) {
      throw new VaultDisposedError('observer hub is disposed');
    }

    if (signal?.aborted) return () => {};

    const key = table;
    const wrapped = listener as ObserverListener<unknown>;
    let listeners = observers.get(key);

    if (!listeners) {
      listeners = new Set();
      observers.set(key, listeners);
    }

    listeners.add(wrapped);

    // Always fire an initial snapshot so every subscriber sees current state immediately.
    notify(table);

    const stop = (): void => {
      const current = observers.get(key);

      if (!current) return;

      current.delete(wrapped);

      if (current.size === 0) observers.delete(key);
    };

    signal?.addEventListener('abort', stop, { once: true });

    return stop;
  };

  const dispose = (): void => {
    disposed = true;
    observers.clear();
  };

  return { dispose, notify, observe };
}

/**
 * Creates an AsyncIterable that yields a snapshot on every mutation.
 * The first snapshot is emitted immediately (on the first `next()` call).
 *
 * `mode` controls back-pressure:
 * - `'latest'` (default): if the consumer lags, only the most recent snapshot is retained.
 *   Intermediate states are discarded. Best for rendering/display use-cases.
 * - `'all'`: every snapshot is queued and delivered in order. Use when every intermediate
 *   state matters (audit trails, animation).
 *
 * Pass an `AbortSignal` to cancel the iteration externally:
 * ```ts
 * const controller = new AbortController();
 * for await (const users of db.watch('users', { signal: controller.signal })) { ... }
 * controller.abort(); // stops the loop
 * ```
 */
export function createWatchIterable<T>(
  subscribe: (listener: (snapshot: T[]) => void, signal?: AbortSignal) => () => void,
  mode: 'all' | 'latest' = 'latest',
  signal?: AbortSignal,
): AsyncIterable<T[]> {
  return {
    [Symbol.asyncIterator]() {
      let pending: T[][] = [];
      let waiting: ((value: IteratorResult<T[]>) => void) | null = null;
      let done = signal?.aborted ?? false;
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

      signal?.addEventListener('abort', finish, { once: true });

      const ensureSubscribed = (): void => {
        if (unsubscribe || done) return;

        // Lazy registration: observer is wired on first next() call.
        unsubscribe = subscribe((snapshot) => {
          if (done) return;

          if (waiting) {
            const resolve = waiting;

            waiting = null;
            resolve({ done: false, value: snapshot });
          } else if (mode === 'all') {
            pending.push(snapshot);
          } else {
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
 * Since `observe()` always fires immediately, each per-table observer populates the
 * snapshotMap on registration. No separate prefetch step is needed.
 */
export function createObserveMany<S extends AnySchema>(hub: ReturnType<typeof createObserverHub<S>>) {
  return function observeMany<K extends keyof S & string>(
    tables: readonly K[],
    listener: (snapshots: { [T in K]: RecordOf<S, T>[] }) => void,
    { signal }: { signal?: AbortSignal } = {},
  ): () => void {
    const distinctTables = [...new Set(tables)] as K[];

    if (distinctTables.length === 0) throw new VaultScopeError('observeMany requires at least one table');

    if (signal?.aborted) return () => {};

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

    // Register observers — each fires an immediate snapshot that populates snapshotMap.
    // Once all tables have delivered, scheduleFlush emits the first combined snapshot.
    // Signal is NOT passed to inner hub.observe() calls — the outer stop() is the single
    // cleanup path, avoiding O(tables) redundant abort listeners per signal.
    const stopFns = distinctTables.map((t) =>
      hub.observe(t, (records) => {
        snapshotMap.set(t, records as RecordOf<S, K>[]);
        scheduleFlush();
      }),
    );

    const stop = (): void => {
      stopped = true;

      for (const s of stopFns) s();
    };

    signal?.addEventListener('abort', stop, { once: true });

    return stop;
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
