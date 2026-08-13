import {
  assertBatchTables,
  type BatchImpl,
  buildAdapterOps,
  buildTxContext,
  type StorageBackend,
} from '../adapter-core';
import { VaultDisposedError, VaultError } from '../errors';
import { encodeVaultKey, getRecordKey } from '../internal';
import { isExpired } from '../ttl';
import type {
  AnySchema,
  BaseAdapterOptions,
  IterableVaultStore,
  KeyOf,
  RecordOf,
  TransactionalVaultStore,
} from '../types';

export type SQLiteParameter = null | number | string;
type SQLiteRow = Record<string, unknown>;

/**
 * A synchronous SQLite statement with positional parameter binding.
 *
 * Adapters for drivers whose native statement API differs can implement this
 * structural protocol without adding a runtime dependency to Vault.
 */
export interface SQLiteStatement {
  all(...parameters: SQLiteParameter[]): readonly SQLiteRow[];
  finalize?(): void;
  get(...parameters: SQLiteParameter[]): SQLiteRow | undefined;
  run(...parameters: SQLiteParameter[]): unknown;
}

/**
 * A runtime-neutral synchronous SQLite connection.
 *
 * Node's `DatabaseSync`, Bun's `Database`, and Deno's `@db/sqlite` `Database`
 * satisfy this protocol directly.
 */
export interface SQLiteDatabase {
  close?(): void;
  exec(sql: string): void;
  prepare(sql: string): SQLiteStatement;
}

export type SQLiteVaultOptions<S extends AnySchema> = BaseAdapterOptions<S> & {
  /** Closes the caller-provided connection during store disposal when true. */
  closeOnDispose?: boolean;
  database: SQLiteDatabase;
  /** Namespace that isolates this store's records in the shared connection. */
  name: string;
};

/** SQLite provides atomic batches and lazy keyset-paginated iteration. */
export interface SQLiteVaultStore<S extends AnySchema> extends TransactionalVaultStore<S>, IterableVaultStore<S> {}

type ConnectionState = {
  batchActive: boolean;
  executor: ConnectionExecutor;
  initialized: Promise<void>;
  listeners: Set<ConnectionListener>;
};
type ConnectionListener = (name: string, table: string) => void;
type KeyColumns = { encoded: string; kind: 'number' | 'string'; number: number | null; string: string | null };
type StoredRow = { expiresAt: number | undefined; json: string; rowId: number };

const connectionStates = new WeakMap<SQLiteDatabase, ConnectionState>();
const RECORDS_TABLE = '"__vielzeug_vault_records"';
const METADATA_TABLE = '"__vielzeug_vault_metadata"';
const STORAGE_FORMAT_VERSION = 1;
const ITERATION_PAGE_SIZE = 100;

class ConnectionExecutor {
  private tail: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release: (() => void) | undefined;
    const previous = this.tail;

    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;

    return () => release?.();
  }

  async run<T>(work: () => T | Promise<T>): Promise<T> {
    const release = await this.acquire();

    try {
      return await work();
    } finally {
      release();
    }
  }
}

function getConnectionState(database: SQLiteDatabase): ConnectionState {
  const current = connectionStates.get(database);

  if (current) return current;

  const executor = new ConnectionExecutor();
  const state: ConnectionState = {
    batchActive: false,
    executor,
    initialized: executor.run(() => initializeDatabase(database)),
    listeners: new Set(),
  };

  connectionStates.set(database, state);

  return state;
}

function initializeDatabase(database: SQLiteDatabase): void {
  database.exec(
    `
      CREATE TABLE IF NOT EXISTS ${METADATA_TABLE} (
        namespace TEXT PRIMARY KEY,
        format_version INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ${RECORDS_TABLE} (
        namespace TEXT NOT NULL,
        table_name TEXT NOT NULL,
        key_tag TEXT NOT NULL,
        key_kind TEXT NOT NULL,
        key_number REAL,
        key_string TEXT,
        value_json TEXT NOT NULL,
        expires_at INTEGER,
        PRIMARY KEY (namespace, table_name, key_tag)
      );
      CREATE INDEX IF NOT EXISTS "__vielzeug_vault_records_expiration"
        ON ${RECORDS_TABLE} (namespace, table_name, expires_at);
      CREATE INDEX IF NOT EXISTS "__vielzeug_vault_records_number_key"
        ON ${RECORDS_TABLE} (namespace, table_name, key_kind, key_number);
      CREATE INDEX IF NOT EXISTS "__vielzeug_vault_records_string_key"
        ON ${RECORDS_TABLE} (namespace, table_name, key_kind, key_string);
    `,
  );
}

function initializeNamespace(database: SQLiteDatabase, name: string): void {
  const row = get(database, `SELECT format_version FROM ${METADATA_TABLE} WHERE namespace = ?`, [name]);

  if (row === undefined) {
    run(database, `INSERT INTO ${METADATA_TABLE} (namespace, format_version) VALUES (?, ?)`, [
      name,
      STORAGE_FORMAT_VERSION,
    ]);

    return;
  }

  if (row.format_version !== STORAGE_FORMAT_VERSION) {
    throw new VaultError(`SQLite storage format for "${name}" is not supported`);
  }
}

function assertName(name: string): void {
  if (name.length === 0) throw new VaultError('createSQLite: name must not be empty');
}

function assertJsonValue(value: unknown, seen: Set<object>, path: string): void {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return;

  if (typeof value === 'number') {
    if (Number.isFinite(value)) return;

    throw new VaultError(`SQLite serialization failed at ${path}: numbers must be finite`);
  }

  if (typeof value !== 'object') {
    throw new VaultError(`SQLite serialization failed at ${path}: expected a JSON-compatible value`);
  }

  if (seen.has(value))
    throw new VaultError(`SQLite serialization failed at ${path}: circular references are not supported`);

  if (Array.isArray(value)) {
    seen.add(value);

    for (let index = 0; index < value.length; index += 1) {
      assertJsonValue(value[index], seen, `${path}[${String(index)}]`);
    }

    seen.delete(value);

    return;
  }

  const prototype = Object.getPrototypeOf(value);

  if (prototype !== null && prototype !== Object.prototype) {
    throw new VaultError(`SQLite serialization failed at ${path}: expected a plain object`);
  }

  seen.add(value);

  for (const [key, nested] of Object.entries(value)) {
    assertJsonValue(nested, seen, `${path}.${key}`);
  }

  seen.delete(value);
}

function encodeJson(value: object): string {
  assertJsonValue(value, new Set(), 'record');

  return JSON.stringify(value);
}

function decodeJson(json: string): object {
  try {
    const value: unknown = JSON.parse(json);

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new VaultError('stored record is not a JSON object');
    }

    return value;
  } catch (error) {
    if (VaultError.is(error)) throw error;

    throw new VaultError('stored record contains invalid JSON', { cause: error });
  }
}

function toKeyColumns(key: number | string): KeyColumns {
  const encoded = encodeVaultKey(key);

  return typeof key === 'number'
    ? { encoded, kind: 'number', number: key, string: null }
    : { encoded, kind: 'string', number: null, string: key };
}

function getStoredRow(row: SQLiteRow): StoredRow {
  const json = row.value_json;
  const rawExpiresAt = row.expires_at;
  const rowId = row.row_id;

  if (typeof json !== 'string' || typeof rowId !== 'number' || !Number.isInteger(rowId)) {
    throw new VaultError('SQLite storage contains a malformed record');
  }

  if (rawExpiresAt !== null && (typeof rawExpiresAt !== 'number' || !Number.isFinite(rawExpiresAt))) {
    throw new VaultError('SQLite storage contains a malformed expiration timestamp');
  }

  const expiresAt = typeof rawExpiresAt === 'number' ? rawExpiresAt : undefined;

  return { expiresAt, json, rowId };
}

function withStatement<T>(database: SQLiteDatabase, sql: string, work: (statement: SQLiteStatement) => T): T {
  const statement = database.prepare(sql);

  try {
    return work(statement);
  } finally {
    statement.finalize?.();
  }
}

function run(database: SQLiteDatabase, sql: string, parameters: SQLiteParameter[] = []): unknown {
  return withStatement(database, sql, (statement) => statement.run(...parameters));
}

function get(database: SQLiteDatabase, sql: string, parameters: SQLiteParameter[] = []): SQLiteRow | undefined {
  return withStatement(database, sql, (statement) => statement.get(...parameters));
}

function all(database: SQLiteDatabase, sql: string, parameters: SQLiteParameter[] = []): readonly SQLiteRow[] {
  return withStatement(database, sql, (statement) => statement.all(...parameters));
}

function deleteExpired(database: SQLiteDatabase, name: string, table: string): void {
  run(
    database,
    `DELETE FROM ${RECORDS_TABLE}
     WHERE namespace = ? AND table_name = ? AND expires_at IS NOT NULL AND expires_at <= ?`,
    [name, table, Date.now()],
  );
}

function decodeLiveRecord<T extends object>(database: SQLiteDatabase, row: SQLiteRow): T | undefined {
  const stored = getStoredRow(row);

  if (isExpired(stored.expiresAt)) {
    run(database, `DELETE FROM ${RECORDS_TABLE} WHERE rowid = ?`, [stored.rowId]);

    return undefined;
  }

  return decodeJson(stored.json) as T;
}

function getAllLive<T extends object>(
  database: SQLiteDatabase,
  name: string,
  table: string,
  filterSql = '',
  filterParameters: SQLiteParameter[] = [],
): T[] {
  deleteExpired(database, name, table);

  const records = all(
    database,
    `SELECT rowid AS row_id, expires_at, value_json
     FROM ${RECORDS_TABLE}
     WHERE namespace = ? AND table_name = ?${filterSql}
     ORDER BY rowid`,
    [name, table, ...filterParameters],
  );

  return records.flatMap((row) => {
    const record = decodeLiveRecord<T>(database, row);

    return record === undefined ? [] : [record];
  });
}

function createDirectCore<S extends AnySchema, K extends keyof S & string>(
  database: SQLiteDatabase,
  name: string,
  schema: S,
): StorageBackend<S, K> {
  const getRecord = <T extends K>(table: T, key: KeyOf<S, T>): RecordOf<S, T> | undefined => {
    const columns = toKeyColumns(key);
    const row = get(
      database,
      `SELECT rowid AS row_id, expires_at, value_json
       FROM ${RECORDS_TABLE}
       WHERE namespace = ? AND table_name = ? AND key_tag = ?`,
      [name, table, columns.encoded],
    );

    return row === undefined ? undefined : decodeLiveRecord<RecordOf<S, T>>(database, row);
  };

  const core: StorageBackend<S, K> = {
    async clear(table) {
      run(database, `DELETE FROM ${RECORDS_TABLE} WHERE namespace = ? AND table_name = ?`, [name, table]);
    },
    async count(table) {
      deleteExpired(database, name, table);

      const row = get(
        database,
        `SELECT COUNT(*) AS count FROM ${RECORDS_TABLE} WHERE namespace = ? AND table_name = ?`,
        [name, table],
      );
      const count = row?.count;

      if (typeof count !== 'number') throw new VaultError('SQLite storage returned an invalid count');

      return count;
    },
    async delete(table, key) {
      const live = getRecord(table, key) !== undefined;
      const columns = toKeyColumns(key);

      run(database, `DELETE FROM ${RECORDS_TABLE} WHERE namespace = ? AND table_name = ? AND key_tag = ?`, [
        name,
        table,
        columns.encoded,
      ]);

      return live;
    },
    async deleteMany(table, keys) {
      let deleted = 0;

      for (const key of keys) {
        if (await core.delete(table, key)) deleted += 1;
      }

      return deleted;
    },
    async get(table, key) {
      return getRecord(table, key);
    },
    async getAll(table) {
      return getAllLive<RecordOf<S, typeof table>>(database, name, table);
    },
    async getAllKeys(table) {
      return (await core.getAll(table)).map((record) => getRecordKey(schema, table, record));
    },
    async getByKeyRange(table, range) {
      if (range.type === 'eq')
        return getAllLive<RecordOf<S, typeof table>>(database, name, table, ' AND key_tag = ?', [
          toKeyColumns(range.value as KeyOf<S, typeof table>).encoded,
        ]);

      if (range.type === 'between') {
        if (
          typeof range.lower !== typeof range.upper ||
          (typeof range.lower !== 'number' && typeof range.lower !== 'string')
        ) {
          return getAllLive<RecordOf<S, typeof table>>(database, name, table);
        }

        const column = typeof range.lower === 'number' ? 'key_number' : 'key_string';

        return getAllLive<RecordOf<S, typeof table>>(
          database,
          name,
          table,
          ` AND key_kind = ? AND ${column} >= ? AND ${column} <= ?`,
          [typeof range.lower === 'number' ? 'number' : 'string', range.lower, range.upper as string | number],
        );
      }

      return getAllLive<RecordOf<S, typeof table>>(
        database,
        name,
        table,
        ' AND key_kind = ? AND substr(key_string, 1, length(?)) = ?',
        ['string', range.prefix, range.prefix],
      );
    },
    async getMany(table, keys) {
      return keys.map((key) => getRecord(table, key));
    },
    async getRawCount(table) {
      const row = get(
        database,
        `SELECT COUNT(*) AS count FROM ${RECORDS_TABLE} WHERE namespace = ? AND table_name = ?`,
        [name, table],
      );
      const count = row?.count;

      if (typeof count !== 'number') throw new VaultError('SQLite storage returned an invalid count');

      return count;
    },
    async has(table, key) {
      return getRecord(table, key) !== undefined;
    },
    async pruneAllExpired() {
      const results: Record<string, number> = {};

      for (const table of Object.keys(schema)) {
        results[table] = await core.pruneExpiredInTable(table as K);
      }

      return results;
    },
    async pruneExpiredInTable(table) {
      const before = await core.getRawCount!(table);

      deleteExpired(database, name, table);

      return before - (await core.getRawCount!(table));
    },
    async put(table, value, ttl) {
      const key = getRecordKey(schema, table, value);
      const columns = toKeyColumns(key);
      const expiresAt = ttl === undefined ? null : Date.now() + ttl;

      run(
        database,
        `INSERT INTO ${RECORDS_TABLE}
          (namespace, table_name, key_tag, key_kind, key_number, key_string, value_json, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(namespace, table_name, key_tag) DO UPDATE SET
           key_kind = excluded.key_kind,
           key_number = excluded.key_number,
           key_string = excluded.key_string,
           value_json = excluded.value_json,
           expires_at = excluded.expires_at`,
        [name, table, columns.encoded, columns.kind, columns.number, columns.string, encodeJson(value), expiresAt],
      );
    },
    async putAll(table, values, ttl) {
      for (const value of values) {
        await core.put(table, value, ttl);
      }
    },
  };

  return core;
}

/**
 * Creates a SQLite-backed Vault store. The connection is caller-owned unless
 * `closeOnDispose` is explicitly enabled.
 */
export function createSQLite<S extends AnySchema>(options: SQLiteVaultOptions<S>): SQLiteVaultStore<S> {
  const { closeOnDispose = false, database, logger, name, onMetrics, schema, validators } = options;

  assertName(name);

  const state = getConnectionState(database);
  const namespaceReady = state.executor.run(async () => {
    await state.initialized;
    initializeNamespace(database, name);
  });
  let ownListener: ConnectionListener | undefined;

  const directCore = createDirectCore(database, name, schema);
  const withConnection = <T>(work: () => Promise<T>): Promise<T> =>
    state.executor.run(async () => {
      await state.initialized;
      await namespaceReady;

      return work();
    });
  const guardedCore = Object.fromEntries(
    Object.entries(directCore).map(([method, implementation]) => [
      method,
      (...arguments_: unknown[]) => {
        if (state.batchActive) {
          throw new VaultError(
            'cannot call a SQLite store sharing this connection from batch(); use the transaction context instead',
          );
        }

        return withConnection(() => (implementation as (...args: unknown[]) => Promise<unknown>)(...arguments_));
      },
    ]),
  ) as StorageBackend<S>;

  let batch: BatchImpl<S> | undefined;
  const adapter = buildAdapterOps(schema, guardedCore, {
    logger,
    onCrossTabMessage(notify) {
      const listener: ConnectionListener = (eventName, table) => {
        if (eventName === name && Object.hasOwn(schema, table)) notify(table as keyof S & string);
      };

      ownListener = listener;
      state.listeners.add(listener);

      return () => {
        state.listeners.delete(listener);

        if (ownListener === listener) ownListener = undefined;
      };
    },
    onMetrics,
    onMutation(table) {
      for (const listener of state.listeners) {
        if (listener !== ownListener) listener(name, table);
      }
    },
    onTransactions: (deps) => {
      batch = async (tables, fn) => {
        assertBatchTables(tables);

        if (state.batchActive) {
          throw new VaultError(
            'cannot call a SQLite store sharing this connection from batch(); use the transaction context instead',
          );
        }

        return state.executor.run(async () => {
          await state.initialized;
          await namespaceReady;

          const dirtyTables = new Set<keyof S & string>();
          const txCore = createDirectCore<S, keyof S & string>(database, name, schema);
          const tx = buildTxContext(
            schema,
            txCore,
            (table) => dirtyTables.add(table),
            deps.validate,
            new Set<string>(tables),
          );
          let transactionStarted = false;
          let committed = false;

          state.batchActive = true;

          try {
            database.exec('BEGIN IMMEDIATE');
            transactionStarted = true;

            const result = await fn(tx);

            database.exec('COMMIT');
            committed = true;

            for (const table of dirtyTables) {
              deps.notifyMutation(table);
            }

            return result;
          } catch (error) {
            if (transactionStarted && !committed) {
              try {
                database.exec('ROLLBACK');
              } catch (rollbackError) {
                throw new VaultError('SQLite batch rollback failed', { cause: rollbackError });
              }
            }

            throw error;
          } finally {
            state.batchActive = false;
          }
        });
      };
    },
    schema,
    validators,
  });

  if (!batch) throw new VaultError('SQLite transaction capability was not initialized');

  const store: SQLiteVaultStore<S> = {
    ...adapter,
    batch,
    iterate<K extends keyof S & string>(table: K): AsyncIterable<RecordOf<S, K>> {
      if (adapter.disposed) throw new VaultDisposedError(`"${name}" is disposed`);

      return {
        [Symbol.asyncIterator](): AsyncIterator<RecordOf<S, K>> {
          let completed = false;
          let lastRowId = 0;
          let lease: (() => void) | undefined;
          let rows: readonly SQLiteRow[] = [];
          let index = 0;

          const release = (): void => {
            lease?.();
            lease = undefined;
          };
          const loadNextPage = (): void => {
            rows = all(
              database,
              `SELECT rowid AS row_id, expires_at, value_json
               FROM ${RECORDS_TABLE}
               WHERE namespace = ? AND table_name = ? AND rowid > ?
               ORDER BY rowid
               LIMIT ?`,
              [name, table, lastRowId, ITERATION_PAGE_SIZE],
            );
            index = 0;
          };

          return {
            async next(): Promise<IteratorResult<RecordOf<S, K>>> {
              if (completed) return { done: true, value: undefined };

              if (state.batchActive) {
                throw new VaultError(
                  'cannot call a SQLite store sharing this connection from batch(); use the transaction context instead',
                );
              }

              try {
                if (!lease) {
                  lease = await state.executor.acquire();
                  await state.initialized;
                  await namespaceReady;
                }

                while (true) {
                  if (index >= rows.length) {
                    loadNextPage();

                    if (rows.length === 0) {
                      completed = true;
                      release();

                      return { done: true, value: undefined };
                    }
                  }

                  const row = rows[index++];
                  const stored = getStoredRow(row);

                  lastRowId = stored.rowId;

                  const value = decodeLiveRecord<RecordOf<S, K>>(database, row);

                  if (value !== undefined) return { done: false, value };
                }
              } catch (error) {
                completed = true;
                release();

                throw error;
              }
            },
            async return(value?: unknown): Promise<IteratorResult<RecordOf<S, K>>> {
              completed = true;
              release();

              return { done: true, value: value as RecordOf<S, K> };
            },
            async throw(error?: unknown): Promise<IteratorResult<RecordOf<S, K>>> {
              completed = true;
              release();

              throw error;
            },
          };
        },
      };
    },
  };

  if (closeOnDispose) {
    const dispose = store.dispose.bind(store);
    let closePromise: Promise<void> | undefined;

    store.dispose = async (): Promise<void> => {
      await dispose();
      closePromise ??= state.executor.run(() => database.close?.());
      await closePromise;
    };
    store[Symbol.asyncDispose] = async (): Promise<void> => {
      await store.dispose();
    };
  }

  return store;
}
