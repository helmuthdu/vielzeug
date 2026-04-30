import type { AnySchema, KeyOf, RecordOf } from '../types';

import { type StoredRecord, unwrapStored, wrapStored } from '../ttl';
import { AdapterCore } from './adapter-core';
import { resolveRecordKey } from './schema-key';

/* -------------------- WebStorageAdapter -------------------- */

/**
 * Shared implementation for localStorage and sessionStorage adapters.
 * Accepts a `getStorage` provider so the same class serves both backends.
 */
export class WebStorageAdapter<S extends AnySchema> extends AdapterCore<S> {
  private readonly dbName: string;
  private readonly getStorage: () => Storage;
  private readonly prefixCache: Map<string, string>;
  private readonly schema: S;
  private readonly storageLabel: string;

  constructor(dbName: string, schema: S, getStorage: () => Storage, storageLabel: string) {
    super();
    this.dbName = dbName;
    this.schema = schema;
    this.prefixCache = new Map();
    this.getStorage = getStorage;
    this.storageLabel = storageLabel;
  }

  private get storage(): Storage {
    try {
      return this.getStorage();
    } catch {
      throw new Error(
        `deposit: ${this.storageLabel} is not available in this environment (private browsing or sandboxed iframe?)`,
      );
    }
  }

  private writeItem(storageKey: string, value: unknown): void {
    try {
      this.storage.setItem(storageKey, JSON.stringify(value));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        throw new Error(`deposit: ${this.storageLabel} quota exceeded while writing record`, { cause: err });
      }

      throw err;
    }
  }

  async get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
    return this.readEntry<RecordOf<S, K>>(this.storageKey(table, String(key)));
  }

  private forEachStorageKey(fn: (key: string) => void): void {
    const storage = this.storage;

    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);

      if (key !== null) fn(key);
    }
  }

  async getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]> {
    const prefix = this.tablePrefix(table);
    const records: RecordOf<S, K>[] = [];

    this.forEachStorageKey((k) => {
      if (!k.startsWith(prefix)) return;

      const value = this.readEntry<RecordOf<S, K>>(k);

      if (value !== undefined) records.push(value);
    });

    return records;
  }

  async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<void> {
    const key = resolveRecordKey(this.schema, table, value);

    this.writeItem(this.storageKey(table, String(key)), wrapStored(value, ttl));
  }

  async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<void> {
    this.storage.removeItem(this.storageKey(table, String(key)));
  }

  async deleteAll<K extends keyof S>(table: K): Promise<void> {
    const prefix = this.tablePrefix(table);

    this.forEachStorageKey((k) => {
      if (k.startsWith(prefix)) this.storage.removeItem(k);
    });
  }

  private readEntry<T>(storageKey: string): T | undefined {
    const raw = this.storage.getItem(storageKey);

    if (!raw) return undefined;

    try {
      const parsed = JSON.parse(raw) as unknown;

      if (typeof parsed !== 'object' || parsed === null) {
        this.storage.removeItem(storageKey);

        return undefined;
      }

      const value = unwrapStored(parsed as StoredRecord<T & Record<string, unknown>>);

      if (value === undefined) {
        this.storage.removeItem(storageKey);

        return undefined;
      }

      return value;
    } catch {
      this.storage.removeItem(storageKey);

      return undefined;
    }
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
