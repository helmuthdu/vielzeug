import { VaultDisposedError, VaultError, VaultScopeError } from './errors';
import { createObserverHub, getRecordKey } from './internal';
import { createQueryBuilder, type QueryContext } from './query';
import { assertPositiveFinite } from './ttl';
import type {
  AnySchema,
  BaseAdapterOptions,
  KeyOf,
  RecordOf,
  TransactionalVaultStore,
  TransactionContext,
  VaultStore,
} from './types';

/* -------------------- Internal backend protocol -------------------- */

/** @internal Full backend protocol implemented by each adapter. A single flat interface — no StorageCore/StorageBackend split. */
export type StorageBackend<S extends AnySchema, K extends keyof S & string = keyof S & string> = {
  clear<T extends K>(table: T): Promise<void>;
  /** Returns live (non-expired) record count for the table. */
  count<T extends K>(table: T): Promise<number>;
  delete<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  deleteMany<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<number>;
  dispose?(): Promise<void>;
  get<T extends K>(table: T, key: KeyOf<S, T>): Promise<RecordOf<S, T> | undefined>;
  getAll<T extends K>(table: T): Promise<RecordOf<S, T>[]>;
  /**
   * Optional: fetch all live primary keys without materialising full records.
   * When present, `keys()` uses this instead of `getAll()` + key extraction.
   * For tables with TTL, implementations may still fall back to `getAll()` to
   * filter expired keys accurately.
   */
  getAllKeys?<T extends K>(table: T): Promise<KeyOf<S, T>[]>;
  /**
   * Optional: fetch multiple records by key in a single operation. Preserves key order; missing keys yield
   * `undefined`. Falls back to N individual `get` calls when absent.
   */
  getMany?<T extends K>(table: T, keys: KeyOf<S, T>[]): Promise<Array<RecordOf<S, T> | undefined>>;
  has<T extends K>(table: T, key: KeyOf<S, T>): Promise<boolean>;
  /**
   * Optional: prune all expired records across all tables in a single atomic operation.
   * When present, `pruneExpired()` delegates here instead of calling `pruneExpiredInTable` N times.
   */
  pruneAllExpired?(): Promise<Record<string, number>>;
  pruneExpiredInTable<T extends K>(table: T): Promise<number>;
  put<T extends K>(table: T, value: RecordOf<S, T>, ttl?: number): Promise<void>;
  putAll<T extends K>(table: T, values: RecordOf<S, T>[], ttl?: number): Promise<void>;
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

function getManyWithFallback<S extends AnySchema, K extends keyof S & string>(
  core: Pick<StorageBackend<S, K>, 'get' | 'getMany'>,
  table: K,
  keys: KeyOf<S, K>[],
): Promise<Array<RecordOf<S, K> | undefined>> {
  if (core.getMany) return core.getMany(table, keys);

  return Promise.all(keys.map((k) => core.get(table, k)));
}

function buildQueryCtx<S extends AnySchema, K extends keyof S & string>(
  table: K,
  core: Pick<StorageBackend<S, K>, 'deleteMany' | 'getAll'>,
  schema: S,
  onMutate: (t: K) => void,
): QueryContext<RecordOf<S, K>> {
  const deleteManyFn = async (records: RecordOf<S, K>[]): Promise<number> => {
    if (records.length === 0) return 0;

    const keys = records.map((r) => getRecordKey(schema, table, r));
    const deleted = await core.deleteMany(table, keys);

    if (deleted > 0) onMutate(table);

    return deleted;
  };

  return {
    deleteMany: deleteManyFn,
    source: () => core.getAll(table),
  };
}

/* -------------------- buildTxContext -------------------- */

export function buildTxContext<S extends AnySchema, K extends keyof S & string>(
  schema: S,
  core: StorageBackend<S, K>,
  onMutate: (table: K) => void,
  validate?: <T extends K>(table: T, value: RecordOf<S, T>) => RecordOf<S, T>,
  scope?: ReadonlySet<string>,
): TransactionContext<S, K> {
  const applyValidation = validate ?? ((_: K, v: RecordOf<S, K>) => v);

  const checkScope = scope
    ? (t: K): void => {
        if (!scope.has(t)) {
          throw new VaultScopeError(`table "${t}" is not part of this batch scope`);
        }
      }
    : (_t: K): void => {};

  return {
    async clear(table) {
      checkScope(table);

      const live = await core.count(table);

      await core.clear(table);

      if (live > 0) onMutate(table);
    },
    async count(table) {
      checkScope(table);

      return core.count(table);
    },
    async delete(table, key) {
      checkScope(table);

      const deleted = await core.delete(table, key);

      if (deleted) onMutate(table);

      return deleted;
    },
    async deleteMany(table, keys) {
      checkScope(table);

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

      return getManyWithFallback(core, table, keys);
    },
    async has(table, key) {
      checkScope(table);

      return core.has(table, key);
    },
    async isEmpty(table) {
      checkScope(table);

      return (await core.count(table)) === 0;
    },
    async keys(table, filter) {
      checkScope(table);

      if (filter) {
        const records = await core.getAll(table);
        const keyField = schema[table].key;

        return records.filter(filter).map((r) => (r as Record<string, unknown>)[keyField] as KeyOf<S, typeof table>);
      }

      // R1: prefer native getAllKeys when the backend supports it (e.g. IDB store.getAllKeys).
      if (core.getAllKeys) {
        return core.getAllKeys(table);
      }

      const records = await core.getAll(table);
      const keyField = schema[table].key;

      return records.map((r) => (r as Record<string, unknown>)[keyField] as KeyOf<S, typeof table>);
    },
    async put(table, value, ttl) {
      checkScope(table);

      await core.put(table, applyValidation(table, value), resolveTtl(schema, table, ttl));
      onMutate(table);
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

      return createQueryBuilder(buildQueryCtx(table, core, schema, onMutate));
    },
    async update(table, key, changes, ttl) {
      checkScope(table);

      const current = await core.get(table, key);

      if (!current) return undefined;

      const merged = { ...current, ...changes } as RecordOf<S, typeof table>;

      verifyKey(schema, table, key, merged, 'update');
      await core.put(table, applyValidation(table, merged), resolveTtl(schema, table, ttl));
      onMutate(table);

      return merged;
    },
    async upsert(table, key, fn, ttl) {
      checkScope(table);

      const existing = await core.get(table, key);
      const value = fn(existing);

      verifyKey(schema, table, key, value, 'upsert: fn()');
      await core.put(table, applyValidation(table, value), resolveTtl(schema, table, ttl));
      onMutate(table);

      return value;
    },
  };
}

/* -------------------- buildAdapterOps -------------------- */

/** Builds the portable surface first; IndexedDB opts into transactions at its factory boundary. */
export function buildAdapterOps<S extends AnySchema>(
  schema: S,
  core: StorageBackend<S>,
  options?: BaseAdapterOptions<S> & {
    onCrossTabMessage?: (notify: (table: keyof S & string) => void) => (() => void) | undefined;
    onMutation?: (table: keyof S & string) => void;
    onTransactions?: (deps: BatchDeps<S>) => void;
  },
): VaultStore<S> {
  const { validators } = options ?? {};

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

  // R6: Resolve optional backend capabilities once at construction — no per-call checks.
  const pruneAll = core.pruneAllExpired?.bind(core);

  const disconnectExternal = options?.onCrossTabMessage?.(notifyExternal) ?? undefined;

  const validate = <K extends keyof S & string>(table: K, value: RecordOf<S, K>): RecordOf<S, K> => {
    const validator = validators?.[table];

    if (!validator) return value;

    try {
      return validator.parse(value) as RecordOf<S, K>;
    } catch (err) {
      throw new VaultError(`validation failed for table "${table}"`, { cause: err });
    }
  };

  options?.onTransactions?.({ notifyMutation, validate });

  const txCtx = buildTxContext<S, keyof S & string>(schema, core, notifyMutation, validate);

  const disposeController = new AbortController();
  let disposed = false;

  const checkDisposed = (): void => {
    if (disposed) throw new VaultDisposedError();
  };

  const adapter: VaultStore<S> = {
    async clear(table) {
      checkDisposed();
      await txCtx.clear(table);
    },

    async count(table) {
      checkDisposed();

      return core.count(table);
    },

    async delete(table, key) {
      checkDisposed();

      return txCtx.delete(table, key);
    },

    async deleteMany(table, keys) {
      checkDisposed();

      return txCtx.deleteMany(table, keys);
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

      return txCtx.get(table, key);
    },

    async getAll(table) {
      checkDisposed();

      return txCtx.getAll(table);
    },

    async getMany(table, keys) {
      checkDisposed();

      return txCtx.getMany(table, keys);
    },

    async has(table, key) {
      checkDisposed();

      return txCtx.has(table, key);
    },

    async isEmpty(table) {
      checkDisposed();

      return (await core.count(table)) === 0;
    },

    async keys(table, filter) {
      checkDisposed();

      return txCtx.keys(table, filter);
    },

    observe(table, listener, opts) {
      checkDisposed();

      return observers.observe(table, listener, opts);
    },

    async pruneExpired() {
      checkDisposed();

      if (pruneAll) {
        const result = await pruneAll();

        return result as { [K in keyof S & string]: number };
      }

      const tableNames = Object.keys(schema) as Array<keyof S & string>;
      const pairs = await Promise.all(
        tableNames.map(async (name) => {
          const pruned = await core.pruneExpiredInTable(name);

          return [name, pruned] as const;
        }),
      );

      return Object.fromEntries(pairs) as { [K in keyof S & string]: number };
    },

    async put(table, value, ttl) {
      checkDisposed();
      await txCtx.put(table, value, ttl);
    },

    async putAll(table, values, ttl) {
      checkDisposed();
      await txCtx.putAll(table, values, ttl);
    },

    query(table) {
      checkDisposed();

      return createQueryBuilder(buildQueryCtx(table, core, schema, notifyMutation));
    },

    async [Symbol.asyncDispose]() {
      await adapter.dispose();
    },

    async update(table, key, changes, ttl) {
      checkDisposed();

      return txCtx.update(table, key, changes, ttl);
    },

    async upsert(table, key, fn, ttl) {
      checkDisposed();

      return txCtx.upsert(table, key, fn, ttl);
    },
  };

  return adapter;
}

/** IndexedDB is the only backend that can bind this callback to one native transaction. */
export function withIndexedDbTransactions<S extends AnySchema>(
  store: VaultStore<S>,
  batch: BatchImpl<S>,
): TransactionalVaultStore<S> {
  return Object.assign(store, { batch }) as TransactionalVaultStore<S>;
}
