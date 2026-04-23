import type { Adapter, KeyType, LocalStorageOptions, RecordType, Schema } from '../types';

import { QueryBuilder } from '../query';
import { type Envelope, isEnvelope, unwrap, wrap } from '../ttl';

/* -------------------- LocalStorageAdapter -------------------- */

class LocalStorageAdapter<S extends Schema<any>> implements Adapter<S> {
  private readonly schema: S;
  private readonly prefixCache: Map<string, string>;
  private readonly dbName: string;

  constructor(dbName: string, schema: S) {
    this.dbName = dbName;
    this.schema = schema;
    this.prefixCache = new Map();
  }

  private get storage(): Storage {
    try {
      return localStorage;
    } catch {
      throw new Error(
        'deposit: localStorage is not available in this environment (private browsing or sandboxed iframe?)',
      );
    }
  }

  private writeItem(storageKey: string, value: unknown): void {
    try {
      this.storage.setItem(storageKey, JSON.stringify(value));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        throw new Error('deposit: localStorage quota exceeded while writing record', { cause: err });
      }

      throw err;
    }
  }

  from<K extends keyof S>(table: K): QueryBuilder<RecordType<S, K>> {
    return new QueryBuilder<RecordType<S, K>>(() => this.getAll(table) as Promise<unknown[]>);
  }

  async get<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<RecordType<S, K> | undefined> {
    return this.readEntry<RecordType<S, K>>(this.storageKey(table, String(key)));
  }

  async getAll<K extends keyof S>(table: K): Promise<RecordType<S, K>[]> {
    const prefix = this.tablePrefix(table);
    const records: RecordType<S, K>[] = [];

    for (const k of Object.keys(this.storage)) {
      if (!k.startsWith(prefix)) continue;

      const value = this.readEntry<RecordType<S, K>>(k);

      if (value !== undefined) records.push(value);
    }

    return records;
  }

  async put<K extends keyof S>(table: K, value: RecordType<S, K>, ttl?: number): Promise<void> {
    const key = this.recordKey(value, table);

    this.writeItem(this.storageKey(table, String(key)), wrap(value, ttl));
  }

  async delete<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<void> {
    this.storage.removeItem(this.storageKey(table, String(key)));
  }

  async deleteAll<K extends keyof S>(table: K): Promise<void> {
    const prefix = this.tablePrefix(table);

    for (const k of Object.keys(this.storage)) {
      if (k.startsWith(prefix)) this.storage.removeItem(k);
    }
  }

  async count<K extends keyof S>(table: K): Promise<number> {
    return (await this.getAll(table)).length;
  }

  private readEntry<T>(storageKey: string): T | undefined {
    const raw = this.storage.getItem(storageKey);

    if (!raw) return undefined;

    try {
      const env = JSON.parse(raw) as Envelope<T>;

      if (!isEnvelope(env)) {
        this.storage.removeItem(storageKey);

        return undefined;
      }

      const value = unwrap(env);

      if (value === undefined) {
        this.storage.removeItem(storageKey);

        return undefined;
      }

      return value;
    } catch (err) {
      this.storage.removeItem(storageKey);

      return undefined;
    }
  }

  private recordKey<K extends keyof S>(value: Record<string, unknown>, table: K): string | number {
    const keyField = String((this.schema[table] as { key: string }).key);
    const keyValue = value[keyField];

    if (keyValue === undefined || keyValue === null) {
      throw new Error(`Missing required key field "${keyField}" in record for table "${String(table)}"`);
    }

    return keyValue as string | number;
  }

  private tablePrefix<K extends keyof S>(table: K): string {
    const name = String(table);
    let prefix = this.prefixCache.get(name);

    if (!prefix) {
      prefix = `${encodeURIComponent(this.dbName)}:${encodeURIComponent(name)}:`;
      this.prefixCache.set(name, prefix);
    }

    return prefix;
  }

  private storageKey<K extends keyof S>(table: K, key: string): string {
    return this.tablePrefix(table) + encodeURIComponent(key);
  }
}

/* -------------------- Factory -------------------- */

export function createLocalStorage<S extends Schema<any>>(options: LocalStorageOptions<S>): Adapter<S> {
  return new LocalStorageAdapter(options.dbName, options.schema);
}
