import { validateRecord } from './codec';
import { VaultDisposedError, VaultError, VaultScopeError } from './errors';
import { createObserverHub, getRecordKey } from './internal';
import { createQueryBuilder } from './query';
import { assertPositiveFinite } from './ttl';
import type {
  AnySchema,
  DocumentVaultStore,
  DurableStoreOptions,
  KeyOf,
  KeyValueVaultStore,
  MemoryStoreOptions,
  RecordOf,
  TableCodecs,
  TransactionContext,
} from './types';

/* -------------------- Internal backend protocol -------------------- */

/** @internal Full backend protocol implemented by each adapter. */
export type StorageBackend<S extends AnySchema, K extends keyof S & string = keyof S & string> = {
  clear<T extends K>(table: T): Promise<void>;
  count?<T extends K>(table: T): Promise<number>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  deleteMany?<T extends K>(table: T, keys: readonly KeyOf<S, T>[]): Promise<number>;
  dispose?(): Promise<void>;
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  getAllKeys?<T extends K>(table: T): Promise<KeyOf<S, T>[]>;
  getMany?<T extends K>(table: T, keys: readonly KeyOf<S, T>[]): Promise<Array<RecordOf<S, T> | undefined>>;
  has?<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  /**
   * Optional: lazy iteration over live records. Document stores implement this natively
   * (IDB cursor, SQLite keyset pagination). Key-value stores fall back to getAll().
   */
  iterate?<T extends K>(table: T): AsyncIterable<RecordOf<S, T>>;
  /**
   * Optional: prune all expired records across all tables in a single atomic operation.
   * When present, `pruneExpired()` delegates here instead of calling `pruneExpiredInTable` N times.
   */
  pruneAllExpired?(): Promise<Record<string, number>>;
  pruneExpiredInTable<T extends K>(table: T): Promise<number>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: number): Promise<void>;
  putAll<T extends K>(table: T, values: readonly RecordOf<S, T>[], ttl?: number): Promise<void>;
};

/** @internal */
export type BatchDeps<S extends AnySchema> = {
  notifyMutation: (table: keyof S & string) => void;
  validate: <K extends keyof S & string>(table: K, value: RecordOf<S, K>) => RecordOf<S, K>;
};

/** @internal */
export type BatchImpl<S extends AnySchema> = <K extends keyof S & string, R>(
  tables: readonly K[],
  fn: (tx: TransactionContext<S, K>) => Promise<R>,
) => Promise<R>;

/* -------------------- Helpers -------------------- */

export function assertBatchTables(tables: readonly string[]): void {
  if (tables.length === 0) throw new VaultError('batch: declare at least one table');
}

function resolveTtl<S extends AnySchema, K extends keyof S & string>(
  schema: S,
  table: K,
  ttl?: number,
): number | undefined {
  if (ttl !== undefined) assertPositiveFinite(ttl, 'put/putAll');

  return ttl ?? schema[table].defaultTtl;
}

function verifyKey<S extends AnySchema, K extends keyof S & string>(
  schema: S,
  table: K,
  expected: KeyOf<S, K>,
  value: RecordOf<S, K>,
  op: string,
): void {
  const actual = getRecordKey(schema, table, value);

  if (actual !== expected) {
    throw new VaultError(
      `${op}: key field "${schema[table].key}" must be "${String(expected)}" but got "${String(actual)}" in table "${table}"`,
    );
  }
}

/* -------------------- Codec helpers -------------------- */

export function makeValidator<S extends AnySchema>(
  codecs: TableCodecs<S> | undefined,
): <K extends keyof S & string>(table: K, value: RecordOf<S, K>) => RecordOf<S, K> {
  return <K extends keyof S & string>(table: K, value: RecordOf<S, K>): RecordOf<S, K> => {
    const codec = codecs?.[table];

    if (!codec) return value;

    try {
      return validateRecord(codec, value);
    } catch (err) {
      throw new VaultError(`validation failed for table "${table}"`, { cause: err });
    }
  };
}

/* -------------------- buildTxContext -------------------- */

export function buildTxContext<S extends AnySchema, K extends keyof S & string>(
  schema: S,
  core: StorageBackend<S, K>,
  onMutate: (table: K) => void,
  validate?: <T extends K>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
  scope?: ReadonlySet<string>,
  isActive: () => boolean = () => true,
): TransactionContext<S, K> {
  const applyValidation = validate ?? ((_: K, v: RecordOf<S, K>) => v);

  const checkScope = (table: K): void => {
    if (!isActive()) throw new VaultScopeError('transaction context is no longer active');
    if (scope && !scope.has(table)) throw new VaultScopeError(`table "${table}" is not part of this batch scope`);
  };

  const context: TransactionContext<S, K> = {
    async clear(table) {
      checkScope(table);
      await core.clear(table);
      onMutate(table);
    },
    async count(table) {
      checkScope(table);
      return core.count ? core.count(table) : (await core.getAll(table)).length;
    },
    async delete(table, key) {
      checkScope(table);

      const deleted = await core.delete(table, key);

      if (deleted) onMutate(table);

      return deleted;
    },
    async deleteMany(table, keys) {
      checkScope(table);
      if (!core.deleteMany) {
        const results = await Promise.all(keys.map((key) => core.delete(table, key)));
        const deleted = results.filter(Boolean).length;
        if (deleted > 0) onMutate(table);
        return deleted;
      }
      const deleted = await core.deleteMany(table, keys);
      if (deleted > 0) onMutate(table);
      return deleted;
    },
    async get(table, key) {
      checkScope(table);

      return core.get(table, key);
    },
    async getAll(table) {
      checkScope(table);

      return core.getAll(table);
    },
    async getMany(table, keys) {
      checkScope(table);
      return core.getMany ? core.getMany(table, keys) : Promise.all(keys.map((key) => core.get(table, key)));
    },
    async has(table, key) {
      checkScope(table);
      return core.has ? core.has(table, key) : (await core.get(table, key)) !== undefined;
    },
    async isEmpty(table) {
      return (await context.count(table)) === 0;
    },
    iterate(table) {
      checkScope(table);

      if (core.iterate) return core.iterate(table);

      // Fallback: iterate over getAll() materialized records.
      return (async function* (): AsyncIterable<RecordOf<S, typeof table>> {
        const records = await core.getAll(table);

        for (const record of records) yield record;
      })();
    },
    async keys(table, filter) {
      checkScope(table);
      if (!filter && core.getAllKeys) return core.getAllKeys(table);
      const records = await core.getAll(table);
      const selected = filter ? records.filter(filter) : records;
      const keyField = schema[table].key;
      return selected.map((record) => (record as Record<string, unknown>)[keyField] as KeyOf<S, typeof table>);
    },
    async put(table, value, ttl) {
      checkScope(table);
      const canonical = applyValidation(table, value);
      await core.put(table, canonical, resolveTtl(schema, table, ttl));
      onMutate(table);
      return canonical;
    },
    async putAll(table, values, ttl) {
      checkScope(table);

      if (values.length === 0) return;

      const toWrite = values.map((v) => applyValidation(table, v));

      await core.putAll(table, toWrite, resolveTtl(schema, table, ttl));
      onMutate(table);
    },
    query(table) {
      checkScope(table);
      return createQueryBuilder({
        deleteMany: async (records) => {
          const keys = records.map((record) => getRecordKey(schema, table, record));
          return context.deleteMany(table, keys);
        },
        source: () => context.getAll(table),
      });
    },
    async update(table, key, changes, ttl) {
      const current = await context.get(table, key);
      if (current === undefined) return undefined;
      const merged = { ...current, ...changes } as RecordOf<S, typeof table>;
      verifyKey(schema, table, key, merged, 'update');
      return context.put(table, merged, ttl);
    },
    async upsert(table, key, update, ttl) {
      const value = update(await context.get(table, key));
      verifyKey(schema, table, key, value, 'upsert: update()');
      return context.put(table, value, ttl);
    },
  };

  return context;
}

/* -------------------- buildKeyValueStore -------------------- */

/** Builds a KeyValueVaultStore from a backend and options. */
export function buildKeyValueStore<S extends AnySchema>(
  schema: S,
  core: StorageBackend<S>,
  options?: MemoryStoreOptions<S> & {
    onCrossTabMessage?: (notify: (table: keyof S & string) => void) => (() => void) | undefined;
    onMutation?: (table: keyof S & string) => void;
    onTransactions?: (deps: BatchDeps<S>) => void;
  },
): KeyValueVaultStore<S> {
  const { codecs } = options ?? {};

  const observers = createObserverHub<S>((table) => core.getAll(table));

  const notifyMutation = (table: keyof S & string): void => {
    observers.notify(table);
    options?.onMutation?.(table);
  };

  // Cross-tab notifications must NOT call onMutation (which would re-publish to BroadcastChannel,
  // creating an infinite loop). They only notify local observers.
  const notifyExternal = (table: keyof S & string): void => {
    observers.notify(table);
  };

  const pruneAll = core.pruneAllExpired?.bind(core);

  const disconnectExternal = options?.onCrossTabMessage?.(notifyExternal) ?? undefined;

  const validate = makeValidator(codecs);

  options?.onTransactions?.({ notifyMutation, validate });

  const disposeController = new AbortController();
  let disposed = false;

  const checkDisposed = (): void => {
    if (disposed) throw new VaultDisposedError();
  };

  const adapter: KeyValueVaultStore<S> = {
    async clear(table) {
      checkDisposed();
      await core.clear(table);
      notifyMutation(table);
    },
    async count(table) {
      checkDisposed();
      return core.count ? core.count(table) : (await core.getAll(table)).length;
    },

    async delete(table, key) {
      checkDisposed();

      const deleted = await core.delete(table, key);

      if (deleted) notifyMutation(table);

      return deleted;
    },
    async deleteMany(table, keys) {
      checkDisposed();
      const deleted = core.deleteMany
        ? await core.deleteMany(table, keys)
        : (await Promise.all(keys.map((key) => core.delete(table, key)))).filter(Boolean).length;
      if (deleted > 0) notifyMutation(table);
      return deleted;
    },

    get disposalSignal(): AbortSignal {
      return disposeController.signal;
    },

    async dispose() {
      if (disposed) return;

      disposed = true;
      disposeController.abort();
      disconnectExternal?.();
      observers.dispose();
      await core.dispose?.();
    },

    get disposed(): boolean {
      return disposed;
    },

    async get(table, key) {
      checkDisposed();

      return core.get(table, key);
    },

    async getAll(table) {
      checkDisposed();

      return core.getAll(table);
    },
    async getMany(table, keys) {
      checkDisposed();
      return core.getMany ? core.getMany(table, keys) : Promise.all(keys.map((key) => core.get(table, key)));
    },
    async has(table, key) {
      checkDisposed();
      return core.has ? core.has(table, key) : (await core.get(table, key)) !== undefined;
    },
    async isEmpty(table) {
      return (await adapter.count(table)) === 0;
    },
    async keys(table, filter) {
      checkDisposed();
      if (!filter && core.getAllKeys) return core.getAllKeys(table);
      const records = await core.getAll(table);
      const selected = filter ? records.filter(filter) : records;
      const keyField = schema[table].key;
      return selected.map((record) => (record as Record<string, unknown>)[keyField] as KeyOf<S, typeof table>);
    },

    observe(table, listener, opts) {
      checkDisposed();

      return observers.observe(table, listener, opts);
    },

    async pruneExpired() {
      checkDisposed();

      if (pruneAll) {
        const result = await pruneAll();

        for (const [table, pruned] of Object.entries(result)) {
          if (pruned > 0) notifyMutation(table as keyof S & string);
        }

        return result as { [K in keyof S & string]: number };
      }

      const tableNames = Object.keys(schema) as Array<keyof S & string>;
      const pairs = await Promise.all(
        tableNames.map(async (name) => {
          const pruned = await core.pruneExpiredInTable(name);

          return [name, pruned] as const;
        }),
      );

      for (const [table, pruned] of pairs) {
        if (pruned > 0) notifyMutation(table);
      }

      return Object.fromEntries(pairs) as { [K in keyof S & string]: number };
    },

    async put(table, value, ttl) {
      checkDisposed();
      const canonical = validate(table, value);
      await core.put(table, canonical, resolveTtl(schema, table, ttl));
      notifyMutation(table);
      return canonical;
    },

    async putAll(table, values, ttl) {
      checkDisposed();

      if (values.length === 0) return;

      const toWrite = values.map((v) => validate(table, v));

      await core.putAll(table, toWrite, resolveTtl(schema, table, ttl));
      notifyMutation(table);
    },
    query(table) {
      checkDisposed();
      return createQueryBuilder({
        deleteMany: async (records) => {
          const keys = records.map((record) => getRecordKey(schema, table, record));
          return adapter.deleteMany(table, keys);
        },
        source: () => adapter.getAll(table),
      });
    },
    async update(table, key, changes, ttl) {
      const current = await adapter.get(table, key);
      if (current === undefined) return undefined;
      const merged = { ...current, ...changes } as RecordOf<S, typeof table>;
      verifyKey(schema, table, key, merged, 'update');
      return adapter.put(table, merged, ttl);
    },
    async upsert(table, key, apply, ttl) {
      const value = apply(await adapter.get(table, key));
      verifyKey(schema, table, key, value, 'upsert: apply()');
      return adapter.put(table, value, ttl);
    },

    async [Symbol.asyncDispose]() {
      await adapter.dispose();
    },
  };

  return adapter;
}

/* -------------------- buildDocumentStore -------------------- */

/** A document store before batch() is attached. */
export type DocumentVaultStoreWithoutBatch<S extends AnySchema> = Omit<DocumentVaultStore<S>, 'batch'>;

/** Builds a DocumentVaultStore (without batch) from a backend, codecs, and options. */
export function buildDocumentStore<S extends AnySchema>(
  schema: S,
  core: StorageBackend<S>,
  options: DurableStoreOptions<S> & {
    onCrossTabMessage?: (notify: (table: keyof S & string) => void) => (() => void) | undefined;
    onMutation?: (table: keyof S & string) => void;
    onTransactions?: (deps: BatchDeps<S>) => void;
  },
): DocumentVaultStoreWithoutBatch<S> {
  const store = buildKeyValueStore(schema, core, options);

  return Object.assign(store, {
    iterate<K extends keyof S & string>(table: K): AsyncIterable<RecordOf<S, K>> {
      if (store.disposed) throw new VaultDisposedError();
      if (core.iterate) return core.iterate(table);
      return (async function* (): AsyncIterable<RecordOf<S, K>> {
        for (const record of await store.getAll(table)) yield record;
      })();
    },
  });
}

/** Attaches a batch() implementation to a document store. */
export function withBatch<S extends AnySchema>(
  store: DocumentVaultStoreWithoutBatch<S>,
  batch: BatchImpl<S>,
  schema: S,
): DocumentVaultStore<S> {
  const runBatch: BatchImpl<S> = (tables, fn) => {
    if (store.disposed) return Promise.reject(new VaultDisposedError());
    return batch(tables, fn);
  };

  return Object.assign(store, {
    batch: runBatch,
    deleteMany<K extends keyof S & string>(table: K, keys: readonly KeyOf<S, K>[]) {
      return runBatch([table], (tx) => tx.deleteMany(table, keys));
    },
    query<K extends keyof S & string>(table: K) {
      if (store.disposed) throw new VaultDisposedError();
      return createQueryBuilder({
        deleteMany: async (records) => {
          const keys = records.map((record) => getRecordKey(schema, table, record));
          return runBatch([table], (tx) => tx.deleteMany(table, keys));
        },
        source: () => store.getAll(table),
      });
    },
    update<K extends keyof S & string>(table: K, key: KeyOf<S, K>, changes: Partial<RecordOf<S, K>>, ttl?: number) {
      return runBatch([table], (tx) => tx.update(table, key, changes, ttl));
    },
    upsert<K extends keyof S & string>(
      table: K,
      key: KeyOf<S, K>,
      apply: (existing: RecordOf<S, K> | undefined) => RecordOf<S, K>,
      ttl?: number,
    ) {
      return runBatch([table], (tx) => tx.upsert(table, key, apply, ttl));
    },
  }) as DocumentVaultStore<S>;
}

/* -------------------- Derived convenience helpers -------------------- */

/** Check whether a record exists for the given key. */
export async function has<S extends AnySchema, K extends keyof S & string>(
  store: KeyValueVaultStore<S>,
  table: K,
  key: KeyOf<S, K>,
): Promise<boolean> {
  return store.has(table, key);
}

/** Count live records in a table. */
export async function count<S extends AnySchema, K extends keyof S & string>(
  store: KeyValueVaultStore<S>,
  table: K,
): Promise<number> {
  return store.count(table);
}

/** Check whether a table has no live records. */
export async function isEmpty<S extends AnySchema, K extends keyof S & string>(
  store: KeyValueVaultStore<S>,
  table: K,
): Promise<boolean> {
  return store.isEmpty(table);
}

/** Fetch multiple records by key. Preserves key order; missing keys yield `undefined`. */
export async function getMany<S extends AnySchema, K extends keyof S & string>(
  store: KeyValueVaultStore<S>,
  table: K,
  keys: readonly KeyOf<S, K>[],
): Promise<Array<RecordOf<S, K> | undefined>> {
  return store.getMany(table, keys);
}

/** Fetch all live primary keys for a table. */
export async function keys<S extends AnySchema, K extends keyof S & string>(
  store: KeyValueVaultStore<S>,
  table: K,
  filter?: (record: RecordOf<S, K>) => boolean,
): Promise<KeyOf<S, K>[]> {
  return store.keys(table, filter);
}

/** Delete multiple records by key. Returns the count of records that were actually deleted. */
export async function deleteMany<S extends AnySchema, K extends keyof S & string>(
  store: KeyValueVaultStore<S>,
  table: K,
  keys: readonly KeyOf<S, K>[],
): Promise<number> {
  return store.deleteMany(table, keys);
}

/** Partially update an existing record. Returns `undefined` when the key does not exist. */
export async function update<S extends AnySchema, K extends keyof S & string>(
  store: KeyValueVaultStore<S>,
  table: K,
  key: KeyOf<S, K>,
  changes: Partial<RecordOf<S, K>>,
  ttl?: number,
): Promise<RecordOf<S, K> | undefined> {
  return store.update(table, key, changes, ttl);
}

/** Read-modify-write: the callback receives the current record (or `undefined`) and returns the value to store. */
export async function upsert<S extends AnySchema, K extends keyof S & string>(
  store: KeyValueVaultStore<S>,
  table: K,
  key: KeyOf<S, K>,
  apply: (existing: RecordOf<S, K> | undefined) => RecordOf<S, K>,
  ttl?: number,
): Promise<RecordOf<S, K>> {
  return store.upsert(table, key, apply, ttl);
}
