/// <reference lib="dom" />

import { VaultError } from './errors';
import type { QueryBuilder } from './query';
import { assertPositiveFinite } from './ttl';

/** Portable primary-key values. Vault preserves their type and encodes them distinctly at rest. */
export type VaultKey = number | string;

/** A typed table definition whose primary-key field must hold a portable Vault key. */
export type SchemaEntry<T extends object, Key extends keyof T & string = keyof T & string> = {
  defaultTtl?: number;
  /** IndexedDB creates these as `value.<field>` indexes; other stores filter in memory. */
  indexes?: readonly (keyof T & string)[];
  key: Key;
};

export type AnySchema = Record<string, { defaultTtl?: number; indexes?: readonly string[]; key: string }>;

export type RecordOf<S extends AnySchema, K extends keyof S> =
  S[K] extends SchemaEntry<infer R, infer _Key> ? R : never;
export type KeyOf<S extends AnySchema, K extends keyof S> = Extract<
  S[K] extends SchemaEntry<infer R, infer Key> ? R[Key] : never,
  VaultKey
>;

export type VaultLogger = {
  error(message: string, context?: Error | Record<string, unknown>): void;
};

export type RecordValidator<T> = {
  parse(value: unknown): T;
};

export type TableValidators<S extends AnySchema> = {
  [K in keyof S]?: RecordValidator<RecordOf<S, K>>;
};

export type Observer<T> = (records: T[]) => void;
export type Unsubscribe = () => void;

/** Shared factory options. Values always use Vault's fixed `{ value, expiresAt? }` envelope. */
export type BaseAdapterOptions<S extends AnySchema> = {
  logger?: VaultLogger;
  onMetrics?: (event: MetricsEvent) => void;
  schema: S;
  validators?: TableValidators<S>;
};

export type MetricsEvent = {
  duration: number;
  operation:
    | 'batch'
    | 'clear'
    | 'count'
    | 'delete'
    | 'deleteMany'
    | 'entries'
    | 'get'
    | 'getAll'
    | 'getMany'
    | 'getOrDefault'
    | 'has'
    | 'isEmpty'
    | 'keys'
    | 'put'
    | 'putAll'
    | 'query'
    | 'queryDelete'
    | 'update'
    | 'upsert';
  table: string;
};

export type DebugStats = { expiredCount: number; recordCount: number };
export type DebugInfo<S extends AnySchema> = { tables: Array<{ name: keyof S & string } & DebugStats> };

/** Methods available within an IndexedDB or SQLite transaction. */
export type TransactionContext<S extends AnySchema, K extends keyof S & string = keyof S & string> = {
  clear<T extends K>(table: T): Promise<void>;
  count<T extends K>(table: T): Promise<number>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  deleteMany<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<number>;
  entries<T extends K>(table: T): Promise<Array<[KeyOf<S, T>, RecordOf<S, T>]>>;
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  getMany<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<Array<RecordOf<S, T> | undefined>>;
  getOrDefault<T extends K>(
    table: T,
    key: KeyOf<S, T>,
    defaultFn: () => RecordOf<S, T>,
    ttl?: number,
  ): Promise<RecordOf<S, T>>;
  has<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  isEmpty<T extends K>(table: T): Promise<boolean>;
  keys<T extends K>(table: T, filter?: (record: RecordOf<S, T>) => boolean): Promise<KeyOf<S, T>[]>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: number): Promise<void>;
  putAll<T extends K>(table: T, values: RecordOf<S, T>[], ttl?: number): Promise<void>;
  query<T extends K>(table: T): QueryBuilder<RecordOf<S, T>>;
  update<T extends K>(
    table: T,
    key: KeyOf<S, T>,
    changes: Partial<RecordOf<S, T>>,
    ttl?: number,
  ): Promise<RecordOf<S, T> | undefined>;
  upsert<T extends K>(
    table: T,
    key: KeyOf<S, T>,
    fn: (existing: RecordOf<S, T> | undefined) => RecordOf<S, T>,
    ttl?: number,
  ): Promise<RecordOf<S, T>>;
};

/** Portable API returned by memory and Web Storage factories. */
export interface VaultStore<S extends AnySchema> {
  clear<K extends keyof S & string>(table: K): Promise<void>;
  count<K extends keyof S & string>(table: K): Promise<number>;
  debug(): Promise<DebugInfo<S>>;
  delete<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<boolean>;
  deleteMany<K extends keyof S & string>(table: K, keys: KeyOf<S, K>[]): Promise<number>;
  readonly disposalSignal: AbortSignal;
  dispose(): Promise<void>;
  readonly disposed: boolean;
  entries<K extends keyof S & string>(table: K): Promise<Array<[KeyOf<S, K>, RecordOf<S, K>]>>;
  get<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined>;
  getAll<K extends keyof S & string>(table: K): Promise<RecordOf<S, K>[]>;
  getMany<K extends keyof S & string>(table: K, keys: KeyOf<S, K>[]): Promise<Array<RecordOf<S, K> | undefined>>;
  getOrDefault<K extends keyof S & string>(
    table: K,
    key: KeyOf<S, K>,
    defaultFn: () => RecordOf<S, K>,
    ttl?: number,
  ): Promise<RecordOf<S, K>>;
  has<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<boolean>;
  isEmpty<K extends keyof S & string>(table: K): Promise<boolean>;
  keys<K extends keyof S & string>(table: K, filter?: (record: RecordOf<S, K>) => boolean): Promise<KeyOf<S, K>[]>;
  observe<K extends keyof S & string>(
    table: K,
    listener: Observer<RecordOf<S, K>>,
    options?: { immediate?: boolean; signal?: AbortSignal },
  ): Unsubscribe;
  pruneExpired(): Promise<Record<keyof S & string, number>>;
  put<K extends keyof S & string>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<void>;
  putAll<K extends keyof S & string>(table: K, values: RecordOf<S, K>[], ttl?: number): Promise<void>;
  query<K extends keyof S & string>(table: K): QueryBuilder<RecordOf<S, K>>;
  update<K extends keyof S & string>(
    table: K,
    key: KeyOf<S, K>,
    changes: Partial<RecordOf<S, K>>,
    ttl?: number,
  ): Promise<RecordOf<S, K> | undefined>;
  upsert<K extends keyof S & string>(
    table: K,
    key: KeyOf<S, K>,
    fn: (existing: RecordOf<S, K> | undefined) => RecordOf<S, K>,
    ttl?: number,
  ): Promise<RecordOf<S, K>>;
  [Symbol.asyncDispose](): Promise<void>;
}

/** Atomic, scoped transactions supplied by storage engines that support them. */
export interface TransactionalVaultStore<S extends AnySchema> extends VaultStore<S> {
  batch<K extends keyof S & string, R>(
    tables: readonly K[],
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
  ): Promise<R>;
}

/** Lazy record iteration supplied by storage engines that support it. */
export interface IterableVaultStore<S extends AnySchema> extends VaultStore<S> {
  iterate<K extends keyof S & string>(table: K): AsyncIterable<RecordOf<S, K>>;
}

/** IndexedDB-only guarantees: cursor iteration and atomic, scoped transactions. */
export interface IndexedDbVaultStore<S extends AnySchema> extends TransactionalVaultStore<S>, IterableVaultStore<S> {}

/** Define a typed table whose primary-key field holds a portable Vault key. */
export function table<T extends object, Key extends keyof T & string = keyof T & string>(
  key: Key,
  options: { defaultTtl?: number; indexes?: readonly (keyof T & string)[] } = {},
): SchemaEntry<T, Key> {
  const { defaultTtl, indexes } = options;

  if (defaultTtl !== undefined) assertPositiveFinite(defaultTtl, 'table: defaultTtl');

  if (indexes) {
    const seen = new Set<string>();

    for (const field of indexes) {
      if (seen.has(field)) {
        throw new VaultError(`table: index "${field}" is already registered`);
      }

      seen.add(field);
    }
  }

  return { defaultTtl, indexes, key } as unknown as SchemaEntry<T, Key>;
}
