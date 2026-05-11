import type { Adapter, AnySchema, KeyOf, RecordOf } from '../types';

import { QueryBuilder } from '../query';

/* -------------------- AdapterCore -------------------- */

export abstract class AdapterCore<S extends AnySchema> implements Adapter<S> {
  private readonly observers = new Map<string, Set<(records: unknown[]) => void>>();
  protected abstract readonly schema: S;

  protected resolveRecordKey<K extends keyof S>(table: K, value: RecordOf<S, K>): KeyOf<S, K> {
    const keyField = String(this.schema[table].key);
    const keyValue = (value as Record<string, unknown>)[keyField];

    if (keyValue === undefined || keyValue === null) {
      throw new Error(`Missing required key field "${keyField}" in record for table "${String(table)}"`);
    }

    return keyValue as KeyOf<S, K>;
  }

  abstract delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<void>;
  abstract deleteAll<K extends keyof S>(table: K): Promise<void>;
  abstract get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined>;
  abstract getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]>;
  abstract put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<void>;

  protected notify<K extends keyof S>(table: K): void {
    const key = String(table);
    const listeners = this.observers.get(key);

    if (!listeners || listeners.size === 0) return;

    void this.getAll(table)
      .then((records) => {
        for (const listener of listeners) listener(records as unknown[]);
      })
      .catch(() => {
        /* ignore observer errors from source reads */
      });
  }

  observe<K extends keyof S>(table: K, listener: (records: RecordOf<S, K>[]) => void): () => void {
    const key = String(table);
    const wrapped = listener as (records: unknown[]) => void;
    let listeners = this.observers.get(key);

    if (!listeners) {
      listeners = new Set();
      this.observers.set(key, listeners);
    }

    listeners.add(wrapped);
    this.notify(table);

    return () => {
      const current = this.observers.get(key);

      if (!current) return;

      current.delete(wrapped);

      if (current.size === 0) this.observers.delete(key);
    };
  }

  query<K extends keyof S>(table: K): QueryBuilder<RecordOf<S, K>> {
    return new QueryBuilder<RecordOf<S, K>>(() => this.getAll(table) as Promise<unknown[]>);
  }

  async count<K extends keyof S>(table: K): Promise<number> {
    return (await this.getAll(table)).length;
  }

  async forEach<K extends keyof S>(
    table: K,
    fn: (record: RecordOf<S, K>, index: number) => void | Promise<void>,
  ): Promise<void> {
    const all = await this.getAll(table);

    for (let i = 0; i < all.length; i += 1) {
      await fn(all[i], i);
    }
  }

  async has<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
    return (await this.get(table, key)) !== undefined;
  }

  async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: number): Promise<void> {
    await Promise.all(values.map((value) => this.put(table, value, ttl)));
  }

  async deleteWhere<K extends keyof S>(table: K, predicate: (record: RecordOf<S, K>) => boolean): Promise<number> {
    const all = await this.getAll(table);
    let deleted = 0;

    for (const row of all) {
      if (!predicate(row)) continue;

      await this.delete(table, this.resolveRecordKey(table, row));
      deleted += 1;
    }

    return deleted;
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

    await this.put(table, merged, ttl);

    return merged;
  }

  async getOrPut<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    fallback: RecordOf<S, K> | (() => RecordOf<S, K>),
    ttl?: number,
  ): Promise<RecordOf<S, K>> {
    const existing = await this.get(table, key);

    if (existing) return existing;

    const value = typeof fallback === 'function' ? (fallback as () => RecordOf<S, K>)() : fallback;

    await this.put(table, value, ttl);

    return value;
  }
}
