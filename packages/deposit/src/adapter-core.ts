import type { DepositLogger, TableValidators } from './plugins';
import type { Adapter, AnySchema, DebugInfo, KeyOf, MetricsEvent, RecordOf, TransactionContext, TtlMs } from './types';

import { createObserverHub, getRecordKey } from './internal';
import { createQueryBuilder } from './query';
import { assertTtlMs } from './ttl';

/* -------------------- Internal core ops type (adapter → runtime bridge) -------------------- */

export type CoreStorageOps<S extends AnySchema, K extends keyof S = keyof S> = {
  /** Clear all records. Returns the physical count of records that were present before clearing. */
  clear<T extends K>(table: T): Promise<number>;
  count<T extends K>(table: T): Promise<number>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  /** Delete multiple records by key in a single operation. Returns the number physically removed. */
  deleteMany<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<number>;
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  has<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: TtlMs): Promise<void>;
  putAll<T extends K>(table: T, values: RecordOf<S, T>[], ttl?: TtlMs): Promise<void>;
};

export type CoreRuntimeOps<S extends AnySchema, K extends keyof S = keyof S> = CoreStorageOps<S, K> & {
  dispose?(): void;
  /** Raw record count including TTL-expired entries. Used only for debug(). */
  getRawCount?<T extends K>(table: T): Promise<number>;
};

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
      `[deposit] ${op} returned a record with key "${String(actual)}" but expected "${String(expected)}" for table "${String(table)}"`,
    );
  }
}

/* -------------------- Shared deleteMany builder (used in both tx and adapter query) -------------------- */

function makeDeleteMany<S extends AnySchema, K extends keyof S>(
  core: Pick<CoreStorageOps<S, K>, 'deleteMany'>,
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

function createScopedCore<S extends AnySchema, AllK extends keyof S, K extends AllK>(
  core: CoreStorageOps<S, AllK>,
  scope: ReadonlySet<string>,
): CoreStorageOps<S, K> {
  return {
    async clear(table) {
      assertTableInBatchScope(scope, table);

      return core.clear(table);
    },
    async count(table) {
      assertTableInBatchScope(scope, table);

      return core.count(table);
    },
    async delete(table, key) {
      assertTableInBatchScope(scope, table);

      return core.delete(table, key);
    },
    async deleteMany(table, keys) {
      assertTableInBatchScope(scope, table);

      return core.deleteMany(table, keys);
    },
    async get(table, key) {
      assertTableInBatchScope(scope, table);

      return core.get(table, key);
    },
    async getAll(table) {
      assertTableInBatchScope(scope, table);

      return core.getAll(table);
    },
    async has(table, key) {
      assertTableInBatchScope(scope, table);

      return core.has(table, key);
    },
    async put(table, value, ttl) {
      assertTableInBatchScope(scope, table);

      return core.put(table, value, ttl);
    },
    async putAll(table, values, ttl) {
      assertTableInBatchScope(scope, table);

      return core.putAll(table, values, ttl);
    },
  };
}

function createScopedValidator<S extends AnySchema, K extends keyof S>(
  validate: <T extends keyof S>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
  scope: ReadonlySet<string>,
): <T extends K>(table: T, value: RecordOf<S, T>) => RecordOf<S, T> {
  return (table, value) => {
    assertTableInBatchScope(scope, table);

    return validate(table, value);
  };
}

/* -------------------- buildTxContext: turns CoreStorageOps into a TransactionContext -------------------- */

export function buildTxContext<S extends AnySchema, K extends keyof S>(
  schema: S,
  core: CoreStorageOps<S, K>,
  onMutate: (table: K) => void,
  validate?: <T extends K>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
): TransactionContext<S, K> {
  return {
    async clear(table) {
      const deleted = await core.clear(table);

      if (deleted > 0) onMutate(table);
    },
    async count(table) {
      return core.count(table);
    },
    async delete(table, key) {
      const deleted = await core.delete(table, key);

      if (deleted) onMutate(table);

      return deleted;
    },
    async get(table, key) {
      return core.get(table, key);
    },
    async getAll(table) {
      return core.getAll(table);
    },
    async has(table, key) {
      return core.has(table, key);
    },
    async *iterate(table) {
      for (const record of await core.getAll(table)) {
        yield record;
      }
    },
    async put(table, value, ttl) {
      await core.put(table, validate ? validate(table, value) : value, resolveTtl(schema, table, ttl));
      onMutate(table);
    },
    async putAll(table, values, ttl) {
      const toWrite = validate ? values.map((v) => validate(table, v)) : values;

      await core.putAll(table, toWrite, resolveTtl(schema, table, ttl));

      if (values.length > 0) onMutate(table);
    },
    query(table) {
      return createQueryBuilder({
        deleteMany: makeDeleteMany(core, schema, table, onMutate),
        source: () => core.getAll(table),
      });
    },
    async update(table, key, changes, ttl) {
      const current = await core.get(table, key);

      if (!current) return undefined;

      const merged = { ...current, ...changes } as RecordOf<S, typeof table>;

      verifyKey(schema, table, key, merged, 'update');
      await core.put(table, validate ? validate(table, merged) : merged, resolveTtl(schema, table, ttl));
      onMutate(table);

      return merged;
    },
    async upsert(table, key, fn, ttl) {
      const existing = await core.get(table, key);
      const value = fn(existing);

      verifyKey(schema, table, key, value, 'upsert');
      await core.put(table, validate ? validate(table, value) : value, resolveTtl(schema, table, ttl));
      onMutate(table);

      return value;
    },
  };
}

/* -------------------- buildAdapterOps: the single flat factory -------------------- */

export function buildAdapterOps<S extends AnySchema>(
  schema: S,
  core: CoreRuntimeOps<S>,
  options?: {
    /** Adapter-provided batch override (e.g. real IDB transaction). Falls back to soft batch. */
    batch?: <K extends keyof S, R>(
      tables: readonly K[],
      fn: (tx: TransactionContext<S, K>) => Promise<R>,
      notifyMutation: (table: K) => void,
      validate: <T extends K>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
    ) => Promise<R>;
    connectExternal?: (notify: (table: keyof S) => void) => (() => void) | void;
    /** Structured logger. A @vielzeug/logit Logger satisfies DepositLogger directly. */
    logger?: DepositLogger;
    onMetrics?: (event: MetricsEvent) => void;
    onMutation?: (table: keyof S) => void;
    /** Per-table validators. A @vielzeug/validit Schema satisfies this directly via `parse()`. */
    validators?: TableValidators<S>;
  },
): { adapter: Adapter<S>; notifyMutation: (table: keyof S) => void } {
  const { logger, onMetrics, validators } = options ?? {};

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

  /* -- Validation helper: no-op when no validator registered for the table -- */
  const validate = <K extends keyof S>(table: K, value: RecordOf<S, K>): RecordOf<S, K> => {
    const validator = validators?.[table];

    if (!validator) return value;

    return validator.parse(value) as RecordOf<S, K>;
  };

  /* -- Metrics helper -- */
  const timed = <T>(table: string, op: MetricsEvent['operation'], fn: () => Promise<T>): Promise<T> => {
    if (!onMetrics) return fn();

    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;

    return fn().then(
      (result) => {
        onMetrics({ duration: elapsed(), operation: op, table });

        return result;
      },
      (err: unknown) => {
        onMetrics({ duration: elapsed(), operation: op, table });

        return Promise.reject(err);
      },
    );
  };

  /* -- Soft batch: defers notifications until fn resolves -- */
  const softBatch = async <K extends keyof S, R>(
    tables: readonly K[],
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
    notify: (table: K) => void,
    validateFn: <T extends K>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
  ): Promise<R> => {
    const scope = createBatchScope(tables);
    const dirty = new Set<K>();
    const txOps = buildTxContext<S, K>(
      schema,
      createScopedCore<S, keyof S, K>(core, scope),
      (t) => dirty.add(t),
      validateFn,
    );
    const result = await fn(txOps);

    for (const t of dirty) {
      notify(t);
    }

    return result;
  };

  const batchFn = options?.batch ?? softBatch;

  /* -- Single tx context for delegation (keyof S scope, notifyMutation, validate) -- */
  const txCtx = buildTxContext<S, keyof S>(schema, core, notifyMutation, validate);

  const adapter: Adapter<S> = {
    async batch<K extends keyof S, R>(tables: readonly K[], fn: (tx: TransactionContext<S, K>) => Promise<R>) {
      return timed('*', 'batch', () => {
        const scope = createBatchScope(tables);

        return batchFn(
          tables,
          fn,
          (table) => {
            assertTableInBatchScope(scope, table);
            notifyMutation(table);
          },
          createScopedValidator<S, K>(validate, scope),
        );
      });
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
          // getRawCount and getAll are separate calls — a write between them can make
          // expiredCount slightly inaccurate. Acceptable for a diagnostic function.
          const raw = core.getRawCount ? await core.getRawCount(name) : undefined;
          const live = await core.getAll(name);
          const expiredCount = raw !== undefined ? raw - live.length : 0;

          return { expiredCount, name, recordCount: live.length };
        }),
      );

      return { tables: entries } as DebugInfo<S>;
    },

    async delete(table, key) {
      return timed(String(table), 'delete', () => txCtx.delete(table, key));
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

    async has(table, key) {
      return timed(String(table), 'has', () => txCtx.has(table, key));
    },

    iterate(table) {
      if (!onMetrics) return txCtx.iterate(table);

      const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const tableStr = String(table);

      return (async function* () {
        try {
          for await (const record of txCtx.iterate(table)) {
            yield record;
          }
        } finally {
          const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;

          onMetrics({ duration, operation: 'iterate', table: tableStr });
        }
      })();
    },

    observe(table, listener, opts) {
      return observers.observe(table, listener, opts);
    },

    async put(table, value, ttl) {
      return timed(String(table), 'put', () => txCtx.put(table, value, ttl));
    },

    async putAll(table, values, ttl) {
      return timed(String(table), 'putAll', () => txCtx.putAll(table, values, ttl));
    },

    /* query uses a timed source so query terminal ops emit 'query' metrics events.
       query().delete() also emits a separate 'queryDelete' event for the mutation step. */
    query(table) {
      const deleteMany = makeDeleteMany(core, schema, table, notifyMutation);

      return createQueryBuilder({
        deleteMany: onMetrics
          ? (records) => timed(String(table), 'queryDelete', () => deleteMany(records))
          : deleteMany,
        source: () => timed(String(table), 'query', () => core.getAll(table)),
      });
    },

    async update(table, key, changes, ttl) {
      return timed(String(table), 'update', () => txCtx.update(table, key, changes, ttl));
    },

    async upsert(table, key, fn, ttl) {
      return timed(String(table), 'upsert', () => txCtx.upsert(table, key, fn, ttl));
    },
  };

  return { adapter, notifyMutation };
}
