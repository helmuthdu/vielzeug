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

/** A codec validates and decodes persisted values crossing a trust boundary. */
export type RecordCodec<T> = {
  decode(value: unknown): T;
  encode(value: T): unknown;
};

export type RecordParser<T> = {
  parse(value: unknown): T;
};

export type CodecInput<T> = RecordCodec<T> | RecordParser<T>;

export type TableCodecs<S extends AnySchema> = {
  [K in keyof S]: CodecInput<RecordOf<S, K>>;
};

/** A validator-only codec: encodes values as-is, validates on decode. */
export function validatorCodec<T>(validator: RecordParser<T>): RecordCodec<T> {
  return {
    decode: (value) => validator.parse(value),
    encode: (value) => value,
  };
}

export type Observer<T> = (records: T[]) => void;
export type Unsubscribe = () => void;

/** Shared factory options for stores that do not require durable codecs. */
export type MemoryStoreOptions<S extends AnySchema> = {
  schema: S;
  /** Optional per-table codecs. Memory values never cross a trust boundary, so codecs may be omitted. */
  codecs?: TableCodecs<S>;
};

/** Shared factory options for durable stores whose values cross a trust boundary. */
export type DurableStoreOptions<S extends AnySchema> = {
  schema: S;
  /** Required per-table codecs. Persisted values are decoded through these before entering typed code. */
  codecs: TableCodecs<S>;
};

export type VaultConveniences<S extends AnySchema, K extends keyof S & string = keyof S & string> = {
  count<T extends K>(table: T): Promise<number>;
  deleteMany<T extends K>(table: T, keys: readonly KeyOf<S, T>[]): Promise<number>;
  getMany<T extends K>(table: T, keys: readonly KeyOf<S, T>[]): Promise<Array<RecordOf<S, T> | undefined>>;
  has<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  isEmpty<T extends K>(table: T): Promise<boolean>;
  keys<T extends K>(table: T, filter?: (record: RecordOf<S, T>) => boolean): Promise<KeyOf<S, T>[]>;
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
    update: (existing: RecordOf<S, T> | undefined) => RecordOf<S, T>,
    ttl?: number,
  ): Promise<RecordOf<S, T>>;
};

/** Methods available within an IndexedDB or SQLite transaction. */
export type TransactionContext<S extends AnySchema, K extends keyof S & string = keyof S & string> = VaultConveniences<
  S,
  K
> & {
  clear<T extends K>(table: T): Promise<void>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  iterate<T extends K>(table: T): AsyncIterable<RecordOf<S, T>>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: number): Promise<RecordOf<S, T>>;
  putAll<T extends K>(table: T, values: readonly RecordOf<S, T>[], ttl?: number): Promise<void>;
};

/** Key-value store for Memory and Web Storage: core CRUD, observation, TTL, and pruning. */
export interface KeyValueVaultStore<S extends AnySchema> extends VaultConveniences<S> {
  clear<K extends keyof S & string>(table: K): Promise<void>;
  delete<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<boolean>;
  readonly disposalSignal: AbortSignal;
  dispose(): Promise<void>;
  readonly disposed: boolean;
  get<K extends keyof S & string>(table: K, key: KeyOf<S, K>): Promise<RecordOf<S, K> | undefined>;
  getAll<K extends keyof S & string>(table: K): Promise<RecordOf<S, K>[]>;
  observe<K extends keyof S & string>(
    table: K,
    listener: Observer<RecordOf<S, K>>,
    options?: { immediate?: boolean; signal?: AbortSignal },
  ): Unsubscribe;
  pruneExpired(): Promise<Record<keyof S & string, number>>;
  put<K extends keyof S & string>(table: K, value: RecordOf<S, K>, ttl?: number): Promise<RecordOf<S, K>>;
  putAll<K extends keyof S & string>(table: K, values: readonly RecordOf<S, K>[], ttl?: number): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

/** Document store for IndexedDB and SQLite: adds atomic transactions and lazy iteration. */
export interface DocumentVaultStore<S extends AnySchema> extends KeyValueVaultStore<S> {
  batch<K extends keyof S & string, R>(
    tables: readonly K[],
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
  ): Promise<R>;
  iterate<K extends keyof S & string>(table: K): AsyncIterable<RecordOf<S, K>>;
}

type VaultKeyField<T extends object> = {
  [K in keyof T & string]: T[K] extends VaultKey ? K : never;
}[keyof T & string];

/** Define a typed table whose primary-key field holds a portable Vault key. */
export function table<T extends object, Key extends VaultKeyField<T> = VaultKeyField<T>>(
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

  return { defaultTtl, indexes, key };
}
