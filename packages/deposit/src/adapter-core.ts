import type { DepositLogger, TableSignals, TableValidators } from './plugins';
import type { Adapter, AnySchema, DebugInfo, KeyOf, MetricsEvent, RecordOf, TransactionContext, TtlMs } from './types';

import { createObserverHub, createWatchIterable, getRecordKey } from './internal';
import { createQueryBuilder, type NativeRange, type QueryContext } from './query';
import { assertTtlMs } from './ttl';

/* -------------------- Internal backend protocols (adapter → runtime bridge) -------------------- */

/** @internal Storage operations subset — used by `buildTxContext` and the IDB batch transaction core. */
export type AdapterStorageOps<S extends AnySchema, K extends keyof S = keyof S> = {
  clear<T extends K>(table: T): Promise<void>;
  /** Returns live (non-expired) record count for the table. */
  count<T extends K>(table: T): Promise<number>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  /** Delete multiple records by key in a single operation. Returns the number physically removed. */
  deleteMany<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<number>;
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  /**
   * Optional primary-key range fetch for push-down queries. When present, `query()` activates
   * `getRange` in the QueryContext so that a leading `equals`, `between`, or `startsWith` on the
   * key field avoids a full-table scan. Falls back to `getAll` when absent.
   */
  getByKeyRange?<T extends K>(table: T, range: NativeRange): Promise<RecordOf<S, T>[]>;
  /**
   * Fetch multiple records by key in a single operation. Preserves key order; missing keys yield `undefined`.
   * Optional: adapters that can batch key lookups efficiently (e.g. IndexedDB single transaction) should
   * implement this. Falls back to N individual `get` calls when absent.
   */
  getMany?<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<Array<RecordOf<S, T> | undefined>>;
  has<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: TtlMs): Promise<void>;
  putAll<T extends K>(table: T, values: RecordOf<S, T>[], ttl?: TtlMs): Promise<void>;
};

/** @internal Full backend protocol — `AdapterStorageOps` plus lifecycle and maintenance hooks. */
export type AdapterBackend<S extends AnySchema, K extends keyof S = keyof S> = AdapterStorageOps<S, K> & {
  dispose?(): void;
  /** Raw record count including TTL-expired entries. Used only for debug(). */
  getRawCount?<T extends K>(table: T): Promise<number>;
  /**
   * Optional: prune all expired records across all tables in a single atomic operation.
   * When present, `pruneExpired()` delegates here instead of calling `pruneExpiredInTable` N times.
   * Implement this for adapters where a single multi-table operation is cheaper (e.g. IndexedDB).
   */
  pruneAllExpired?(): Promise<Record<string, number>>;
  /** Explicitly prune expired records from the table. Returns the number of records deleted. */
  pruneExpiredInTable<T extends K>(table: T): Promise<number>;
};

/* -------------------- Shared timestamp helper (avoids duplicated typeof performance checks) -------------------- */

const getTimestamp: () => number = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();

/* -------------------- TTL resolution (explicit > schema default > none) -------------------- */

function resolveTtl<S extends AnySchema, K extends keyof S>(schema: S, table: K, ttl?: TtlMs): TtlMs | undefined {
  if (ttl !== undefined) assertTtlMs(ttl, 'put/putAll');

  return ttl ?? schema[table].defaultTtl;
}

/* -------------------- Key validation (used in update/upsert) -------------------- */

function verifyKey<S extends AnySchema, K extends keyof S>(
  schema: S,
  table: K,
  expected: KeyOf<S, K>,
  value: RecordOf<S, K>,
  op: string,
): void {
  const actual = getRecordKey(schema, table, value);

  if (actual !== expected) {
    throw new Error(
      `[deposit] ${op}: key field "${String(schema[table].key)}" must be "${String(expected)}" but got "${String(actual)}" in table "${String(table)}"`,
    );
  }
}

/* -------------------- Shared deleteMany builder (used in both tx and adapter query) -------------------- */

function makeDeleteMany<S extends AnySchema, K extends keyof S>(
  core: Pick<AdapterStorageOps<S, K>, 'deleteMany'>,
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

function createBatchScope<K extends PropertyKey>(tables: readonly K[]): ReadonlySet<string> {
  if (tables.length === 0) {
    throw new Error('[deposit] batch requires at least one table');
  }

  return new Set(tables.map(String));
}

function assertTableInBatchScope(scope: ReadonlySet<string>, table: PropertyKey): void {
  if (!scope.has(String(table))) {
    throw new Error(`[deposit] table "${String(table)}" is not part of this batch scope`);
  }
}

/**
 * Wraps a TransactionContext with scope enforcement for use inside batch callbacks.
 * Every table access is checked against `scope` before delegating to `inner`.
 */
export function withScope<S extends AnySchema, K extends keyof S>(
  inner: TransactionContext<S, K>,
  scope: ReadonlySet<string>,
): TransactionContext<S, K> {
  const check = (table: K): void => assertTableInBatchScope(scope, table);

  return {
    clear<T extends K>(t: T) {
      check(t);

      return inner.clear(t);
    },
    count<T extends K>(t: T) {
      check(t);

      return inner.count(t);
    },
    delete<T extends K>(t: T, k: KeyOf<S, T>) {
      check(t);

      return inner.delete(t, k);
    },
    deleteMany<T extends K>(t: T, ks: KeyOf<S, T>[]) {
      check(t);

      return inner.deleteMany(t, ks);
    },
    get<T extends K>(t: T, k: KeyOf<S, T>) {
      check(t);

      return inner.get(t, k);
    },
    getAll<T extends K>(t: T) {
      check(t);

      return inner.getAll(t);
    },
    getMany<T extends K>(t: T, ks: KeyOf<S, T>[]) {
      check(t);

      return inner.getMany(t, ks);
    },
    getOrDefault<T extends K>(t: T, k: KeyOf<S, T>, fn: () => RecordOf<S, T>, ttl?: TtlMs) {
      check(t);

      return inner.getOrDefault(t, k, fn, ttl);
    },
    has<T extends K>(t: T, k: KeyOf<S, T>) {
      check(t);

      return inner.has(t, k);
    },
    iterate<T extends K>(t: T) {
      check(t);

      return inner.iterate(t);
    },
    put<T extends K>(t: T, v: RecordOf<S, T>, ttl?: TtlMs) {
      check(t);

      return inner.put(t, v, ttl);
    },
    putAll<T extends K>(t: T, vs: RecordOf<S, T>[], ttl?: TtlMs) {
      check(t);

      return inner.putAll(t, vs, ttl);
    },
    query<T extends K>(t: T) {
      check(t);

      return inner.query(t);
    },
    update<T extends K>(t: T, k: KeyOf<S, T>, c: Partial<RecordOf<S, T>>, ttl?: TtlMs) {
      check(t);

      return inner.update(t, k, c, ttl);
    },
    upsert<T extends K>(t: T, k: KeyOf<S, T>, fn: (e: RecordOf<S, T> | undefined) => RecordOf<S, T>, ttl?: TtlMs) {
      check(t);

      return inner.upsert(t, k, fn, ttl);
    },
  };
}

/* -------------------- Query context builder (shared between tx and adapter paths) -------------------- */

function buildQueryCtx<S extends AnySchema, K extends keyof S>(
  table: K,
  core: Pick<AdapterStorageOps<S, K>, 'deleteMany' | 'getAll' | 'getByKeyRange'>,
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

/* Fallback for optional getMany — lives here so both buildTxContext and any future path share one impl. */
function getManyWithFallback<S extends AnySchema, K extends keyof S>(
  core: Pick<AdapterStorageOps<S, K>, 'get' | 'getMany'>,
  table: K,
  keys: KeyOf<S, K>[],
): Promise<Array<RecordOf<S, K> | undefined>> {
  if (core.getMany) return core.getMany(table, keys);

  return Promise.all(keys.map((k) => core.get(table, k)));
}

/* -------------------- buildTxContext: turns AdapterBackend into a TransactionContext -------------------- */

export function buildTxContext<S extends AnySchema, K extends keyof S>(
  schema: S,
  core: AdapterStorageOps<S, K>,
  onMutate: (table: K) => void,
  validate?: <T extends K>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
): TransactionContext<S, K> {
  const applyValidation = validate ?? ((_: K, v: RecordOf<S, K>) => v);

  return {
    async clear(table) {
      // Use live count to decide whether clear is meaningful.
      // core.count() also lazily evicts expired records as a side-effect, so after this
      // call the table contains only live records (if any). This prevents spurious observer
      // notifications when all records were already TTL-expired.
      const live = await core.count(table);

      if (live === 0) return;

      await core.clear(table);
      onMutate(table);
    },
    async count(table) {
      return core.count(table);
    },
    async delete(table, key) {
      const deleted = await core.delete(table, key);

      if (deleted) onMutate(table);

      return deleted;
    },
    async deleteMany(table, keys) {
      const deleted = await core.deleteMany(table, keys);

      if (deleted > 0) onMutate(table);

      return deleted;
    },
    async get(table, key) {
      return core.get(table, key);
    },
    async getAll(table) {
      return core.getAll(table);
    },
    async getMany(table, keys) {
      return getManyWithFallback(core, table, keys);
    },
    async getOrDefault(table, key, defaultFn, ttl) {
      const existing = await core.get(table, key);

      if (existing !== undefined) return existing;

      const value = defaultFn();

      verifyKey(schema, table, key, value, 'getOrDefault: defaultFn()');
      await core.put(table, applyValidation(table, value), resolveTtl(schema, table, ttl));
      onMutate(table);

      return value;
    },
    async has(table, key) {
      return core.has(table, key);
    },
    async *iterate(table) {
      // NOTE: All adapters materialize the full table before yielding records.
      // Early-exit (break) avoids iterating the remaining slice, but does not reduce memory usage.
      // Use query().first() or query().filter(...).toArray() when memory efficiency matters.
      for (const record of await core.getAll(table)) {
        yield record;
      }
    },
    async put(table, value, ttl) {
      await core.put(table, applyValidation(table, value), resolveTtl(schema, table, ttl));
      onMutate(table);
    },
    async putAll(table, values, ttl) {
      const toWrite = values.map((v) => applyValidation(table, v));

      await core.putAll(table, toWrite, resolveTtl(schema, table, ttl));

      if (values.length > 0) onMutate(table);
    },
    query(table) {
      return createQueryBuilder(buildQueryCtx(table, core, schema, onMutate));
    },
    async update(table, key, changes, ttl) {
      const current = await core.get(table, key);

      if (!current) return undefined;

      const merged = { ...current, ...changes } as RecordOf<S, typeof table>;

      verifyKey(schema, table, key, merged, 'update');
      await core.put(table, applyValidation(table, merged), resolveTtl(schema, table, ttl));
      onMutate(table);

      return merged;
    },
    async upsert(table, key, fn, ttl) {
      const existing = await core.get(table, key);
      const value = fn(existing);

      verifyKey(schema, table, key, value, 'upsert: fn()');
      await core.put(table, applyValidation(table, value), resolveTtl(schema, table, ttl));
      onMutate(table);

      return value;
    },
  };
}

/* -------------------- buildAdapterOps: the single flat factory -------------------- */

export function buildAdapterOps<S extends AnySchema>(
  schema: S,
  core: AdapterBackend<S>,
  options?: {
    /** Adapter-provided batch override (e.g. real IDB transaction). Falls back to soft batch.
     *  Receives `notifyMutation` and `validate` via the deps object at construction time,
     *  and returns a plain `(tables, fn) => Promise<R>` function.
     */
    batch?: (deps: {
      notifyMutation: (table: keyof S) => void;
      validate: <K extends keyof S>(table: K, value: RecordOf<S, K>) => RecordOf<S, K>;
    }) => <K extends keyof S, R>(tables: readonly K[], fn: (tx: TransactionContext<S, K>) => Promise<R>) => Promise<R>;
    connectExternal?: (notify: (table: keyof S) => void) => (() => void) | void;
    /** Structured logger. A @vielzeug/logit Logger satisfies DepositLogger directly. */
    logger?: DepositLogger;
    onMetrics?: (event: MetricsEvent) => void;
    onMutation?: (table: keyof S) => void;
    /**
     * Per-table reactive signals. A @vielzeug/stateit Signal<T[]> satisfies ReactiveSignal directly.
     * Each signal is kept in sync with its table automatically via observe().
     */
    signals?: TableSignals<S>;
    /** Per-table validators. A @vielzeug/validit Schema satisfies this directly via `parse()`. */
    validators?: TableValidators<S>;
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

  const disconnectExternal = options?.connectExternal?.(observers.notify) ?? undefined;

  /* -- Wire per-table reactive signals: each fires signal.update(() => snapshot) on change -- */
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

  /* -- Validation helper: no-op when no validator registered for the table -- */
  const validate = <K extends keyof S>(table: K, value: RecordOf<S, K>): RecordOf<S, K> => {
    const validator = validators?.[table];

    if (!validator) return value;

    return validator.parse(value) as RecordOf<S, K>;
  };

  /* -- Metrics helper (uses shared getTimestamp constant) -- */
  const timed = <T>(table: string, op: MetricsEvent['operation'], fn: () => Promise<T>): Promise<T> => {
    if (!onMetrics) return fn();

    const start = getTimestamp();

    return fn().finally(() => onMetrics({ duration: getTimestamp() - start, operation: op, table }));
  };

  /* -- Soft batch: defers notifications until fn resolves -- */
  const softBatch = async <K extends keyof S, R>(
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
    scope: ReadonlySet<string>,
  ): Promise<R> => {
    const dirty = new Set<K>();
    const tx = buildTxContext<S, K>(schema, core as AdapterStorageOps<S, K>, (t) => dirty.add(t), validate);
    const result = await fn(withScope(tx, scope));

    for (const t of dirty) {
      notifyMutation(t);
    }

    return result;
  };

  const externalBatch = options?.batch?.({ notifyMutation, validate });

  /* -- Single tx context for delegation (keyof S scope, notifyMutation, validate) -- */
  const txCtx = buildTxContext<S, keyof S>(schema, core, notifyMutation, validate);

  const adapter: Adapter<S> = {
    async batch<K extends keyof S, R>(tables: readonly K[], fn: (tx: TransactionContext<S, K>) => Promise<R>) {
      // createBatchScope enforces the non-empty constraint and builds the scope set once.
      // Scope enforcement for reads/writes is handled by the scope param in buildTxContext (softBatch)
      // or by the IDB transaction itself (externalBatch).
      const scope = createBatchScope(tables);

      return timed('*', 'batch', () => (externalBatch ? externalBatch(tables, fn) : softBatch(fn, scope)));
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
          // getRawCount and count are separate calls — a write between them can make
          // expiredCount slightly inaccurate. Acceptable for a diagnostic function.
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

    async getOrDefault(table, key, defaultFn, ttl) {
      return timed(String(table), 'getOrDefault', () => txCtx.getOrDefault(table, key, defaultFn, ttl));
    },

    async has(table, key) {
      return timed(String(table), 'has', () => txCtx.has(table, key));
    },

    iterate(table) {
      if (!onMetrics) return txCtx.iterate(table);

      const start = getTimestamp();
      const tableStr = String(table);

      return (async function* () {
        try {
          for await (const record of txCtx.iterate(table)) {
            yield record;
          }
        } finally {
          onMetrics({ duration: getTimestamp() - start, operation: 'iterate', table: tableStr });
        }
      })();
    },

    observe(table, listener, opts) {
      return observers.observe(table, listener, opts);
    },

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

    /**
     * Observer registration is deferred until the first `next()` call (lazy registration).
     * An abandoned iterable — one whose [Symbol.asyncIterator]() was called but next() was
     * never invoked — does NOT register an observer, preventing the leak present with eager
     * registration.
     */
    watch<K extends keyof S>(table: K): AsyncIterable<RecordOf<S, K>[]> {
      return createWatchIterable<RecordOf<S, K>>((listener) =>
        observers.observe(table as keyof S, listener as (records: RecordOf<S, keyof S>[]) => void, {
          immediate: true,
        }),
      );
    },
  };

  return adapter;
}
