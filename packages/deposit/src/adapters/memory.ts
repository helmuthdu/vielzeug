import type { Adapter, AnySchema, KeyOf, RecordOf } from '../types';

import { type StoredRecord, unwrapStored, wrapStored } from '../ttl';
import { AdapterCore } from './adapter-core';

/* -------------------- MemoryAdapter -------------------- */

class MemoryAdapter<S extends AnySchema> extends AdapterCore<S> {
  private readonly tables = new Map<string, Map<string, StoredRecord<unknown>>>();
  protected readonly schema: S;

  constructor(schema: S) {
    super();
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

    for (const [key, raw] of store) {
      const value = unwrapStored(raw as StoredRecord<RecordOf<S, K>>);

      if (value !== undefined) {
        records.push(value);
      } else {
        store.delete(key);
      }
    }

    return records;
  }

  async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<void> {
    const key = String(this.resolveRecordKey(table, value));

    this.table(table).set(key, wrapStored(value, ttl));
    this.notify(table);
  }

  async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<void> {
    this.table(table).delete(String(key));
    this.notify(table);
  }

  async deleteAll<K extends keyof S>(table: K): Promise<void> {
    this.table(table).clear();
    this.notify(table);
  }
}

/* -------------------- Factory -------------------- */

export function createMemory<S extends AnySchema>(options: { schema: S }): Adapter<S> {
  return new MemoryAdapter(options.schema);
}
