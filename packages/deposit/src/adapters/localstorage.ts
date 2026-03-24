import type { Adapter, KeyType, LocalStorageOptions, Logger, RecordType, Schema } from '../types';

import { QueryBuilder } from '../query';
import { type Envelope, isEnvelope, unwrap, wrap } from '../ttl';

/* -------------------- LocalStorageAdapter -------------------- */

class LocalStorageAdapter<S extends Schema<any>> implements Adapter<S> {
  private readonly schema: S;
  private readonly logger: Logger;
  private readonly prefixCache: Map<string, string>;
  private readonly dbName: string;

  constructor(dbName: string, schema: S, logger?: Logger) {
    this.dbName = dbName;
    this.schema = schema;
    this.logger = logger ?? console;
    this.prefixCache = new Map();

    for (const [table, def] of Object.entries(schema)) {
      if ((def as { indexes?: unknown[] }).indexes?.length) {
        this.logger.warn(`deposit: indexes declared for table "${table}" are ignored by the localStorage adapter`);
      }
    }
  }

  private checkStorage(): void {
    try {
      // accessing localStorage throws a SecurityError in Safari private mode and some sandboxed iframes
      void localStorage;
    } catch {
      throw new Error(
        'deposit: localStorage is not available in this environment (private browsing or sandboxed iframe?)',
      );
    }
  }

  from<K extends keyof S>(table: K): QueryBuilder<RecordType<S, K>> {
    return new QueryBuilder<RecordType<S, K>>(this, String(table));
  }

  async get<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<RecordType<S, K> | undefined> {
    this.checkStorage();

    return this.readEntry<RecordType<S, K>>(this.storageKey(table, String(key)), String(key));
  }

  async getOr<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    defaultValue: RecordType<S, K>,
  ): Promise<RecordType<S, K>> {
    return (await this.get(table, key)) ?? defaultValue;
  }

  async getAll<K extends keyof S>(table: K): Promise<RecordType<S, K>[]> {
    this.checkStorage();

    const prefix = this.tablePrefix(table);
    const records: RecordType<S, K>[] = [];

    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(prefix)) continue;

      const value = this.readEntry<RecordType<S, K>>(k);

      if (value !== undefined) records.push(value);
    }

    return records;
  }

  async getMany<K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<RecordType<S, K>[]> {
    this.checkStorage();

    const results: RecordType<S, K>[] = [];

    for (const k of keys) {
      const value = this.readEntry<RecordType<S, K>>(this.storageKey(table, String(k)));

      if (value !== undefined) results.push(value);
    }

    return results;
  }

  async put<K extends keyof S>(table: K, value: RecordType<S, K>, ttl?: number): Promise<void> {
    this.checkStorage();

    const key = this.recordKey(value, table);

    try {
      localStorage.setItem(this.storageKey(table, String(key)), JSON.stringify(wrap(value, ttl)));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        throw new Error(`deposit: localStorage quota exceeded while writing to "${String(table)}"`, { cause: err });
      }

      throw err;
    }
  }

  async putMany<K extends keyof S>(table: K, values: RecordType<S, K>[], ttl?: number): Promise<void> {
    this.checkStorage();

    for (const v of values) {
      const key = this.recordKey(v, table);

      try {
        localStorage.setItem(this.storageKey(table, String(key)), JSON.stringify(wrap(v, ttl)));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'QuotaExceededError') {
          throw new Error(`deposit: localStorage quota exceeded while writing to "${String(table)}"`, { cause: err });
        }

        throw err;
      }
    }
  }

  async delete<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<void> {
    this.checkStorage();

    localStorage.removeItem(this.storageKey(table, String(key)));
  }

  async deleteMany<K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<void> {
    this.checkStorage();

    for (const k of keys) {
      localStorage.removeItem(this.storageKey(table, String(k)));
    }
  }

  async patch<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    partial: Partial<RecordType<S, K>>,
    ttl?: number,
  ): Promise<RecordType<S, K> | undefined> {
    this.checkStorage();

    const storageKey = this.storageKey(table, String(key));
    const raw = localStorage.getItem(storageKey);

    if (!raw) return undefined;

    try {
      const env = JSON.parse(raw) as Envelope<RecordType<S, K>>;

      if (!isEnvelope(env)) {
        localStorage.removeItem(storageKey);

        return undefined;
      }

      const current = unwrap(env);

      if (current === undefined) {
        localStorage.removeItem(storageKey);

        return undefined;
      }

      const merged = { ...current, ...partial } as RecordType<S, K>;
      const newEnv: Envelope<RecordType<S, K>> =
        ttl !== undefined ? { exp: Date.now() + ttl, v: merged } : { ...env, v: merged };

      localStorage.setItem(storageKey, JSON.stringify(newEnv));

      return merged;
    } catch {
      localStorage.removeItem(storageKey);

      return undefined;
    }
  }

  async getOrPut<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    factory: () => RecordType<S, K> | Promise<RecordType<S, K>>,
    ttl?: number,
  ): Promise<RecordType<S, K>> {
    this.checkStorage();

    const existing = await this.get(table, key);

    if (existing !== undefined) return existing;

    const value = await factory();

    await this.put(table, value, ttl);

    return value;
  }

  async deleteAll<K extends keyof S>(table: K): Promise<void> {
    this.checkStorage();

    const prefix = this.tablePrefix(table);

    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(prefix)) localStorage.removeItem(k);
    }
  }

  async count<K extends keyof S>(table: K): Promise<number> {
    return (await this.getAll(table)).length;
  }

  async has<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<boolean> {
    this.checkStorage();

    return this.readEntry(this.storageKey(table, String(key))) !== undefined;
  }

  private readEntry<T>(storageKey: string, keyHint?: string): T | undefined {
    const raw = localStorage.getItem(storageKey);

    if (!raw) return undefined;

    try {
      const env = JSON.parse(raw) as Envelope<T>;

      if (!isEnvelope(env)) {
        localStorage.removeItem(storageKey);

        return undefined;
      }

      const value = unwrap(env);

      if (value === undefined) {
        localStorage.removeItem(storageKey);

        return undefined;
      }

      return value;
    } catch (err) {
      this.logger.warn(`Removing corrupted entry for key: ${keyHint ?? storageKey}`, err);
      localStorage.removeItem(storageKey);

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
  return new LocalStorageAdapter(options.dbName, options.schema, options.logger);
}
