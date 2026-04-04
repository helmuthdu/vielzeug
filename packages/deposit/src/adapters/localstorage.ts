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

  private get storage(): Storage {
    try {
      return localStorage;
    } catch {
      throw new Error(
        'deposit: localStorage is not available in this environment (private browsing or sandboxed iframe?)',
      );
    }
  }

  private writeItem(storageKey: string, value: unknown, table: string): void {
    try {
      this.storage.setItem(storageKey, JSON.stringify(value));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        throw new Error(`deposit: localStorage quota exceeded while writing to "${table}"`, { cause: err });
      }

      throw err;
    }
  }

  from<K extends keyof S>(table: K): QueryBuilder<RecordType<S, K>> {
    return new QueryBuilder<RecordType<S, K>>(() => this.getAll(table) as Promise<unknown[]>);
  }

  async get<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<RecordType<S, K> | undefined> {
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
    const prefix = this.tablePrefix(table);
    const records: RecordType<S, K>[] = [];

    for (const k of Object.keys(this.storage)) {
      if (!k.startsWith(prefix)) continue;

      const value = this.readEntry<RecordType<S, K>>(k);

      if (value !== undefined) records.push(value);
    }

    return records;
  }

  async getMany<K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<RecordType<S, K>[]> {
    const results: RecordType<S, K>[] = [];

    for (const k of keys) {
      const value = this.readEntry<RecordType<S, K>>(this.storageKey(table, String(k)));

      if (value !== undefined) results.push(value);
    }

    return results;
  }

  async put<K extends keyof S>(table: K, value: RecordType<S, K>, ttl?: number): Promise<void> {
    const key = this.recordKey(value, table);

    this.writeItem(this.storageKey(table, String(key)), wrap(value, ttl), String(table));
  }

  async putMany<K extends keyof S>(table: K, values: RecordType<S, K>[], ttl?: number): Promise<void> {
    for (const v of values) {
      const key = this.recordKey(v, table);

      this.writeItem(this.storageKey(table, String(key)), wrap(v, ttl), String(table));
    }
  }

  async delete<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<void> {
    this.storage.removeItem(this.storageKey(table, String(key)));
  }

  async deleteMany<K extends keyof S>(table: K, keys: KeyType<S, K>[]): Promise<void> {
    for (const k of keys) {
      this.storage.removeItem(this.storageKey(table, String(k)));
    }
  }

  async patch<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    partial: Partial<RecordType<S, K>>,
    ttl?: number,
  ): Promise<RecordType<S, K>> {
    const storageKey = this.storageKey(table, String(key));
    const raw = this.storage.getItem(storageKey);

    if (!raw) throw new Error(`deposit: patch target "${String(key)}" not found in "${String(table)}"`);

    let env: Envelope<RecordType<S, K>>;

    try {
      env = JSON.parse(raw) as Envelope<RecordType<S, K>>;
    } catch {
      this.storage.removeItem(storageKey);
      throw new Error(`deposit: patch target "${String(key)}" not found in "${String(table)}"`);
    }

    if (!isEnvelope(env)) {
      this.storage.removeItem(storageKey);
      throw new Error(`deposit: patch target "${String(key)}" not found in "${String(table)}"`);
    }

    const current = unwrap(env);

    if (current === undefined) {
      this.storage.removeItem(storageKey);
      throw new Error(`deposit: patch target "${String(key)}" not found in "${String(table)}"`);
    }

    const merged = { ...current, ...partial } as RecordType<S, K>;
    const newEnv: Envelope<RecordType<S, K>> =
      ttl !== undefined ? { __d: 1, exp: Date.now() + ttl, v: merged } : { ...env, v: merged };

    this.writeItem(storageKey, newEnv, String(table));

    return merged;
  }

  async getOrPut<K extends keyof S>(
    table: K,
    key: KeyType<S, K>,
    factory: () => RecordType<S, K> | Promise<RecordType<S, K>>,
    ttl?: number,
  ): Promise<RecordType<S, K>> {
    const existing = await this.get(table, key);

    if (existing !== undefined) return existing;

    const value = await factory();

    await this.put(table, value, ttl);

    return value;
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

  async has<K extends keyof S>(table: K, key: KeyType<S, K>): Promise<boolean> {
    return this.readEntry(this.storageKey(table, String(key))) !== undefined;
  }

  private readEntry<T>(storageKey: string, keyHint?: string): T | undefined {
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
      this.logger.warn(`Removing corrupted entry for key: ${keyHint ?? storageKey}`, err);
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
  return new LocalStorageAdapter(options.dbName, options.schema, options.logger);
}
