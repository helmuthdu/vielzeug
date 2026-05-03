import type { Adapter, AnySchema, KeyOf, RecordOf } from '../types';

import { QueryBuilder } from '../query';

/* -------------------- AdapterCore -------------------- */

export abstract class AdapterCore<S extends AnySchema> implements Adapter<S> {
  abstract delete<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<void>;
  abstract deleteAll<K extends keyof S>(table: K): Promise<void>;
  abstract get<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined>;
  abstract getAll<K extends keyof S>(table: K): Promise<RecordOf<S, K>[]>;
  abstract put<K extends keyof S>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<void>;

  query<K extends keyof S>(table: K): QueryBuilder<RecordOf<S, K>> {
    return new QueryBuilder<RecordOf<S, K>>(() => this.getAll(table) as Promise<unknown[]>);
  }

  async count<K extends keyof S>(table: K): Promise<number> {
    return (await this.getAll(table)).length;
  }

  async has<K extends keyof S>(table: K, key: KeyOf<S, K>): Promise<boolean> {
    return (await this.get(table, key)) !== undefined;
  }

  async putAll<K extends keyof S>(table: K, values: RecordOf<S, K>[], ttl?: number): Promise<void> {
    await Promise.all(values.map((value) => this.put(table, value, ttl)));
  }
}
