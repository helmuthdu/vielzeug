export const depositTypes = `
declare module '@vielzeug/deposit' {
  export type TtlMs = number & { readonly __ttl: unique symbol };

  export type SchemaEntry<T extends Record<string, unknown>> = {
    defaultTtl?: TtlMs;
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
    between<K extends ComparableFieldKeys<T>>(field: K, lower: T[K], upper: T[K]): QueryBuilder<T>;
    count(): Promise<number>;
    delete(): Promise<number>;
    equals<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T>;
    filter(fn: (value: T, index: number, array: T[]) => boolean): QueryBuilder<T>;
    first(): Promise<T | undefined>;
    limit(n: number): QueryBuilder<T>;
    offset(n: number): QueryBuilder<T>;
    orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): QueryBuilder<T>;
    startsWith<K extends keyof T>(field: K, prefix: string, options?: { ignoreCase?: boolean }): QueryBuilder<T>;
    toArray(): Promise<T[]>;
  }

  export type TransactionContext<S extends AnySchema, K extends keyof S = keyof S> = {
    clear<T extends K>(table: T): Promise<void>;
    count<T extends K>(table: T): Promise<number>;
    delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
    deleteMany<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<number>;
    get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
    getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
    getMany<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<Array<RecordOf<S, T> | undefined>>;
    getOrDefault<T extends K>(
      table: T,
      key: KeyOf<S, T>,
      defaultFn: () => RecordOf<S, T>,
      ttl?: TtlMs,
    ): Promise<RecordOf<S, T>>;
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
    upsert<T extends K>(
      table: T,
      key: KeyOf<S, T>,
      fn: (existing: RecordOf<S, T> | undefined) => RecordOf<S, T>,
      ttl?: TtlMs,
    ): Promise<RecordOf<S, T>>;
  };

  export type DebugStats = { expiredCount: number; recordCount: number };
  export type DebugInfo<S extends AnySchema> = {
    tables: Array<{ name: keyof S & string } & DebugStats>;
  };

  export interface Adapter<S extends AnySchema> extends Omit<TransactionContext<S>, 'getOrDefault'> {
    batch<K extends keyof S, R>(
      tables: readonly K[],
      fn: (tx: TransactionContext<S, K>) => Promise<R>,
    ): Promise<R>;
    debug(): Promise<DebugInfo<S>>;
    dispose(): void;
    observe<K extends keyof S>(
      table: K,
      listener: Observer<RecordOf<S, K>>,
      options?: { immediate?: boolean },
    ): () => void;
    observeMany<K extends keyof S>(
      tables: readonly K[],
      listener: (snapshots: { [T in K]: RecordOf<S, T>[] }) => void,
      options?: { immediate?: boolean },
    ): () => void;
    pruneExpired(): Promise<{ [K in keyof S & string]: number }>;
    watch<K extends keyof S>(table: K): AsyncIterable<RecordOf<S, K>[]>;
  }

  export class DepositError extends Error {}
  export class DepositDisposedError extends DepositError {}
  export class DepositScopeError extends DepositError {}
  export class DepositQuotaError extends DepositError {}
  export class DepositMigrationError extends DepositError {}

  export function table<T extends Record<string, unknown>>(key: keyof T & string): SchemaEntry<T>;

  export function createLocalStorage<S extends AnySchema>(options: {
    name: string;
    onQuotaExceeded?: (table: keyof S, error: DepositQuotaError) => 'ignore' | 'throw';
    schema: S;
  }): Adapter<S>;

  export function createSessionStorage<S extends AnySchema>(options: {
    name: string;
    onQuotaExceeded?: (table: keyof S, error: DepositQuotaError) => 'ignore' | 'throw';
    schema: S;
  }): Adapter<S>;

  export function createMemory<S extends AnySchema>(options: {
    name?: string;
    schema: S;
  }): Adapter<S>;

  export function createIndexedDB<S extends AnySchema>(options: {
    migrate?: MigrationFn;
    name: string;
    schema: S;
    version: number;
  }): Adapter<S>;

  export function scheduleExpiredPrune<S extends AnySchema>(
    adapter: Pick<Adapter<S>, 'pruneExpired'>,
    options: { interval: number },
  ): () => void;

  export const ttl: {
    ms(n: number): TtlMs;
    seconds(n: number): TtlMs;
    minutes(n: number): TtlMs;
    hours(n: number): TtlMs;
    days(n: number): TtlMs;
  };
}
`;
