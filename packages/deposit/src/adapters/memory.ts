import type { Adapter, AnySchema, KeyOf, RecordOf } from '../types';

import { createObserverHub, ensureRecordKey, resolveRecordKey } from '../internal';
import { createQueryBuilder } from '../query';
import { type StoredRecord, unwrapStored, wrapStored } from '../ttl';

/* -------------------- MemoryAdapter -------------------- */

class MemoryAdapter<S extends AnySchema> implements Adapter<S> {
  private readonly observers = createObserverHub<S>((table) => this.getAll(table));
  private readonly tables = new Map<string, Map<string, StoredRecord<unknown>>>();
  private readonly schema: S;

  constructor(schema: S) {
    this.schema = schema;
  }

  private table<K extends keyof S>(table: K): Map<string, StoredRecord<unknown>> {
    const name = String(table);
    let store = this.tables.get(name);

    if (!store) {
      store = new Map();
      this.tables.set(name, store);
    }

    return store;
  }

  observe<K extends keyof S>(
    table: K,
    listener: (records: RecordOf<S, K>[]) => void,
    options?: { immediate?: boolean },
  ): () => void {
    return this.observers.observe(table, listener, options);
  }

  dispose(): void {
    this.observers.dispose();
  }

  async get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
    const store = this.table(table);
    const raw = store.get(String(key));

    if (!raw) return undefined;

    const value = unwrapStored(raw as StoredRecord<RecordOf<S, K>>);

    if (value === undefined) store.delete(String(key));

    return value;
  }

  async getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]> {
    const store = this.table(table);
    const records: RecordOf<S, K>[] = [];
    const expiredKeys: string[] = [];

    for (const [key, raw] of store) {
      const value = unwrapStored(raw as StoredRecord<RecordOf<S, K>>);

      if (value !== undefined) {
        records.push(value);
      } else {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) store.delete(key);

    return records;
  }

  async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<void> {
    const key = String(resolveRecordKey(this.schema, table, value));

    this.table(table).set(key, wrapStored(value, ttl));
    this.observers.notify(table);
  }

  async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: number): Promise<void> {
    const store = this.table(table);

    for (const value of values) {
      const key = String(resolveRecordKey(this.schema, table, value));

      store.set(key, wrapStored(value, ttl));
    }

    this.observers.notify(table);
  }

  async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<void> {
    this.table(table).delete(String(key));
    this.observers.notify(table);
  }

  async deleteAll<K extends keyof S>(table: K): Promise<void> {
    this.table(table).clear();
    this.observers.notify(table);
  }

  async deleteWhere<K extends keyof S>(table: K, predicate: (record: RecordOf<S, K>) => boolean): Promise<number> {
    const store = this.table(table);
    const all = await this.getAll(table);
    let deleted = 0;

    for (const row of all) {
      if (!predicate(row)) continue;

      store.delete(String(resolveRecordKey(this.schema, table, row)));
      deleted += 1;
    }

    if (deleted > 0) this.observers.notify(table);

    return deleted;
  }

  async forEach<K extends keyof S>(table: K, fn: (record: RecordOf<S, K>) => void | Promise<void>): Promise<void> {
    const all = await this.getAll(table);

    for (const record of all) {
      await fn(record);
    }
  }

  async has<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
    return (await this.get(table, key)) !== undefined;
  }

  async count<K extends keyof S>(table: K): Promise<number> {
    return (await this.getAll(table)).length;
  }

  async getOrPut<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    fallback: RecordOf<S, K> | (() => RecordOf<S, K>),
    ttl?: number,
  ): Promise<RecordOf<S, K>> {
    const existing = await this.get(table, key);

    if (existing) return existing;

    const value = typeof fallback === 'function' ? fallback() : fallback;

    ensureRecordKey(this.schema, table, key, value, 'getOrPut');

    await this.put(table, value, ttl);

    return value;
  }

  query<K extends keyof S>(table: K) {
    return createQueryBuilder<RecordOf<S, K>>(() => this.getAll(table) as Promise<unknown[]>);
  }

  async update<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    changes: Partial<RecordOf<S, K>>,
    ttl?: number,
  ): Promise<RecordOf<S, K> | undefined> {
    const current = await this.get(table, key);

    if (!current) return undefined;

    const merged = { ...current, ...changes } as RecordOf<S, K>;

    ensureRecordKey(this.schema, table, key, merged, 'update');

    await this.put(table, merged, ttl);

    return merged;
  }
}

/* -------------------- Factory -------------------- */

export function createMemory<S extends AnySchema>(schema: S): Adapter<S> {
  return new MemoryAdapter(schema);
}
