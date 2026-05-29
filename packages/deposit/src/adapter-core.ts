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

import { DepositError, DepositScopeError } from './errors';
import { createObserveMany, createObserverHub, createWatchIterable, getRecordKey } from './internal';
import { createQueryBuilder, type NativeRange, type QueryContext } from './query';
import { assertTtlMs } from './ttl';

/* -------------------- Internal backend protocol -------------------- */

/**
 * @internal Full backend protocol implemented by each adapter.
 * A single flat interface — no StorageCore/StorageBackend split.
 */
export type StorageBackend<S extends AnySchema, K extends keyof S = keyof S> = {
  clear<T extends K>(table: T): Promise<void>;
  /** Returns live (non-expired) record count for the table. */
  count<T extends K>(table: T): Promise<number>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  deleteMany<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<number>;
  dispose?(): void;
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
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

/* -------------------- Exported types for adapter implementors -------------------- */

export type BatchDeps<S extends AnySchema> = {
  notifyMutation: (table: keyof S) => void;
  validate: <K extends keyof S>(table: K, value: RecordOf<S, K>) => RecordOf<S, K>;
};

export type BatchImpl<S extends AnySchema> = <K extends keyof S, R>(
  tables: readonly K[],
  fn: (tx: TransactionContext<S, K>) => Promise<R>,
) => Promise<R>;

/* -------------------- Helpers -------------------- */

const getTimestamp: () => number = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();

function resolveTtl<S extends AnySchema, K extends keyof S>(schema: S, table: K, ttl?: TtlMs): TtlMs | undefined {
  if (ttl !== undefined) assertTtlMs(ttl, 'put/putAll');

  return ttl ?? schema[table].defaultTtl;
}

function verifyKey<S extends AnySchema, K extends keyof S>(
  schema: S,
  table: K,
  expected: KeyOf<S, K>,
  value: RecordOf<S, K>,
  op: string,
): void {
  const actual = getRecordKey(schema, table, value);

  if (actual !== expected) {
    throw new DepositError(
      `${op}: key field "${String(schema[table].key)}" must be "${String(expected)}" but got "${String(actual)}" in table "${String(table)}"`,
    );
  }
}

function makeDeleteMany<S extends AnySchema, K extends keyof S>(
  core: Pick<StorageBackend<S, K>, 'deleteMany'>,
  schema: S,
  table: K,
  onMutate: (table: K) => void,
): (records: RecordOf<S, K>[]) => Promise<number> {
  return async (records) => {
    if (records.length === 0) return 0;

    const keys = records.map((r) => getRecordKey(schema, table, r));
    const deleted = await core.deleteMany(table, keys);

    if (deleted > 0) onMutate(table);

    return deleted;
  };
}

function getManyWithFallback<S extends AnySchema, K extends keyof S>(
  core: Pick<StorageBackend<S, K>, 'get' | 'getMany'>,
  table: K,
  keys: KeyOf<S, K>[],
): Promise<Array<RecordOf<S, K> | undefined>> {
  if (core.getMany) return core.getMany(table, keys);

  return Promise.all(keys.map((k) => core.get(table, k)));
}

function buildQueryCtx<S extends AnySchema, K extends keyof S>(
  table: K,
  core: Pick<StorageBackend<S, K>, 'deleteMany' | 'getAll' | 'getByKeyRange'>,
  schema: S,
  onMutate: (t: K) => void,
  wrapFetch?: <T>(fn: () => Promise<T>) => Promise<T>,
  wrapDelete?: (base: (records: RecordOf<S, K>[]) => Promise<number>) => (records: RecordOf<S, K>[]) => Promise<number>,
): QueryContext<RecordOf<S, K>> {
  const keyField = schema[table].key;
  const deleteManyBase = makeDeleteMany(core, schema, table, onMutate);
  const rawRange = core.getByKeyRange
    ? (range: NativeRange) => core.getByKeyRange!(table, range) as Promise<RecordOf<S, typeof table>[]>
    : undefined;
  const fetch = wrapFetch ?? ((fn) => fn());

  return {
    deleteMany: wrapDelete ? wrapDelete(deleteManyBase) : deleteManyBase,
    getRange: rawRange ? (range) => fetch(() => rawRange(range)) : undefined,
    keyField,
    source: () => fetch(() => core.getAll(table)),
  };
}

/* -------------------- buildTxContext -------------------- */

export function buildTxContext<S extends AnySchema, K extends keyof S>(
  schema: S,
  core: StorageBackend<S, K>,
  onMutate: (table: K) => void,
  validate?: <T extends K>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
  scope?: ReadonlySet<string>,
): TransactionContext<S, K> {
  const applyValidation = validate ?? ((_: K, v: RecordOf<S, K>) => v);

  const checkScope = scope
    ? (t: K): void => {
        if (!scope.has(String(t))) {
          throw new DepositScopeError(`table "${String(t)}" is not part of this batch scope`);
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
    onCrossTabMessage?: (notify: (table: keyof S) => void) => (() => void) | undefined;
    onMutation?: (table: keyof S) => void;
  },
): Adapter<S> {
  const { logger, onMetrics, signals, validators } = options ?? {};

  const observers = createObserverHub<S>(
    (table) => core.getAll(table),
    logger
      ? (err) =>
          logger.error(err instanceof Error ? err : new Error(String(err)), '[deposit] observer notification failed')
      : undefined,
  );

  const notifyMutation = (table: keyof S): void => {
    observers.notify(table);
    options?.onMutation?.(table);
  };

  const disconnectExternal = options?.onCrossTabMessage?.(observers.notify) ?? undefined;

  if (signals) {
    for (const [tableName, signal] of Object.entries(signals)) {
      if (signal) {
        observers.observe(
          tableName as keyof S,
          (records) => {
            signal.update(() => records as RecordOf<S, keyof S>[]);
          },
          { immediate: true },
        );
      }
    }
  }

  const validate = <K extends keyof S>(table: K, value: RecordOf<S, K>): RecordOf<S, K> => {
    const validator = validators?.[table];

    if (!validator) return value;

    return validator.parse(value) as RecordOf<S, K>;
  };

  /* R5: Timed wrapper — only wraps when onMetrics is present, otherwise zero overhead. */
  const timed = <T>(table: string, op: MetricsEvent['operation'], fn: () => Promise<T>): Promise<T> => {
    if (!onMetrics) return fn();

    const start = getTimestamp();

    return fn().finally(() => onMetrics({ duration: getTimestamp() - start, operation: op, table }));
  };

  const deferredBatch = async <K extends keyof S, R>(
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

  const txCtx = buildTxContext<S, keyof S>(schema, core, notifyMutation, validate);

  const observeMany = createObserveMany<S>(observers, (table) => core.getAll(table), logger);

  const adapter: Adapter<S> = {
    async batch<K extends keyof S, R>(tables: readonly K[], fn: (tx: TransactionContext<S, K>) => Promise<R>) {
      if (tables.length === 0) throw new DepositScopeError('batch requires at least one table');

      return timed('*', 'batch', () =>
        nativeBatch ? nativeBatch(tables, fn) : deferredBatch(fn, new Set(tables.map(String))),
      );
    },

    async clear(table) {
      return timed(String(table), 'clear', () => txCtx.clear(table));
    },

    async count(table) {
      return timed(String(table), 'count', () => txCtx.count(table));
    },

    async debug() {
      const tableNames = Object.keys(schema) as Array<keyof S & string>;
      const entries = await Promise.all(
        tableNames.map(async (name) => {
          const raw = core.getRawCount ? await core.getRawCount(name) : undefined;
          const live = await core.count(name);
          const expiredCount = raw !== undefined ? raw - live : 0;

          return { expiredCount, name, recordCount: live };
        }),
      );

      return { tables: entries } as DebugInfo<S>;
    },

    async delete(table, key) {
      return timed(String(table), 'delete', () => txCtx.delete(table, key));
    },

    async deleteMany(table, keys) {
      return timed(String(table), 'deleteMany', () => txCtx.deleteMany(table, keys));
    },

    dispose() {
      disconnectExternal?.();
      observers.dispose();
      core.dispose?.();
    },

    async get(table, key) {
      return timed(String(table), 'get', () => txCtx.get(table, key));
    },

    async getAll(table) {
      return timed(String(table), 'getAll', () => txCtx.getAll(table));
    },

    async getMany(table, keys) {
      return timed(String(table), 'getMany', () => txCtx.getMany(table, keys));
    },

    async has(table, key) {
      return timed(String(table), 'has', () => txCtx.has(table, key));
    },

    observe(table, listener, opts) {
      return observers.observe(table, listener, opts);
    },

    observeMany,

    async pruneExpired() {
      if (core.pruneAllExpired) {
        return core.pruneAllExpired() as { [K in keyof S & string]: number };
      }

      const tableNames = Object.keys(schema) as Array<keyof S & string>;
      const pairs = await Promise.all(
        tableNames.map(async (name) => {
          const pruned = await core.pruneExpiredInTable(name);

          return [name, pruned] as const;
        }),
      );

      return Object.fromEntries(pairs) as { [K in keyof S & string]: number };
    },

    async put(table, value, ttl) {
      return timed(String(table), 'put', () => txCtx.put(table, value, ttl));
    },

    async putAll(table, values, ttl) {
      return timed(String(table), 'putAll', () => txCtx.putAll(table, values, ttl));
    },

    query(table) {
      return createQueryBuilder(
        buildQueryCtx(
          table,
          core,
          schema,
          notifyMutation,
          onMetrics ? (fn) => timed(String(table), 'query', fn) : undefined,
          onMetrics ? (base) => (records) => timed(String(table), 'queryDelete', () => base(records)) : undefined,
        ),
      );
    },

    async update(table, key, changes, ttl) {
      return timed(String(table), 'update', () => txCtx.update(table, key, changes, ttl));
    },

    async upsert(table, key, fn, ttl) {
      return timed(String(table), 'upsert', () => txCtx.upsert(table, key, fn, ttl));
    },

    watch(table) {
      return createWatchIterable<RecordOf<S, typeof table>>((listener) =>
        observers.observe(table, listener, { immediate: true }),
      );
    },
  };

  return adapter;
}
