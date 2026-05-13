import type { Adapter, AnySchema, KeyOf, RecordOf } from '../types';

import {
  createObserverHub,
  decodeStorageTableFromKey,
  encodeStorageKey,
  encodeStorageTablePrefix,
  resolveRecordKey,
} from '../internal';
import { createQueryBuilder } from '../query';
import { type StoredRecord, unwrapStored, wrapStored } from '../ttl';

/* -------------------- WebStorageAdapter -------------------- */

class WebStorageAdapter<S extends AnySchema> implements Adapter<S> {
  private readonly dbName: string;
  private readonly getStorage: () => Storage;
  private readonly observers = createObserverHub<S>((table) => this.getAll(table));
  private readonly prefixCache = new Map<string, string>();
  private readonly storageLabel: string;
  private readonly storageListener?: (event: StorageEvent) => void;
  private readonly schema: S;

  constructor(dbName: string, schema: S, getStorage: () => Storage, storageLabel: string) {
    this.dbName = dbName;
    this.getStorage = getStorage;
    this.schema = schema;
    this.storageLabel = storageLabel;

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      this.storageListener = (event: StorageEvent) => {
        const expectedStorage = this.tryGetStorage();

        if (event.storageArea && expectedStorage && event.storageArea !== expectedStorage) {
          return;
        }

        if (event.key === null) {
          this.notifyAllTables();

          return;
        }

        const tableName = decodeStorageTableFromKey(this.dbName, event.key);

        if (tableName) this.observers.notify(tableName as keyof S);
      };

      window.addEventListener('storage', this.storageListener);
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

  private tryGetStorage(): Storage | undefined {
    try {
      return this.getStorage();
    } catch {
      return undefined;
    }
  }

  private notifyAllTables(): void {
    for (const name of Object.keys(this.schema)) {
      this.observers.notify(name as keyof S);
    }
  }

  observe<K extends keyof S>(
    table: K,
    listener: (records: RecordOf<S, K>[]) => void,
    options?: { immediate?: boolean },
  ): () => void {
    return this.observers.observe(table, listener, options);
  }

  dispose(): void {
    if (typeof window !== 'undefined' && this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }

    this.observers.dispose();
  }

  async get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
    return this.readEntry<RecordOf<S, K>>(this.storageKey(table, String(key)));
  }

  private storageKeys(): string[] {
    const storage = this.storage;
    const keys: string[] = [];

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);

      if (key !== null) keys.push(key);
    }

    return keys;
  }

  private tableKeys<K extends keyof S>(table: K): string[] {
    const prefix = this.tablePrefix(table);

    return this.storageKeys().filter((key) => key.startsWith(prefix));
  }

  async getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]> {
    const records: RecordOf<S, K>[] = [];
    const expiredKeys: string[] = [];

    for (const storageKey of this.tableKeys(table)) {
      const value = this.readEntry<RecordOf<S, K>>(storageKey, false);

      if (value !== undefined) {
        records.push(value);
      } else {
        expiredKeys.push(storageKey);
      }
    }

    for (const storageKey of expiredKeys) this.storage.removeItem(storageKey);

    return records;
  }

  async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<void> {
    const key = this.resolveKey(table, value);

    this.writeItem(this.storageKey(table, String(key)), wrapStored(value, ttl));
    this.observers.notify(table);
  }

  async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: number): Promise<void> {
    for (const value of values) {
      const key = this.resolveKey(table, value);

      this.writeItem(this.storageKey(table, String(key)), wrapStored(value, ttl));
    }

    this.observers.notify(table);
  }

  async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<void> {
    this.storage.removeItem(this.storageKey(table, String(key)));
    this.observers.notify(table);
  }

  async deleteAll<K extends keyof S>(table: K): Promise<void> {
    const keys = this.tableKeys(table);

    for (const storageKey of keys) {
      this.storage.removeItem(storageKey);
    }

    this.observers.notify(table);
  }

  async deleteWhere<K extends keyof S>(table: K, predicate: (record: RecordOf<S, K>) => boolean): Promise<number> {
    const storage = this.storage;
    const all = await this.getAll(table);
    let deleted = 0;

    for (const row of all) {
      if (!predicate(row)) continue;

      storage.removeItem(this.storageKey(table, String(this.resolveKey(table, row))));
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

    this.assertKey(table, key, value, 'getOrPut');

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

    this.assertKey(table, key, merged, 'update');

    await this.put(table, merged, ttl);

    return merged;
  }

  private assertKey<K extends keyof S>(
    table: K,
    expectedKey: KeyOf<S, K>,
    value: RecordOf<S, K>,
    action: string,
  ): void {
    const actualKey = this.resolveKey(table, value);

    if (actualKey !== expectedKey) {
      throw new Error(
        `deposit: ${action} key mismatch for table "${String(table)}". Expected "${String(expectedKey)}", got "${String(actualKey)}"`,
      );
    }
  }

  private readEntry<T extends Record<string, unknown>>(storageKey: string, removeWhenExpired = true): T | undefined {
    const raw = this.storage.getItem(storageKey);

    if (!raw) return undefined;

    try {
      const parsed = JSON.parse(raw) as unknown;

      if (typeof parsed !== 'object' || parsed === null || !('value' in (parsed as object))) {
        if (removeWhenExpired) this.storage.removeItem(storageKey);

        return undefined;
      }

      const value = unwrapStored(parsed as StoredRecord<T>);

      if (value === undefined) {
        if (removeWhenExpired) this.storage.removeItem(storageKey);

        return undefined;
      }

      return value;
    } catch {
      if (removeWhenExpired) this.storage.removeItem(storageKey);

      return undefined;
    }
  }

  private resolveKey<K extends keyof S>(table: K, value: RecordOf<S, K>): KeyOf<S, K> {
    return resolveRecordKey(this.schema, table, value);
  }

  private tablePrefix<K extends keyof S>(table: K): string {
    const name = String(table);
    let prefix = this.prefixCache.get(name);

    if (!prefix) {
      prefix = encodeStorageTablePrefix(this.dbName, name);
      this.prefixCache.set(name, prefix);
    }

    return prefix;
  }

  private storageKey<K extends keyof S>(table: K, key: string): string {
    return encodeStorageKey(this.dbName, String(table), key);
  }
}

export function createLocalStorage<S extends AnySchema>(dbName: string, schema: S): Adapter<S> {
  return new WebStorageAdapter(
    dbName,
    schema,
    () => (typeof window !== 'undefined' ? window.localStorage : localStorage),
    'localStorage',
  );
}

export function createSessionStorage<S extends AnySchema>(dbName: string, schema: S): Adapter<S> {
  return new WebStorageAdapter(
    dbName,
    schema,
    () => (typeof window !== 'undefined' ? window.sessionStorage : sessionStorage),
    'sessionStorage',
  );
}
