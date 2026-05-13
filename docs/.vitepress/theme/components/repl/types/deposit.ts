export const depositTypes = `
declare module '@vielzeug/deposit' {
  declare const ttlMsBrand: unique symbol;

  export type TtlMs = number & { readonly [ttlMsBrand]: 'TtlMs' };

  export type SchemaEntry<T extends Record<string, unknown>> = {
    key: keyof T & string;
  };

  export type AnySchema = Record<string, { key: string }>;

  export type RecordOf<S extends AnySchema, K extends keyof S> =
    S[K] extends SchemaEntry<infer R> ? R : never;

  export type KeyOf<S extends AnySchema, K extends keyof S> =
    S[K] extends SchemaEntry<infer R>
      ? (S[K]['key'] extends keyof R ? R[S[K]['key']] : never)
      : never;

  export type MigrationContext = {
    db: IDBDatabase;
    newVersion: number | null;
    oldVersion: number;
    tx: IDBTransaction;
  };

  export type MigrationFn = (ctx: MigrationContext) => void;
  export type Observer<T> = (records: T[]) => void;

  type ComparableFieldKeys<T extends Record<string, unknown>> = {
    [K in keyof T]-?: Extract<NonNullable<T[K]>, number | string> extends never ? never : K;
  }[keyof T];

  export interface QueryBuilder<T extends Record<string, unknown>> {
    between<K extends ComparableFieldKeys<T>>(
      field: K,
      lower: Extract<NonNullable<T[K]>, number | string>,
      upper: Extract<NonNullable<T[K]>, number | string>,
    ): QueryBuilder<T>;
    count(): Promise<number>;
    equals<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T>;
    filter(fn: (value: T, index: number, array: T[]) => boolean): QueryBuilder<T>;
    first(): Promise<T | undefined>;
    limit(n: number): QueryBuilder<T>;
    offset(n: number): QueryBuilder<T>;
    orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): QueryBuilder<T>;
    startsWith<K extends keyof T>(field: K, prefix: string, options?: { ignoreCase?: boolean }): QueryBuilder<T>;
    toArray(): Promise<T[]>;
  }

  type ScopedTableOps<S extends AnySchema, K extends keyof S> = {
    count<T extends K>(table: T): Promise<number>;
    delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
    deleteAll<T extends K>(table: T): Promise<void>;
    deleteWhere<T extends K>(table: T, predicate: (record: RecordOf<S, T>) => boolean): Promise<number>;
    forEach<T extends K>(table: T, fn: (record: RecordOf<S, T>) => void | Promise<void>): Promise<void>;
    get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
    getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
    getOrPut<T extends K>(table: T, value: RecordOf<S, T>, ttl?: TtlMs): Promise<RecordOf<S, T>>;
    has<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
    iterate<T extends K>(table: T): AsyncIterable<RecordOf<S, T>>;
    put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: TtlMs): Promise<void>;
    putAll<T extends K>(table: T, values: RecordOf<S, T>[], ttl?: TtlMs): Promise<void>;
    query<T extends K>(table: T): QueryBuilder<RecordOf<S, T>>;
    update<T extends K>(
      table: T,
      key: KeyOf<S, T>,
      changes: Partial<RecordOf<S, T>>,
      ttl?: TtlMs,
    ): Promise<RecordOf<S, T> | undefined>;
  };

  export interface Adapter<S extends AnySchema> extends ScopedTableOps<S, keyof S> {
    dispose(): void;
    observe<K extends keyof S>(
      table: K,
      listener: Observer<RecordOf<S, K>>,
      options?: { immediate?: boolean },
    ): () => void;
  }

  export type TransactionContext<S extends AnySchema, K extends keyof S> = ScopedTableOps<S, K>;

  export interface IndexedDBHandle<S extends AnySchema> extends Adapter<S> {
    transaction<K extends keyof S, R>(
      tables: readonly K[],
      fn: (tx: TransactionContext<S, K>) => Promise<R>,
    ): Promise<R>;
  }

  export interface CookieOptions {
    path?: string;
    sameSite?: 'Lax' | 'None' | 'Strict';
    secure?: boolean;
  }

  export function table<T extends Record<string, unknown>>(key: keyof T & string): SchemaEntry<T>;

  export function createLocalStorage<S extends AnySchema>(dbName: string, schema: S): Adapter<S>;
  export function createSessionStorage<S extends AnySchema>(dbName: string, schema: S): Adapter<S>;
  export function createCookie<S extends AnySchema>(dbName: string, schema: S, options?: CookieOptions): Adapter<S>;
  export function createMemory<S extends AnySchema>(schema: S): Adapter<S>;
  export function createIndexedDB<S extends AnySchema>(options: {
    dbName: string;
    migrate?: MigrationFn;
    schema: S;
    schemaVersion: number;
  }): IndexedDBHandle<S>;

  export const ttl: {
    ms(n: number): TtlMs;
    seconds(n: number): TtlMs;
    minutes(n: number): TtlMs;
    hours(n: number): TtlMs;
    days(n: number): TtlMs;
  };
}
`;
