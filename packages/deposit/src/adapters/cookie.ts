import type { Adapter, AnySchema, KeyOf, RecordOf } from '../types';

import {
  createObserverHub,
  encodeStorageKey,
  encodeStorageTablePrefix,
  ensureRecordKey,
  resolveRecordKey,
} from '../internal';
import { createQueryBuilder } from '../query';
import { type StoredRecord, unwrapStored, wrapStored } from '../ttl';

/* -------------------- CookieAdapter -------------------- */

export interface CookieOptions {
  /** Defaults to '/' */
  path?: string;
  /** Defaults to 'Strict' */
  sameSite?: 'Lax' | 'None' | 'Strict';
  /** Defaults to false */
  secure?: boolean;
}

const MAX_COOKIE_BYTES = 3800;

class CookieAdapter<S extends AnySchema> implements Adapter<S> {
  private readonly cookiePath: string;
  private readonly dbName: string;
  private readonly observers = createObserverHub<S>((table) => this.getAll(table));
  private readonly sameSite: 'Lax' | 'None' | 'Strict';
  private readonly schema: S;
  private readonly secure: boolean;
  private readonly textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : undefined;

  constructor(dbName: string, schema: S, options: CookieOptions = {}) {
    this.dbName = dbName;
    this.schema = schema;
    this.cookiePath = options.path ?? '/';
    this.sameSite = options.sameSite ?? 'Strict';
    this.secure = options.secure ?? false;

    if (this.sameSite === 'None' && !this.secure) {
      throw new Error('deposit: cookies with SameSite=None must also be Secure');
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
    this.observers.dispose();
  }

  async get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
    const name = this.cookieKey(table, String(key));

    return this.readEntry<RecordOf<S, K>>(name, this.readCookies());
  }

  async getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]> {
    const prefix = this.tablePrefix(table);
    const cookies = this.readCookies();
    const records: RecordOf<S, K>[] = [];

    for (const name of Object.keys(cookies)) {
      if (!name.startsWith(prefix)) continue;

      const value = this.readEntry<RecordOf<S, K>>(name, cookies);

      if (value !== undefined) records.push(value);
    }

    return records;
  }

  async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttlMs?: number): Promise<void> {
    const key = this.resolveKey(table, value);
    const envelope = wrapStored(value, ttlMs);

    this.writeCookie(this.cookieKey(table, String(key)), encodeURIComponent(JSON.stringify(envelope)), ttlMs);
    this.observers.notify(table);
  }

  async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttlMs?: number): Promise<void> {
    for (const value of values) {
      const key = this.resolveKey(table, value);
      const envelope = wrapStored(value, ttlMs);

      this.writeCookie(this.cookieKey(table, String(key)), encodeURIComponent(JSON.stringify(envelope)), ttlMs);
    }

    this.observers.notify(table);
  }

  async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<void> {
    this.deleteCookie(this.cookieKey(table, String(key)));
    this.observers.notify(table);
  }

  async deleteAll<K extends keyof S>(table: K): Promise<void> {
    const prefix = this.tablePrefix(table);

    for (const name of Object.keys(this.readCookies())) {
      if (name.startsWith(prefix)) this.deleteCookie(name);
    }

    this.observers.notify(table);
  }

  async deleteWhere<K extends keyof S>(table: K, predicate: (record: RecordOf<S, K>) => boolean): Promise<number> {
    const all = await this.getAll(table);
    let deleted = 0;

    for (const row of all) {
      if (!predicate(row)) continue;

      this.deleteCookie(this.cookieKey(table, String(this.resolveKey(table, row))));
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
    ttlMs?: number,
  ): Promise<RecordOf<S, K>> {
    const existing = await this.get(table, key);

    if (existing) return existing;

    const value = typeof fallback === 'function' ? fallback() : fallback;

    ensureRecordKey(this.schema, table, key, value, 'getOrPut');

    await this.put(table, value, ttlMs);

    return value;
  }

  query<K extends keyof S>(table: K) {
    return createQueryBuilder<RecordOf<S, K>>(() => this.getAll(table) as Promise<unknown[]>);
  }

  async update<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    changes: Partial<RecordOf<S, K>>,
    ttlMs?: number,
  ): Promise<RecordOf<S, K> | undefined> {
    const current = await this.get(table, key);

    if (!current) return undefined;

    const merged = { ...current, ...changes } as RecordOf<S, K>;

    ensureRecordKey(this.schema, table, key, merged, 'update');

    await this.put(table, merged, ttlMs);

    return merged;
  }

  private cookieKey<K extends keyof S>(table: K, key: string): string {
    return encodeStorageKey(this.dbName, String(table), key);
  }

  private deleteCookie(name: string): void {
    if (typeof document === 'undefined') return;

    document.cookie = `${name}=; path=${this.cookiePath}; Max-Age=0; SameSite=${this.sameSite}${this.secure ? '; Secure' : ''}`;
  }

  private readCookies(): Record<string, string> {
    if (typeof document === 'undefined') return {};

    return Object.fromEntries(
      document.cookie
        .split(';')
        .map((cookie) => cookie.trim())
        .filter(Boolean)
        .map((cookie) => {
          const eq = cookie.indexOf('=');

          return eq === -1 ? [cookie, ''] : [cookie.slice(0, eq), cookie.slice(eq + 1)];
        }),
    );
  }

  private readEntry<T>(name: string, cookies: Record<string, string>): T | undefined {
    const raw = cookies[name];

    if (!raw) return undefined;

    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;

      if (typeof parsed !== 'object' || parsed === null || !('value' in (parsed as object))) {
        this.deleteCookie(name);

        return undefined;
      }

      const value = unwrapStored(parsed as StoredRecord<T>);

      if (value === undefined) {
        this.deleteCookie(name);

        return undefined;
      }

      return value;
    } catch {
      this.deleteCookie(name);

      return undefined;
    }
  }

  private resolveKey<K extends keyof S>(table: K, value: RecordOf<S, K>): KeyOf<S, K> {
    return resolveRecordKey(this.schema, table, value);
  }

  private tablePrefix<K extends keyof S>(table: K): string {
    return encodeStorageTablePrefix(this.dbName, String(table));
  }

  private writeCookie(name: string, value: string, maxAgeMs?: number): void {
    if (typeof document === 'undefined') {
      throw new Error('deposit: cookie adapter requires a browser environment');
    }

    const parts = [`${name}=${value}`, `path=${this.cookiePath}`, `SameSite=${this.sameSite}`];

    if (maxAgeMs !== undefined) {
      parts.push(`Max-Age=${Math.ceil(maxAgeMs / 1000)}`);
    }

    if (this.secure) parts.push('Secure');

    const cookie = parts.join('; ');
    const cookieBytes = this.textEncoder
      ? this.textEncoder.encode(cookie).length
      : unescape(encodeURIComponent(cookie)).length;

    if (cookieBytes > MAX_COOKIE_BYTES) {
      throw new Error(`deposit: cookie record exceeds safe size limit (${MAX_COOKIE_BYTES} bytes)`);
    }

    document.cookie = cookie;
  }
}

export function createCookie<S extends AnySchema>(dbName: string, schema: S, options: CookieOptions = {}): Adapter<S> {
  return new CookieAdapter(dbName, schema, options);
}
