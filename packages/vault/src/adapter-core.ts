import { validateRecord } from './codec';
import { VaultDisposedError, VaultError, VaultScopeError } from './errors';
import { createObserverHub, getRecordKey } from './internal';
import { assertPositiveFinite } from './ttl';
import type {
  AnySchema,
  DocumentVaultStore,
  KeyOf,
  KeyValueVaultStore,
  MemoryStoreOptions,
  RecordOf,
  TableCodecs,
  TransactionContext,
} from './types';

/* -------------------- Internal backend protocol -------------------- */

/**
 * @internal Backend protocol implemented by each adapter. Only operations an
 * adapter can perform natively appear here; every convenience is layered on
 * once in `buildOperations`.
 */
export type StorageBackend<S extends AnySchema, K extends keyof S & string = keyof S & string> = {
  clear<T extends K>(table: T): Promise<void>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  /** Native multi-key delete in one transaction (IndexedDB). Falls back to per-key deletes. */
  deleteMany?<T extends K>(table: T, keys: readonly KeyOf<S, T>[]): Promise<number>;
  dispose?(): Promise<void>;
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  /** Native multi-key read in one transaction (IndexedDB). Falls back to per-key reads. */
  getMany?<T extends K>(table: T, keys: readonly KeyOf<S, T>[]): Promise<Array<RecordOf<S, T> | undefined>>;
  /** Lazy iteration over live records. Adapters without native cursors fall back to `getAll()`. */
  iterate?<T extends K>(table: T): AsyncIterable<RecordOf<S, T>>;
  /** Prune expired records across all tables in a single operation. */
  pruneAllExpired?(): Promise<Record<string, number>>;
  pruneExpiredInTable<T extends K>(table: T): Promise<number>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: number): Promise<void>;
  putAll<T extends K>(table: T, values: readonly RecordOf<S, T>[], ttl?: number): Promise<void>;
};

/** @internal Capabilities a batch factory needs from the surrounding store. */
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

/**
 * @internal Guard for transaction contexts: rejects use after the batch settled
 * and access to tables outside the declared scope.
 */
export function batchScopeGuard(
  tables: readonly string[],
  isActive: () => boolean = () => true,
): (table: string) => void {
  const scope = new Set(tables);

  return (table): void => {
    if (!isActive()) throw new VaultScopeError('transaction context is no longer active');
    if (!scope.has(table)) throw new VaultScopeError(`table "${table}" is not part of this batch scope`);
  };
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

/* -------------------- buildOperations -------------------- */

/**
 * @internal The single implementation of every store and transaction operation.
 * A public store and a batch transaction context differ only in who learns
 * about a mutation and which guard rejects illegal use, so both are built here.
 */
export function buildOperations<S extends AnySchema, K extends keyof S & string = keyof S & string>(
  schema: S,
  core: StorageBackend<S, K>,
  notify: (table: K) => void,
  validate: <T extends K>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
  guard: (table: K) => void,
): TransactionContext<S, K> {
  const ops: TransactionContext<S, K> = {
    async clear(table) {
      guard(table);
      await core.clear(table);
      notify(table);
    },
    async count(table) {
      guard(table);

      return (await core.getAll(table)).length;
    },
    async delete(table, key) {
      guard(table);

      const deleted = await core.delete(table, key);

      if (deleted) notify(table);

      return deleted;
    },
    async deleteMany(table, keys) {
      guard(table);

      const deleted = core.deleteMany
        ? await core.deleteMany(table, keys)
        : (await Promise.all(keys.map((key) => core.delete(table, key)))).filter(Boolean).length;

      if (deleted > 0) notify(table);

      return deleted;
    },
    async get(table, key) {
      guard(table);

      return core.get(table, key);
    },
    async getAll(table) {
      guard(table);

      return core.getAll(table);
    },
    async getMany(table, keys) {
      guard(table);

      return core.getMany ? core.getMany(table, keys) : Promise.all(keys.map((key) => core.get(table, key)));
    },
    async has(table, key) {
      guard(table);

      return (await core.get(table, key)) !== undefined;
    },
    async isEmpty(table) {
      return (await ops.count(table)) === 0;
    },
    iterate(table) {
      guard(table);

      if (core.iterate) return core.iterate(table);

      return (async function* (): AsyncIterable<RecordOf<S, typeof table>> {
        for (const record of await core.getAll(table)) yield record;
      })();
    },
    async keys(table, filter) {
      guard(table);

      const records = await core.getAll(table);
      const selected = filter ? records.filter(filter) : records;
      const keyField = schema[table].key;

      return selected.map((record) => (record as Record<string, unknown>)[keyField] as KeyOf<S, typeof table>);
    },
    async put(table, value, ttl) {
      guard(table);

      const canonical = validate(table, value);

      await core.put(table, canonical, resolveTtl(schema, table, ttl));
      notify(table);

      return canonical;
    },
    async putAll(table, values, ttl) {
      guard(table);

      if (values.length === 0) return;

      const toWrite = values.map((v) => validate(table, v));

      await core.putAll(table, toWrite, resolveTtl(schema, table, ttl));
      notify(table);
    },
    async update(table, key, changes, ttl) {
      const current = await ops.get(table, key);

      if (current === undefined) return undefined;

      const merged = { ...current, ...changes } as RecordOf<S, typeof table>;

      verifyKey(schema, table, key, merged, 'update');

      return ops.put(table, merged, ttl);
    },
    async upsert(table, key, apply, ttl) {
      const value = apply(await ops.get(table, key));

      verifyKey(schema, table, key, value, 'upsert: apply()');

      return ops.put(table, value, ttl);
    },
  };

  return ops;
}

/* -------------------- buildVaultStore -------------------- */

/** @internal Options shared by every store builder. */
export type VaultStoreOptions<S extends AnySchema> = MemoryStoreOptions<S> & {
  onCrossTabMessage?: (notify: (table: keyof S & string) => void) => (() => void) | undefined;
  onMutation?: (table: keyof S & string) => void;
};

/** @internal Options for document stores, which supply their own batch factory. */
export type DocumentStoreOptions<S extends AnySchema> = VaultStoreOptions<S> & {
  createBatch: (deps: BatchDeps<S>) => BatchImpl<S>;
};

type StoreCore<S extends AnySchema> = {
  disposed: () => boolean;
  notifyMutation: (table: keyof S & string) => void;
  store: KeyValueVaultStore<S>;
  validate: <K extends keyof S & string>(table: K, value: RecordOf<S, K>) => RecordOf<S, K>;
};

function buildStoreCore<S extends AnySchema>(
  schema: S,
  core: StorageBackend<S>,
  options: VaultStoreOptions<S>,
): StoreCore<S> {
  const observers = createObserverHub<S>((table) => core.getAll(table));

  const notifyMutation = (table: keyof S & string): void => {
    observers.notify(table);
    options.onMutation?.(table);
  };

  // Cross-tab notifications must NOT call onMutation (which would re-publish to
  // BroadcastChannel and create an infinite loop). They only notify local observers.
  const notifyExternal = (table: keyof S & string): void => {
    observers.notify(table);
  };

  const disconnectExternal = options.onCrossTabMessage?.(notifyExternal) ?? undefined;

  const validate = makeValidator(options.codecs);
  const pruneAll = core.pruneAllExpired?.bind(core);

  const disposeController = new AbortController();
  let disposed = false;

  const checkDisposed = (): void => {
    if (disposed) throw new VaultDisposedError();
  };

  const ops = buildOperations<S>(schema, core, notifyMutation, validate, () => checkDisposed());

  const store: KeyValueVaultStore<S> = {
    ...ops,
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

    async [Symbol.asyncDispose]() {
      await store.dispose();
    },
  };

  return { disposed: () => disposed, notifyMutation, store, validate };
}

/** Builds a key-value store: core CRUD, observation, TTL, and pruning. */
export function buildVaultStore<S extends AnySchema>(
  schema: S,
  core: StorageBackend<S>,
  options: VaultStoreOptions<S> = { schema },
): KeyValueVaultStore<S> {
  return buildStoreCore(schema, core, options).store;
}

/** Builds a document store: the key-value surface plus atomic `batch()`. */
export function buildDocumentStore<S extends AnySchema>(
  schema: S,
  core: StorageBackend<S>,
  options: DocumentStoreOptions<S>,
): DocumentVaultStore<S> {
  const { disposed, notifyMutation, store, validate } = buildStoreCore(schema, core, options);
  const batch = options.createBatch({ notifyMutation, validate });

  const runBatch = <K extends keyof S & string, R>(
    tables: readonly K[],
    fn: (tx: TransactionContext<S, K>) => Promise<R>,
  ): Promise<R> => {
    if (disposed()) return Promise.reject(new VaultDisposedError());

    return batch(tables, fn);
  };

  // Read-modify-write helpers stay atomic on document stores by running inside a
  // single-table batch instead of the plain read-then-write pair.
  return Object.assign(store, {
    batch: runBatch,
    deleteMany<K extends keyof S & string>(table: K, keys: readonly KeyOf<S, K>[]): Promise<number> {
      return runBatch([table], (tx) => tx.deleteMany(table, keys));
    },
    update<K extends keyof S & string>(
      table: K,
      key: KeyOf<S, K>,
      changes: Partial<RecordOf<S, K>>,
      ttl?: number,
    ): Promise<RecordOf<S, K> | undefined> {
      return runBatch([table], (tx) => tx.update(table, key, changes, ttl));
    },
    upsert<K extends keyof S & string>(
      table: K,
      key: KeyOf<S, K>,
      apply: (existing: RecordOf<S, K> | undefined) => RecordOf<S, K>,
      ttl?: number,
    ): Promise<RecordOf<S, K>> {
      return runBatch([table], (tx) => tx.upsert(table, key, apply, ttl));
    },
  }) as DocumentVaultStore<S>;
}
