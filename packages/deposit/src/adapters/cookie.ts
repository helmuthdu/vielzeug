import type { Adapter, AnySchema, KeyOf, RecordOf, TtlMs } from '../types';

import { createAdapterRuntime } from '../adapter-core';
import { encodeStorageKey, encodeStorageTablePrefix } from '../internal';
import { parseStored, unwrapStored, wrapStored } from '../ttl';

export interface CookieOptions {
  /** Defaults to '/' */
  path?: string;
  /** Defaults to 'Strict' */
  sameSite?: 'Lax' | 'None' | 'Strict';
  /** Defaults to false */
  secure?: boolean;
}

const MAX_COOKIE_BYTES = 3800;

export function createCookie<S extends AnySchema>(dbName: string, schema: S, options: CookieOptions = {}): Adapter<S> {
  const cookiePath = options.path ?? '/';
  const sameSite = options.sameSite ?? 'Strict';
  const secure = options.secure ?? false;
  const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : undefined;

  if (sameSite === 'None' && !secure) {
    throw new Error('deposit: cookies with SameSite=None must also be Secure');
  }

  const readCookies = (): Record<string, string> => {
    if (typeof document === 'undefined') return {};

    return Object.fromEntries(
      document.cookie
        .split(';')
        .map((cookie) => cookie.trim())
        .filter(Boolean)
        .map((cookie) => {
          const separator = cookie.indexOf('=');

          return separator === -1 ? [cookie, ''] : [cookie.slice(0, separator), cookie.slice(separator + 1)];
        }),
    );
  };

  const recordKey = <K extends keyof S>(table: K, value: RecordOf<S, K>): KeyOf<S, K> => {
    const keyField = String(schema[table].key);
    const keyValue = (value as Record<string, unknown>)[keyField];

    if (keyValue === undefined || keyValue === null) {
      throw new Error(`deposit: missing required key field "${keyField}" in record for table "${String(table)}"`);
    }

    return keyValue as KeyOf<S, K>;
  };

  const deleteCookie = (name: string): void => {
    if (typeof document === 'undefined') return;

    document.cookie = `${name}=; path=${cookiePath}; Max-Age=0; SameSite=${sameSite}${secure ? '; Secure' : ''}`;
  };

  const writeCookie = (name: string, value: string, ttl?: TtlMs): void => {
    if (typeof document === 'undefined') {
      throw new Error('deposit: cookie adapter requires a browser environment');
    }

    const parts = [`${name}=${value}`, `path=${cookiePath}`, `SameSite=${sameSite}`];

    if (ttl !== undefined) {
      parts.push(`Max-Age=${Math.ceil(ttl / 1000)}`);
    }

    if (secure) parts.push('Secure');

    const cookie = parts.join('; ');
    const cookieBytes = textEncoder ? textEncoder.encode(cookie).length : unescape(encodeURIComponent(cookie)).length;

    if (cookieBytes > MAX_COOKIE_BYTES) {
      throw new Error(`deposit: cookie record exceeds safe size limit (${MAX_COOKIE_BYTES} bytes)`);
    }

    document.cookie = cookie;
  };

  const readEntry = <T>(name: string, cookies: Record<string, string>): T | undefined => {
    const raw = cookies[name];

    if (!raw) return undefined;

    try {
      const parsed = parseStored<T>(JSON.parse(decodeURIComponent(raw)) as unknown);

      if (!parsed) {
        deleteCookie(name);

        return undefined;
      }

      const value = unwrapStored(parsed);

      if (value === undefined) {
        deleteCookie(name);
      }

      return value;
    } catch {
      deleteCookie(name);

      return undefined;
    }
  };

  return createAdapterRuntime(schema, {
    async delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
      const cookies = readCookies();
      const cookieKey = encodeStorageKey(dbName, String(table), String(key));

      if (!(cookieKey in cookies)) return false;

      deleteCookie(cookieKey);

      return true;
    },
    async deleteAll<K extends keyof S>(table: K): Promise<number> {
      const prefix = encodeStorageTablePrefix(dbName, String(table));
      let deleted = 0;

      for (const name of Object.keys(readCookies())) {
        if (!name.startsWith(prefix)) continue;

        deleteCookie(name);
        deleted += 1;
      }

      return deleted;
    },
    async get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined> {
      return readEntry<RecordOf<S, K>>(encodeStorageKey(dbName, String(table), String(key)), readCookies());
    },
    async getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]> {
      const prefix = encodeStorageTablePrefix(dbName, String(table));
      const cookies = readCookies();
      const records: RecordOf<S, K>[] = [];

      for (const name of Object.keys(cookies)) {
        if (!name.startsWith(prefix)) continue;

        const value = readEntry<RecordOf<S, K>>(name, cookies);

        if (value !== undefined) records.push(value);
      }

      return records;
    },
    async put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: TtlMs): Promise<void> {
      const key = recordKey(table, value);

      writeCookie(
        encodeStorageKey(dbName, String(table), String(key)),
        encodeURIComponent(JSON.stringify(wrapStored(value, ttl))),
        ttl,
      );
    },
    async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: TtlMs): Promise<void> {
      for (const value of values) {
        const key = recordKey(table, value);

        writeCookie(
          encodeStorageKey(dbName, String(table), String(key)),
          encodeURIComponent(JSON.stringify(wrapStored(value, ttl))),
          ttl,
        );
      }
    },
  }).adapter;
}
