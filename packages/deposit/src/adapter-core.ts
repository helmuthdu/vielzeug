import type { Adapter, AnySchema, KeyOf, RecordOf, TransactionContext, TtlMs } from './types';

import { createObserverHub } from './internal';
import { createQueryBuilder } from './query';

type SharedCore<S extends AnySchema, K extends keyof S = keyof S> = {
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  deleteAll<T extends K>(table: T): Promise<number>;
  deleteWhere?<T extends K>(table: T, predicate: (record: RecordOf<S, T>) => boolean): Promise<number>;
  dispose?(): void;
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: TtlMs): Promise<void>;
  putAll<T extends K>(table: T, values: RecordOf<S, T>[], ttl?: TtlMs): Promise<void>;
};

function getRecordKey<S extends AnySchema, K extends keyof S>(schema: S, table: K, value: RecordOf<S, K>): KeyOf<S, K> {
  const keyField = String(schema[table].key);
  const keyValue = (value as Record<string, unknown>)[keyField];

  if (keyValue === undefined || keyValue === null) {
    throw new Error(`deposit: missing required key field "${keyField}" in record for table "${String(table)}"`);
  }

  return keyValue as KeyOf<S, K>;
}

function assertRecordKey<S extends AnySchema, K extends keyof S>(
  schema: S,
  table: K,
  expectedKey: KeyOf<S, K>,
  value: RecordOf<S, K>,
  action: string,
): void {
  const actualKey = getRecordKey(schema, table, value);

  if (actualKey !== expectedKey) {
    throw new Error(
      `deposit: ${action} key mismatch for table "${String(table)}". Expected "${String(expectedKey)}", got "${String(actualKey)}"`,
    );
  }
}

function createMutationMethods<S extends AnySchema, K extends keyof S>(
  schema: S,
  core: Pick<SharedCore<S, K>, 'get' | 'put'>,
  onMutation?: <T extends K>(table: T) => void,
) {
  return {
    async getOrPut<T extends K>(table: T, value: RecordOf<S, T>, ttl?: TtlMs): Promise<RecordOf<S, T>> {
      const key = getRecordKey(schema, table, value);
      const existing = await core.get(table, key);

      if (existing) return existing;

      await core.put(table, value, ttl);
      onMutation?.(table);

      return value;
    },
    async update<T extends K>(
      table: T,
      key: KeyOf<S, T>,
      changes: Partial<RecordOf<S, T>>,
      ttl?: TtlMs,
    ): Promise<RecordOf<S, T> | undefined> {
      const current = await core.get(table, key);

      if (!current) return undefined;

      const merged = { ...current, ...changes } as RecordOf<S, T>;

      assertRecordKey(schema, table, key, merged, 'update');
      await core.put(table, merged, ttl);
      onMutation?.(table);

      return merged;
    },
  };
}

function createSharedMethods<S extends AnySchema, K extends keyof S>(schema: S, core: SharedCore<S, K>) {
  async function* iterate<T extends K>(table: T): AsyncIterable<RecordOf<S, T>> {
    for (const record of await core.getAll(table)) {
      yield record;
    }
  }

  return {
    count<T extends K>(table: T): Promise<number> {
      return core.getAll(table).then((records) => records.length);
    },
    deleteWhere<T extends K>(table: T, predicate: (record: RecordOf<S, T>) => boolean): Promise<number> {
      if (core.deleteWhere) return core.deleteWhere(table, predicate);

      return core.getAll(table).then(async (records) => {
        let deleted = 0;

        for (const record of records) {
          if (!predicate(record)) continue;

          const key = getRecordKey(schema, table, record);

          if (await core.delete(table, key)) deleted += 1;
        }

        return deleted;
      });
    },
    async forEach<T extends K>(table: T, fn: (record: RecordOf<S, T>) => void | Promise<void>): Promise<void> {
      for await (const record of iterate(table)) {
        await fn(record);
      }
    },
    has<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean> {
      return core.get(table, key).then((value) => value !== undefined);
    },
    iterate,
    query<T extends K>(table: T) {
      return createQueryBuilder<RecordOf<S, T>>(() => core.getAll(table));
    },
  };
}

export function createAdapterRuntime<S extends AnySchema>(
  schema: S,
  core: SharedCore<S>,
  options?: { broadcast?: <K extends keyof S>(table: K) => void },
) {
  const observers = createObserverHub<S>((table) => core.getAll(table));
  const shared = createSharedMethods(schema, core);
  const notifyMutation = <K extends keyof S>(table: K): void => {
    observers.notify(table);
    options?.broadcast?.(table);
  };
  const mutation = createMutationMethods(schema, core, notifyMutation);

  const adapter: Adapter<S> = {
    count: shared.count,
    async delete(table, key) {
      const deleted = await core.delete(table, key);

      if (deleted) notifyMutation(table);

      return deleted;
    },
    async deleteAll(table) {
      const deleted = await core.deleteAll(table);

      if (deleted > 0) notifyMutation(table);

      return deleted;
    },
    async deleteWhere(table, predicate) {
      const deleted = await shared.deleteWhere(table, predicate);

      if (deleted > 0) notifyMutation(table);

      return deleted;
    },
    dispose() {
      observers.dispose();
      core.dispose?.();
    },
    forEach: shared.forEach,
    get: core.get,
    getAll: core.getAll,
    getOrPut: mutation.getOrPut,
    has: shared.has,
    iterate: shared.iterate,
    observe(table, listener, options) {
      return observers.observe(table, listener, options);
    },
    async put(table, value, ttl) {
      await core.put(table, value, ttl);
      notifyMutation(table);
    },
    async putAll(table, values, ttl) {
      await core.putAll(table, values, ttl);

      if (values.length > 0) notifyMutation(table);
    },
    query: shared.query,
    update: mutation.update,
  };

  return {
    adapter,
    notify: observers.notify,
    notifyMutation,
  };
}

export function createTransactionContext<S extends AnySchema, K extends keyof S>(
  schema: S,
  core: Omit<SharedCore<S, K>, 'dispose'>,
): TransactionContext<S, K> {
  const shared = createSharedMethods(schema, core);
  const mutation = createMutationMethods(schema, core);

  return {
    count: shared.count,
    delete: core.delete,
    deleteAll: core.deleteAll,
    deleteWhere: shared.deleteWhere,
    forEach: shared.forEach,
    get: core.get,
    getAll: core.getAll,
    getOrPut: mutation.getOrPut,
    has: shared.has,
    iterate: shared.iterate,
    put: core.put,
    putAll: core.putAll,
    query: shared.query,
    update: mutation.update,
  };
}
