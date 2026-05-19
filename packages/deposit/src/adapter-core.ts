import type { Adapter, AnySchema, DebugInfo, KeyOf, MetricsEvent, RecordOf, TransactionContext, TtlMs } from './types';

import { createObserverHub, getRecordKey } from './internal';
import { createQueryBuilder, createReadQuery } from './query';

/* -------------------- Internal core ops type (adapter → runtime bridge) -------------------- */

export type CoreStorageOps<S extends AnySchema, K extends keyof S = keyof S> = {
  count<T extends K>(table: T): Promise<number>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  deleteAll<T extends K>(table: T): Promise<void>;
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

/* -------------------- buildTxContext: turns CoreStorageOps into a TransactionContext -------------------- */

export function buildTxContext<S extends AnySchema, K extends keyof S>(
  schema: S,
  core: CoreStorageOps<S, K>,
  onMutate: (table: K) => void,
): TransactionContext<S, K> {
  return {
    async clear(table) {
      await core.deleteAll(table);
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
    async deleteAll(table) {
      await core.deleteAll(table);
      onMutate(table);
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
    async put(table, value, ttl) {
      await core.put(table, value, resolveTtl(schema, table, ttl));
      onMutate(table);
    },
    async putAll(table, values, ttl) {
      await core.putAll(table, values, resolveTtl(schema, table, ttl));

      if (values.length > 0) onMutate(table);
    },
    query(table) {
      return createReadQuery({ source: () => core.getAll(table) });
    },
    async update(table, key, changes, ttl) {
      const current = await core.get(table, key);

      if (!current) return undefined;

      const merged = { ...current, ...changes } as RecordOf<S, typeof table>;

      verifyKey(schema, table, key, merged, 'update');
      await core.put(table, merged, resolveTtl(schema, table, ttl));
      onMutate(table);

      return merged;
    },
    async upsert(table, key, fn, ttl) {
      const existing = await core.get(table, key);
      const value = fn(existing);

      verifyKey(schema, table, key, value, 'upsert');
      await core.put(table, value, resolveTtl(schema, table, ttl));
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
    ) => Promise<R>;
    connectExternal?: (notify: (table: keyof S) => void) => (() => void) | void;
    onMetrics?: (event: MetricsEvent) => void;
    onMutation?: (table: keyof S) => void;
  },
): { adapter: Adapter<S>; notifyMutation: (table: keyof S) => void } {
  const observers = createObserverHub<S>((table) => core.getAll(table));
  const { onMetrics } = options ?? {};

  const notifyMutation = (table: keyof S): void => {
    observers.notify(table);
    options?.onMutation?.(table);
  };

  const disconnectExternal = options?.connectExternal?.(observers.notify) ?? undefined;

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
    notify: (table: keyof S) => void,
  ): Promise<R> => {
    void tables;

    const dirty = new Set<K>();
    const txOps = buildTxContext<S, K>(schema, core, (t) => dirty.add(t));
    const result = await fn(txOps);

    for (const t of dirty) {
      notify(t);
    }

    return result;
  };

  const batchFn = options?.batch ?? softBatch;

  const adapter: Adapter<S> = {
    async batch(tables, fn) {
      return timed('*', 'batch', () => batchFn(tables, fn, notifyMutation));
    },

    async clear(table) {
      return timed(String(table), 'clear', async () => {
        await core.deleteAll(table);
        notifyMutation(table);
      });
    },

    async count(table) {
      return timed(String(table), 'count', () => core.count(table));
    },

    async debug() {
      const tableNames = Object.keys(schema) as Array<keyof S & string>;
      const entries = await Promise.all(
        tableNames.map(async (name) => {
          // Raw count BEFORE getAll evicts expired records
          const raw = core.getRawCount ? await core.getRawCount(name) : undefined;
          const live = await core.getAll(name);
          const expiredCount = raw !== undefined ? raw - live.length : 0;

          return { expiredCount, name, recordCount: live.length };
        }),
      );

      return { tables: entries } as DebugInfo<S>;
    },

    async delete(table, key) {
      return timed(String(table), 'delete', async () => {
        const deleted = await core.delete(table, key);

        if (deleted) notifyMutation(table);

        return deleted;
      });
    },

    async deleteAll(table) {
      return timed(String(table), 'deleteAll', async () => {
        await core.deleteAll(table);
        notifyMutation(table);
      });
    },

    dispose() {
      disconnectExternal?.();
      observers.dispose();
      core.dispose?.();
    },

    async get(table, key) {
      return timed(String(table), 'get', () => core.get(table, key));
    },

    async getAll(table) {
      return timed(String(table), 'getAll', () => core.getAll(table));
    },

    async has(table, key) {
      return timed(String(table), 'has', () => core.has(table, key));
    },

    observe(table, listener, opts) {
      return observers.observe(table, listener, opts);
    },

    async put(table, value, ttl) {
      return timed(String(table), 'put', async () => {
        await core.put(table, value, resolveTtl(schema, table, ttl));
        notifyMutation(table);
      });
    },

    async putAll(table, values, ttl) {
      return timed(String(table), 'putAll', async () => {
        await core.putAll(table, values, resolveTtl(schema, table, ttl));

        if (values.length > 0) notifyMutation(table);
      });
    },

    query(table) {
      return createQueryBuilder({
        async deleteMany(records) {
          if (records.length === 0) return 0;

          let deleted = 0;

          for (const record of records) {
            const key = getRecordKey(schema, table, record);

            if (await core.delete(table, key)) {
              deleted += 1;
            }
          }

          if (deleted > 0) notifyMutation(table);

          return deleted;
        },
        source: () => core.getAll(table),
      });
    },

    async update(table, key, changes, ttl) {
      return timed(String(table), 'update', async () => {
        const current = await core.get(table, key);

        if (!current) return undefined;

        const merged = { ...current, ...changes } as RecordOf<S, typeof table>;

        verifyKey(schema, table, key, merged, 'update');
        await core.put(table, merged, resolveTtl(schema, table, ttl));
        notifyMutation(table);

        return merged;
      });
    },

    async upsert(table, key, fn, ttl) {
      return timed(String(table), 'upsert', async () => {
        const existing = await core.get(table, key);
        const value = fn(existing);

        verifyKey(schema, table, key, value, 'upsert');
        await core.put(table, value, resolveTtl(schema, table, ttl));
        notifyMutation(table);

        return value;
      });
    },
  };

  return { adapter, notifyMutation };
}
