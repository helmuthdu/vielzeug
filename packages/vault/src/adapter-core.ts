import type {
  Adapter,
  AnySchema,
  BaseAdapterOptions,
  DebugInfo,
  KeyOf,
  MetricsEvent,
  RecordOf,
  TransactionContext,
  TtlMs,
} from './types';

import { VaultDisposedError, VaultError, VaultScopeError } from './errors';
import { createObserveMany, createObserverHub, createWatchIterable, getRecordKey } from './internal';
import { createQueryBuilder, type NativeRange, type QueryContext } from './query';
import { assertTtlMs } from './ttl';

/* -------------------- Internal backend protocol -------------------- */

/** @internal Full backend protocol implemented by each adapter. A single flat interface — no StorageCore/StorageBackend split. */
export type StorageBackend<S extends AnySchema, K extends keyof S & string = keyof S & string> = {
  clear<T extends K>(table: T): Promise<void>;
  /** Returns live (non-expired) record count for the table. */
  count<T extends K>(table: T): Promise<number>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  deleteMany<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<number>;
  dispose?(): Promise<void>;
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  /**
   * Optional: fetch all live primary keys without materialising full records.
   * When present, `keys()` uses this instead of `getAll()` + key extraction.
   * For tables with TTL, implementations may still fall back to `getAll()` to
   * filter expired keys accurately.
   */
  getAllKeys?<T extends K>(table: T): Promise<KeyOf<S, T>[]>;
  /**
   * Optional secondary-index range fetch. When present, `query()` activates `getIndexRange` in
   * the QueryContext so that a leading `equals`, `between`, or `startsWith` on an indexed field
   * uses an IDB index instead of a full-table scan.
   */
  getByIndexRange?<T extends K>(table: T, field: string, range: NativeRange): Promise<RecordOf<S, T>[]>;
  /**
   * Optional primary-key range fetch for push-down queries. When present, `query()` activates
   * `getRange` in the QueryContext so that a leading `equals`, `between`, or `startsWith` on the
   * key field avoids a full-table scan. Falls back to `getAll` when absent.
   */
  getByKeyRange?<T extends K>(table: T, range: NativeRange): Promise<RecordOf<S, T>[]>;
  /**
   * Optional: fetch multiple records by key in a single operation. Preserves key order; missing keys yield
   * `undefined`. Falls back to N individual `get` calls when absent.
   */
  getMany?<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<Array<RecordOf<S, T> | undefined>>;
  /** Raw record count including TTL-expired entries. Used only for debug(). */
  getRawCount?<T extends K>(table: T): Promise<number>;
  has<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  /**
   * Optional: prune all expired records across all tables in a single atomic operation.
   * When present, `pruneExpired()` delegates here instead of calling `pruneExpiredInTable` N times.
   */
  pruneAllExpired?(): Promise<Record<string, number>>;
  pruneExpiredInTable<T extends K>(table: T): Promise<number>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: TtlMs): Promise<void>;
  putAll<T extends K>(table: T, values: RecordOf<S, T>[], ttl?: TtlMs): Promise<void>;
};

/** @internal */
export type BatchDeps<S extends AnySchema> = {
  notifyMutation: (table: keyof S & string) => void;
  validate: <K extends keyof S & string>(table: K, value: RecordOf<S, K>) => RecordOf<S, K>;
};

/** @internal */
export type BatchImpl<S extends AnySchema> = <K extends keyof S & string, R>(
  tables: readonly K[],
  fn: (tx: TransactionContext<S, K>) => Promise<R>,
) => Promise<R>;

/* -------------------- Helpers -------------------- */

const getTimestamp: () => number = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();

function resolveTtl<S extends AnySchema, K extends keyof S & string>(
  schema: S,
  table: K,
  ttl?: TtlMs,
): TtlMs | undefined {
  if (ttl !== undefined) assertTtlMs(ttl, 'put/putAll');

  return ttl ?? schema[table].defaultTtl;
}

function verifyKey<S extends AnySchema, K extends keyof S & string>(
  schema: S,
  table: K,
  expected: KeyOf<S, K>,
  value: RecordOf<S, K>,
  op: string,
): void {
  const actual = getRecordKey(schema, table, value);

  if (actual !== expected) {
    throw new VaultError(
      `${op}: key field "${schema[table].key}" must be "${String(expected)}" but got "${String(actual)}" in table "${table}"`,
    );
  }
}

function getManyWithFallback<S extends AnySchema, K extends keyof S & string>(
  core: Pick<StorageBackend<S, K>, 'get' | 'getMany'>,
  table: K,
  keys: KeyOf<S, K>[],
): Promise<Array<RecordOf<S, K> | undefined>> {
  if (core.getMany) return core.getMany(table, keys);

  return Promise.all(keys.map((k) => core.get(table, k)));
}

function buildQueryCtx<S extends AnySchema, K extends keyof S & string>(
  table: K,
  core: Pick<StorageBackend<S, K>, 'deleteMany' | 'getAll' | 'getByIndexRange' | 'getByKeyRange'>,
  schema: S,
  onMutate: (t: K) => void,
): QueryContext<RecordOf<S, K>> {
  const entry = schema[table];
  const keyField = entry.key;
  const indexedFields = entry.indexes ? new Set(entry.indexes) : undefined;

  const deleteManyFn = async (records: RecordOf<S, K>[]): Promise<number> => {
    if (records.length === 0) return 0;

    const keys = records.map((r) => getRecordKey(schema, table, r));
    const deleted = await core.deleteMany(table, keys);

    if (deleted > 0) onMutate(table);

    return deleted;
  };

  return {
    deleteMany: deleteManyFn,
    getIndexRange: core.getByIndexRange
      ? (field, range) => core.getByIndexRange!(table, field, range) as Promise<RecordOf<S, K>[]>
      : undefined,
    getRange: core.getByKeyRange
      ? (range) => core.getByKeyRange!(table, range) as Promise<RecordOf<S, K>[]>
      : undefined,
    indexedFields,
    keyField,
    source: () => core.getAll(table),
  };
}

/* -------------------- buildTxContext -------------------- */

export function buildTxContext<S extends AnySchema, K extends keyof S & string>(
  schema: S,
  core: StorageBackend<S, K>,
  onMutate: (table: K) => void,
  validate?: <T extends K>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
  scope?: ReadonlySet<string>,
): TransactionContext<S, K> {
  const applyValidation = validate ?? ((_: K, v: RecordOf<S, K>) => v);

  const checkScope = scope
    ? (t: K): void => {
        if (!scope.has(t)) {
          throw new VaultScopeError(`table "${t}" is not part of this batch scope`);
        }
      }
    : (_t: K): void => {};

  return {
    async clear(table) {
      checkScope(table);

      const live = await core.count(table);

      if (live === 0) return;

      await core.clear(table);
      onMutate(table);
    },
    async count(table) {
      checkScope(table);

      return core.count(table);
    },
    async delete(table, key) {
      checkScope(table);

      const deleted = await core.delete(table, key);

      if (deleted) onMutate(table);

      return deleted;
    },
    async deleteMany(table, keys) {
      checkScope(table);

      const deleted = await core.deleteMany(table, keys);

      if (deleted > 0) onMutate(table);

      return deleted;
    },
    async entries(table) {
      checkScope(table);

      const records = await core.getAll(table);
      const keyField = schema[table].key;

      return records.map((r) => [(r as Record<string, unknown>)[keyField] as KeyOf<S, typeof table>, r]);
    },
    async get(table, key) {
      checkScope(table);

      return core.get(table, key);
    },
    async getAll(table) {
      checkScope(table);

      return core.getAll(table);
    },
    async getMany(table, keys) {
      checkScope(table);

      return getManyWithFallback(core, table, keys);
    },
    async getOrDefault(table, key, defaultFn, ttl) {
      checkScope(table);

      const existing = await core.get(table, key);

      if (existing !== undefined) return existing;

      const value = defaultFn();

      verifyKey(schema, table, key, value, 'getOrDefault: defaultFn()');
      await core.put(table, applyValidation(table, value), resolveTtl(schema, table, ttl));
      onMutate(table);

      return value;
    },
    async has(table, key) {
      checkScope(table);

      return core.has(table, key);
    },
    async isEmpty(table) {
      checkScope(table);

      return (await core.count(table)) === 0;
    },
    async keys(table, filter) {
      checkScope(table);

      if (filter) {
        const records = await core.getAll(table);
        const keyField = schema[table].key;

        return records.filter(filter).map((r) => (r as Record<string, unknown>)[keyField] as KeyOf<S, typeof table>);
      }

      // R1: prefer native getAllKeys when the backend supports it (e.g. IDB store.getAllKeys).
      if (core.getAllKeys) {
        return core.getAllKeys(table);
      }

      const records = await core.getAll(table);
      const keyField = schema[table].key;

      return records.map((r) => (r as Record<string, unknown>)[keyField] as KeyOf<S, typeof table>);
    },
    async put(table, value, ttl) {
      checkScope(table);

      await core.put(table, applyValidation(table, value), resolveTtl(schema, table, ttl));
      onMutate(table);
    },
    async putAll(table, values, ttl) {
      checkScope(table);

      if (values.length === 0) return;

      const toWrite = values.map((v) => applyValidation(table, v));

      await core.putAll(table, toWrite, resolveTtl(schema, table, ttl));
      onMutate(table);
    },
    query(table) {
      checkScope(table);

      return createQueryBuilder(buildQueryCtx(table, core, schema, onMutate));
    },
    async update(table, key, changes, ttl) {
      checkScope(table);

      const current = await core.get(table, key);

      if (!current) return undefined;

      const merged = { ...current, ...changes } as RecordOf<S, typeof table>;

      verifyKey(schema, table, key, merged, 'update');
      await core.put(table, applyValidation(table, merged), resolveTtl(schema, table, ttl));
      onMutate(table);

      return merged;
    },
    async upsert(table, key, fn, ttl) {
      checkScope(table);

      const existing = await core.get(table, key);
      const value = fn(existing);

      verifyKey(schema, table, key, value, 'upsert: fn()');
      await core.put(table, applyValidation(table, value), resolveTtl(schema, table, ttl));
      onMutate(table);

      return value;
    },
  };
}

/* -------------------- buildAdapterOps -------------------- */

export function buildAdapterOps<S extends AnySchema>(
  schema: S,
  core: StorageBackend<S>,
  options?: BaseAdapterOptions<S> & {
    buildBatch?: (deps: BatchDeps<S>) => BatchImpl<S>;
    onCrossTabMessage?: (notify: (table: keyof S & string) => void) => (() => void) | undefined;
    onMutation?: (table: keyof S & string) => void;
  },
): Adapter<S> {
  const { logger, onMetrics, signals, validators } = options ?? {};

  const observers = createObserverHub<S>(
    (table) => core.getAll(table),
    logger
      ? (err) =>
          logger.error(err instanceof Error ? err : new Error(String(err)), '[vault] observer notification failed')
      : undefined,
  );

  // Per-table live-count cache. Populated lazily on first count() call.
  // Invalidated on every mutation via notifyMutation.
  const countCache = new Map<string, number>();

  const getCachedCount = async (table: keyof S & string): Promise<number> => {
    if (countCache.has(table)) return countCache.get(table)!;

    const n = await core.count(table);

    countCache.set(table, n);

    return n;
  };

  const notifyMutation = (table: keyof S & string): void => {
    countCache.delete(table); // invalidate on any mutation
    observers.notify(table);
    options?.onMutation?.(table);
  };

  // Cross-tab notifications must NOT call onMutation (which would re-publish to BroadcastChannel,
  // creating an infinite loop). They only need to invalidate the count cache and notify observers.
  const notifyExternal = (table: keyof S & string): void => {
    countCache.delete(table);
    observers.notify(table);
  };

  // R6: Resolve optional backend capabilities once at construction — no per-call checks.
  const pruneAll = core.pruneAllExpired?.bind(core);
  const rawCountFn = core.getRawCount?.bind(core);

  const disconnectExternal = options?.onCrossTabMessage?.(notifyExternal) ?? undefined;

  if (signals) {
    for (const [tableName, signal] of Object.entries(signals)) {
      if (signal) {
        observers.observe(tableName as keyof S & string, (records) => {
          signal.update(() => records as RecordOf<S, keyof S>[]);
        });
      }
    }
  }

  const validate = <K extends keyof S & string>(table: K, value: RecordOf<S, K>): RecordOf<S, K> => {
    const validator = validators?.[table];

    if (!validator) return value;

    try {
      return validator.parse(value) as RecordOf<S, K>;
    } catch (err) {
      throw new VaultError(`validation failed for table "${table}"`, { cause: err });
    }
  };

  /* Timed wrapper — only wraps when onMetrics is present, otherwise zero overhead. */
  const timed = <T>(table: string, op: MetricsEvent['operation'], fn: () => Promise<T>): Promise<T> => {
    if (!onMetrics) return fn();

    const start = getTimestamp();

    return fn().finally(() => onMetrics({ duration: getTimestamp() - start, operation: op, table }));
  };

  const deferredBatch = async <K extends keyof S & string, R>(
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
    scope: ReadonlySet<string>,
  ): Promise<R> => {
    const dirty = new Set<K>();
    const tx = buildTxContext<S, K>(schema, core as StorageBackend<S, K>, (t) => dirty.add(t), validate, scope);
    const result = await fn(tx);

    for (const t of dirty) {
      notifyMutation(t);
    }

    return result;
  };

  const nativeBatch = options?.buildBatch?.({ notifyMutation, validate });

  const txCtx = buildTxContext<S, keyof S & string>(schema, core, notifyMutation, validate);

  const observeMany = createObserveMany<S>(observers);

  const disposeController = new AbortController();
  let disposed = false;

  const checkDisposed = (): void => {
    if (disposed) throw new VaultDisposedError();
  };

  const adapter: Adapter<S> = {
    async batch<K extends keyof S & string, R>(tables: readonly K[], fn: (tx: TransactionContext<S, K>) => Promise<R>) {
      checkDisposed();

      if (tables.length === 0) throw new VaultScopeError('batch requires at least one table');

      return timed('*', 'batch', () => (nativeBatch ? nativeBatch(tables, fn) : deferredBatch(fn, new Set(tables))));
    },

    async clear(table) {
      checkDisposed();
      await timed(table, 'clear', () => txCtx.clear(table));
      countCache.set(table, 0); // we know count is 0 after clear
    },

    async count(table) {
      checkDisposed();

      return timed(table, 'count', () => getCachedCount(table));
    },

    async debug() {
      checkDisposed();

      const tableNames = Object.keys(schema) as Array<keyof S & string>;
      const entries = await Promise.all(
        tableNames.map(async (name) => {
          // getRawCount must be called before core.count() because count() has
          // lazy-eviction side effects (deletes expired entries from the store).
          const raw = rawCountFn ? await rawCountFn(name) : undefined;
          const live = await core.count(name);

          // Warm the count cache so subsequent adapter.count() calls don't re-hit the backend.
          countCache.set(name, live);

          const expiredCount = raw !== undefined ? Math.max(0, raw - live) : 0;

          return { expiredCount, name, recordCount: live };
        }),
      );

      return { tables: entries } as DebugInfo<S>;
    },

    async delete(table, key) {
      checkDisposed();

      return timed(table, 'delete', () => txCtx.delete(table, key));
      // count cache invalidated by notifyMutation inside txCtx.delete
    },

    async deleteMany(table, keys) {
      checkDisposed();

      return timed(table, 'deleteMany', () => txCtx.deleteMany(table, keys));
      // count cache invalidated by notifyMutation inside txCtx.deleteMany
    },

    get disposalSignal(): AbortSignal {
      return disposeController.signal;
    },

    async dispose() {
      if (disposed) return;

      disposed = true;
      disposeController.abort();
      disconnectExternal?.();
      observers.dispose();
      await core.dispose?.();
    },

    get disposed(): boolean {
      return disposed;
    },

    async entries(table) {
      checkDisposed();

      return timed(table, 'entries', () => txCtx.entries(table));
    },

    async get(table, key) {
      checkDisposed();

      return timed(table, 'get', () => txCtx.get(table, key));
    },

    async getAll(table) {
      checkDisposed();

      return timed(table, 'getAll', () => txCtx.getAll(table));
    },

    async getMany(table, keys) {
      checkDisposed();

      return timed(table, 'getMany', () => txCtx.getMany(table, keys));
    },

    async getOrDefault(table, key, defaultFn, ttl) {
      checkDisposed();

      return timed(table, 'getOrDefault', () => txCtx.getOrDefault(table, key, defaultFn, ttl));
    },

    async has(table, key) {
      checkDisposed();

      return timed(table, 'has', () => txCtx.has(table, key));
    },

    async isEmpty(table) {
      checkDisposed();

      return timed(table, 'isEmpty', async () => (await getCachedCount(table)) === 0);
    },

    async keys(table, filter) {
      checkDisposed();

      return timed(table, 'keys', () => txCtx.keys(table, filter));
    },

    observe(table, listener, opts) {
      checkDisposed();

      return observers.observe(table, listener, opts);
    },

    observeMany: (tables, listener, opts) => {
      checkDisposed();

      return observeMany(tables, listener, opts);
    },

    async pruneExpired(tables?: readonly (keyof S & string)[]) {
      checkDisposed();

      const tableNames = tables ?? (Object.keys(schema) as Array<keyof S & string>);

      if (!tables && pruneAll) {
        const result = await pruneAll();

        for (const [name, count] of Object.entries(result)) {
          if (count > 0) countCache.delete(name);
        }

        return result as { [K in keyof S & string]: number };
      }

      const pairs = await Promise.all(
        tableNames.map(async (name) => {
          const pruned = await core.pruneExpiredInTable(name);

          if (pruned > 0) countCache.delete(name);

          return [name, pruned] as const;
        }),
      );

      return Object.fromEntries(pairs) as { [K in keyof S & string]: number };
    },

    async put(table, value, ttl) {
      checkDisposed();
      await timed(table, 'put', () => txCtx.put(table, value, ttl));
      // count cache invalidated via notifyMutation inside txCtx.put
    },

    async putAll(table, values, ttl) {
      checkDisposed();
      await timed(table, 'putAll', () => txCtx.putAll(table, values, ttl));
      // count cache invalidated via notifyMutation inside txCtx.putAll
    },

    query(table) {
      checkDisposed();

      const ctx = buildQueryCtx(table, core, schema, notifyMutation);

      if (onMetrics) {
        return createQueryBuilder({
          ...ctx,
          deleteMany: ctx.deleteMany
            ? (records) => timed(table, 'queryDelete', () => ctx.deleteMany!(records))
            : undefined,
          source: () => timed(table, 'query', () => core.getAll(table)),
        });
      }

      return createQueryBuilder(ctx);
    },

    async [Symbol.asyncDispose]() {
      await adapter.dispose();
    },

    async update(table, key, changes, ttl) {
      checkDisposed();

      return timed(table, 'update', () => txCtx.update(table, key, changes, ttl));
    },

    async upsert(table, key, fn, ttl) {
      checkDisposed();

      return timed(table, 'upsert', () => txCtx.upsert(table, key, fn, ttl));
    },

    watch(table, options) {
      checkDisposed();

      return createWatchIterable<RecordOf<S, typeof table>>(
        (listener) => observers.observe(table, listener),
        options?.mode ?? 'latest',
        options?.signal,
      );
    },
  };

  return adapter;
}
