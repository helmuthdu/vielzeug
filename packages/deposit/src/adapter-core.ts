import type { DepositLogger, TableValidators } from './plugins';
import type { Adapter, AnySchema, DebugInfo, KeyOf, MetricsEvent, RecordOf, TransactionContext, TtlMs } from './types';

import { createObserverHub, getRecordKey } from './internal';
import { createQueryBuilder, type QueryContext } from './query';

/* -------------------- Internal core ops type (adapter → runtime bridge) -------------------- */

export type CoreStorageOps<S extends AnySchema, K extends keyof S = keyof S> = {
  count<T extends K>(table: T): Promise<number>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  /** Clear all records. Returns the physical count of records that were present before clearing. */
  deleteAll<T extends K>(table: T): Promise<number>;
  /** Delete multiple records by key in a single operation. Returns the number physically removed. */
  deleteByKeys<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<number>;
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
  return ttl ?? (schema[table] as { defaultTtl?: TtlMs }).defaultTtl;
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
  core: Pick<CoreStorageOps<S, K>, 'deleteByKeys'>,
  schema: S,
  table: K,
  onMutate: (table: K) => void,
): QueryContext<RecordOf<S, K>>['deleteMany'] {
  return async (records) => {
    if (records.length === 0) return 0;

    const keys = records.map((r) => getRecordKey(schema, table, r));
    const deleted = await core.deleteByKeys(table, keys);

    if (deleted > 0) onMutate(table);

    return deleted;
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
    async count(table) {
      return core.count(table);
    },
    async delete(table, key) {
      const deleted = await core.delete(table, key);

      if (deleted) onMutate(table);

      return deleted;
    },
    async deleteAll(table) {
      const deleted = await core.deleteAll(table);

      if (deleted > 0) onMutate(table);
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
      notifyMutation: (table: keyof S) => void,
      validate: <T extends keyof S>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
    ) => Promise<R>;
    connectExternal?: (notify: (table: keyof S) => void) => (() => void) | void;
    /** Structured logger. A @vielzeug/logit Logger satisfies DepositLogger directly. */
    logger?: DepositLogger;
    onMetrics?: (event: MetricsEvent) => void;
    onMutation?: (table: keyof S) => void;
    /** Per-table record parsers. A @vielzeug/validit Schema satisfies RecordParser directly. */
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

  /* -- Validation helper: no-op when no parser registered for the table -- */
  const validate = <K extends keyof S>(table: K, value: RecordOf<S, K>): RecordOf<S, K> => {
    const parser = validators?.[table];

    if (!parser) return value;

    return parser.parseSync(value) as RecordOf<S, K>;
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
    /* tables is typed but not structurally enforced at runtime — TypeScript types provide the guarantee */
    _tables: readonly K[],
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
    notify: (table: keyof S) => void,
    validateFn: <T extends keyof S>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
  ): Promise<R> => {
    const dirty = new Set<K>();
    const txOps = buildTxContext<S, K>(
      schema,
      core,
      (t) => dirty.add(t),
      validateFn as <T extends K>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
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
    async batch(tables, fn) {
      return timed('*', 'batch', () => batchFn(tables, fn, notifyMutation, validate));
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

    async deleteAll(table) {
      return timed(String(table), 'deleteAll', () => txCtx.deleteAll(table));
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
