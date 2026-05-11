import type { Adapter, AnySchema, KeyOf, RecordOf } from '../types';

import { type StoredRecord, unwrapStored, wrapStored } from '../ttl';
import { AdapterCore } from './adapter-core';

/* -------------------- WebStorageAdapter -------------------- */

/**
 * Shared implementation for localStorage and sessionStorage adapters.
 * Accepts a `getStorage` provider so the same class serves both backends.
 */
export class WebStorageAdapter<S extends AnySchema> extends AdapterCore<S> {
  private readonly dbName: string;
  private readonly getStorage: () => Storage;
  private readonly prefixCache: Map<string, string>;
  protected readonly schema: S;
  private readonly storageLabel: string;

  constructor(dbName: string, schema: S, getStorage: () => Storage, storageLabel: string) {
    super();
    this.dbName = dbName;
    this.schema = schema;
    this.prefixCache = new Map();
    this.getStorage = getStorage;
    this.storageLabel = storageLabel;

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const dbPrefix = `${encodeURIComponent(this.dbName)}~`;

      window.addEventListener('storage', (event: StorageEvent) => {
        if (!event.key || !event.key.startsWith(dbPrefix)) return;

        const tail = event.key.slice(dbPrefix.length);
        const end = tail.indexOf('~');

        if (end === -1) return;

        const tableName = decodeURIComponent(tail.slice(0, end)) as keyof S;

        this.notify(tableName);
      });
    }
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

  private storageKeys(): string[] {
    const storage = this.storage;
    const keys: string[] = [];

    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);

      if (key !== null) keys.push(key);
    }

    return keys;
  }

  private tableKeys<K extends keyof S>(table: K): string[] {
    const prefix = this.tablePrefix(table);

    return this.storageKeys().filter((k) => k.startsWith(prefix));
  }

  async getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]> {
    const records: RecordOf<S, K>[] = [];

    for (const k of this.tableKeys(table)) {
      const value = this.readEntry<RecordOf<S, K>>(k);

      if (value !== undefined) records.push(value);
    }

    return records;
  }

  async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<void> {
    const key = this.resolveRecordKey(table, value);

    this.writeItem(this.storageKey(table, String(key)), wrapStored(value, ttl));
    this.notify(table);
  }

  async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<void> {
    this.storage.removeItem(this.storageKey(table, String(key)));
    this.notify(table);
  }

  async deleteAll<K extends keyof S>(table: K): Promise<void> {
    for (const k of this.tableKeys(table)) {
      this.storage.removeItem(k);
    }

    this.notify(table);
  }

  private readEntry<T extends Record<string, unknown>>(storageKey: string): T | undefined {
    const raw = this.storage.getItem(storageKey);

    if (!raw) return undefined;

    try {
      const parsed = JSON.parse(raw) as unknown;

      if (typeof parsed !== 'object' || parsed === null || !('v' in (parsed as object))) {
        this.storage.removeItem(storageKey);

        return undefined;
      }

      const value = unwrapStored(parsed as StoredRecord<T>);

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
      prefix = `${encodeURIComponent(this.dbName)}~${encodeURIComponent(name)}~`;
      this.prefixCache.set(name, prefix);
    }

    return prefix;
  }

  private storageKey<K extends keyof S>(table: K, key: string): string {
    return this.tablePrefix(table) + encodeURIComponent(key);
  }
}

export function createLocalStorage<S extends AnySchema>(options: { dbName: string; schema: S }): Adapter<S> {
  return new WebStorageAdapter(options.dbName, options.schema, () => localStorage, 'localStorage');
}

export function createSessionStorage<S extends AnySchema>(options: { dbName: string; schema: S }): Adapter<S> {
  return new WebStorageAdapter(options.dbName, options.schema, () => sessionStorage, 'sessionStorage');
}
