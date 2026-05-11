import type { Adapter, AnySchema, KeyOf, RecordOf } from '../types';

import { type StoredRecord, unwrapStored, wrapStored } from '../ttl';
import { AdapterCore } from './adapter-core';

/* -------------------- CookieAdapter -------------------- */

export interface CookieOptions {
  /** Defaults to `'/'` */
  path?: string;
  /** Defaults to `'Strict'` */
  sameSite?: 'Lax' | 'None' | 'Strict';
  /** Defaults to `false` */
  secure?: boolean;
}

class CookieAdapter<S extends AnySchema> extends AdapterCore<S> {
  private readonly dbName: string;
  private readonly cookiePath: string;
  private readonly sameSite: string;
  private readonly secure: boolean;
  protected readonly schema: S;

  constructor(dbName: string, schema: S, options: CookieOptions = {}) {
    super();
    this.dbName = dbName;
    this.schema = schema;
    this.cookiePath = options.path ?? '/';
    this.sameSite = options.sameSite ?? 'Strict';
    this.secure = options.secure ?? false;
  }

  /* -------------------- Cookie key helpers -------------------- */

  private cookieKey<K extends keyof S>(table: K, key: string): string {
    return `${encodeURIComponent(this.dbName)}~${encodeURIComponent(String(table))}~${encodeURIComponent(key)}`;
  }

  private tablePrefix<K extends keyof S>(table: K): string {
    return `${encodeURIComponent(this.dbName)}~${encodeURIComponent(String(table))}~`;
  }

  /* -------------------- Raw cookie access -------------------- */

  private readCookies(): Record<string, string> {
    if (typeof document === 'undefined') return {};

    return Object.fromEntries(
      document.cookie
        .split(';')
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => {
          const eq = c.indexOf('=');

          return eq === -1 ? [c, ''] : [c.slice(0, eq), c.slice(eq + 1)];
        }),
    );
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

    document.cookie = parts.join('; ');
  }

  private deleteCookie(name: string): void {
    if (typeof document === 'undefined') return;

    // Setting Max-Age=0 removes the cookie immediately.
    document.cookie = `${name}=; path=${this.cookiePath}; Max-Age=0; SameSite=${this.sameSite}`;
  }

  private readEntry<T>(name: string, cookies: Record<string, string>): T | undefined {
    const raw = cookies[name];

    if (!raw) return undefined;

    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;

      if (typeof parsed !== 'object' || parsed === null || !('v' in (parsed as object))) {
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

  /* -------------------- Adapter methods -------------------- */

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
    const key = String(this.resolveRecordKey(table, value));
    const name = this.cookieKey(table, key);
    const envelope = wrapStored(value, ttlMs);

    this.writeCookie(name, encodeURIComponent(JSON.stringify(envelope)), ttlMs);
    this.notify(table);
  }

  async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<void> {
    this.deleteCookie(this.cookieKey(table, String(key)));
    this.notify(table);
  }

  async deleteAll<K extends keyof S>(table: K): Promise<void> {
    const prefix = this.tablePrefix(table);

    for (const name of Object.keys(this.readCookies())) {
      if (name.startsWith(prefix)) this.deleteCookie(name);
    }

    this.notify(table);
  }
}

/* -------------------- Factory -------------------- */

export function createCookie<S extends AnySchema>(options: {
  dbName: string;
  path?: string;
  sameSite?: 'Lax' | 'None' | 'Strict';
  schema: S;
  secure?: boolean;
}): Adapter<S> {
  const { dbName, schema, ...cookieOptions } = options;

  return new CookieAdapter(dbName, schema, cookieOptions);
}
