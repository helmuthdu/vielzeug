import {
  assertBatchTables,
  batchScopeGuard,
  buildDocumentStore,
  buildOperations,
  type StorageBackend,
} from '../adapter-core';
import { decodeRecord, encodeRecord } from '../codec';
import { VaultDisposedError, VaultError } from '../errors';
import { encodeVaultKey, getRecordKey } from '../internal';
import { isExpired } from '../ttl';
import type {
  AnySchema,
  CodecInput,
  DocumentVaultStore,
  DurableStoreOptions,
  KeyOf,
  RecordOf,
  TransactionContext,
} from '../types';

export type { TransactionContext };

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
  get(...parameters: SQLiteParameter[]): SQLiteRow | null | undefined;
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

export type SQLiteVaultOptions<S extends AnySchema> = DurableStoreOptions<S> & {
  /** Closes the caller-provided connection during store disposal when true. */
  closeOnDispose?: boolean;
  database: SQLiteDatabase;
  /** Namespace that isolates this store's records in the shared connection. */
  name: string;
};

type ConnectionState = {
  batchActive: boolean;
  executor: ConnectionExecutor;
  initialized: Promise<void>;
  listeners: Set<ConnectionListener>;
};
type ConnectionListener = (name: string, table: string) => void;
type StoredRow = { expiresAt: number | undefined; json: string; rowId: number };
/** The direct core implements every backend operation except lazy iteration. */
type SqliteCore<S extends AnySchema, K extends keyof S & string> = StorageBackend<S, K> & {
  deleteMany<T extends K>(table: T, keys: readonly KeyOf<S, T>[]): Promise<number>;
  getMany<T extends K>(table: T, keys: readonly KeyOf<S, T>[]): Promise<Array<RecordOf<S, T> | undefined>>;
  pruneAllExpired(): Promise<Record<string, number>>;
};

const connectionStates = new WeakMap<SQLiteDatabase, ConnectionState>();
const RECORDS_TABLE = '"__vielzeug_vault_records"';
const METADATA_TABLE = '"__vielzeug_vault_metadata"';
const STORAGE_FORMAT_VERSION = 2;
const ITERATION_PAGE_SIZE = 100;
const UPSERT_SQL = `INSERT INTO ${RECORDS_TABLE}
  (namespace, table_name, key_tag, value_json, expires_at)
 VALUES (?, ?, ?, ?, ?)
 ON CONFLICT(namespace, table_name, key_tag) DO UPDATE SET
   value_json = excluded.value_json,
   expires_at = excluded.expires_at`;

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
        value_json TEXT NOT NULL,
        expires_at INTEGER,
        PRIMARY KEY (namespace, table_name, key_tag)
      );
      CREATE INDEX IF NOT EXISTS "__vielzeug_vault_records_expiration"
        ON ${RECORDS_TABLE} (namespace, table_name, expires_at);
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

  if (seen.has(value as object)) {
    throw new VaultError(`SQLite serialization failed at ${path}: circular references are not supported`);
  }

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

  seen.add(value as object);

  for (const [key, nested] of Object.entries(value)) {
    assertJsonValue(nested, seen, `${path}.${key}`);
  }

  seen.delete(value);
}

function encodeJson(value: unknown): string {
  assertJsonValue(value, new Set(), 'record');

  return JSON.stringify(value);
}

/** Returns `undefined` for unparseable JSON so callers can evict the corrupt row. */
function decodeJson(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch {
    return undefined;
  }
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
  return withStatement(database, sql, (statement) => statement.get(...parameters) ?? undefined);
}

function all(database: SQLiteDatabase, sql: string, parameters: SQLiteParameter[] = []): readonly SQLiteRow[] {
  return withStatement(database, sql, (statement) => statement.all(...parameters));
}

/**
 * Decodes a stored row, self-healing: expired or unparseable rows are deleted
 * and reported as missing, matching the Web Storage adapter. Codec rejections
 * (schema drift on readable data) still throw so they stay visible.
 */
function decodeRow<S extends AnySchema, K extends keyof S & string>(
  database: SQLiteDatabase,
  table: K,
  codec: CodecInput<RecordOf<S, K>>,
  stored: StoredRow,
): RecordOf<S, K> | undefined {
  const decoded = isExpired(stored.expiresAt) ? undefined : decodeJson(stored.json);

  if (decoded === undefined) {
    run(database, `DELETE FROM ${RECORDS_TABLE} WHERE rowid = ?`, [stored.rowId]);

    return undefined;
  }

  try {
    return decodeRecord(codec, decoded) as RecordOf<S, K>;
  } catch (err) {
    if (err instanceof VaultError) throw err;

    throw new VaultError(`validation failed for table "${String(table)}"`, { cause: err });
  }
}

function deleteExpired(database: SQLiteDatabase, name: string, table: string): number {
  const result = run(
    database,
    `DELETE FROM ${RECORDS_TABLE}
     WHERE namespace = ? AND table_name = ? AND expires_at IS NOT NULL AND expires_at <= ?`,
    [name, table, Date.now()],
  ) as { changes?: number } | undefined;

  return result?.changes ?? 0;
}

function createDirectCore<S extends AnySchema, K extends keyof S & string>(
  database: SQLiteDatabase,
  name: string,
  schema: S,
  codecs: NonNullable<DurableStoreOptions<S>['codecs']>,
  inTransaction = false,
): SqliteCore<S, K> {
  const getRecord = <T extends K>(table: T, key: KeyOf<S, T>): RecordOf<S, T> | undefined => {
    const row = get(
      database,
      `SELECT rowid AS row_id, expires_at, value_json
       FROM ${RECORDS_TABLE}
       WHERE namespace = ? AND table_name = ? AND key_tag = ?`,
      [name, table, encodeVaultKey(key)],
    );

    if (row === undefined) return undefined;

    return decodeRow(database, table, codecs[table], getStoredRow(row));
  };

  const core: SqliteCore<S, K> = {
    async clear(table) {
      run(database, `DELETE FROM ${RECORDS_TABLE} WHERE namespace = ? AND table_name = ?`, [name, table]);
    },
    async delete(table, key) {
      const result = run(
        database,
        `DELETE FROM ${RECORDS_TABLE}
         WHERE namespace = ? AND table_name = ? AND key_tag = ?
           AND (expires_at IS NULL OR expires_at > ?)`,
        [name, table, encodeVaultKey(key), Date.now()],
      ) as { changes?: number } | undefined;

      return (result?.changes ?? 0) > 0;
    },
    async deleteMany(table, keys) {
      let deleted = 0;
      const maxKeysPerChunk = 996;
      const encodedKeys = keys.map((key) => encodeVaultKey(key));

      for (let index = 0; index < encodedKeys.length; index += maxKeysPerChunk) {
        const chunk = encodedKeys.slice(index, index + maxKeysPerChunk);
        const placeholders = chunk.map(() => '?').join(', ');
        const result = run(
          database,
          `DELETE FROM ${RECORDS_TABLE}
           WHERE namespace = ? AND table_name = ? AND key_tag IN (${placeholders})
             AND (expires_at IS NULL OR expires_at > ?)`,
          [name, table, ...chunk, Date.now()],
        ) as { changes?: number } | undefined;
        deleted += result?.changes ?? 0;
      }

      return deleted;
    },
    async get(table, key) {
      return getRecord(table, key);
    },
    async getAll(table) {
      deleteExpired(database, name, table);

      const records = all(
        database,
        `SELECT rowid AS row_id, expires_at, value_json
         FROM ${RECORDS_TABLE}
         WHERE namespace = ? AND table_name = ?
         ORDER BY rowid`,
        [name, table],
      );

      return records.flatMap((row) => {
        const value = decodeRow(database, table, codecs[table], getStoredRow(row));

        return value === undefined ? [] : [value];
      });
    },
    async getMany(table, keys) {
      return keys.map((key) => getRecord(table, key));
    },
    async pruneAllExpired() {
      const results: Record<string, number> = {};

      for (const table of Object.keys(schema)) {
        results[table] = await core.pruneExpiredInTable(table as K);
      }

      return results;
    },
    async pruneExpiredInTable(table) {
      return deleteExpired(database, name, table);
    },
    async put(table, value, ttl) {
      const key = getRecordKey(schema, table, value);
      const expiresAt = ttl === undefined ? null : Date.now() + ttl;
      const encoded = encodeRecord(codecs[table], value as RecordOf<S, typeof table>);

      run(database, UPSERT_SQL, [name, table, encodeVaultKey(key), encodeJson(encoded), expiresAt]);
    },
    async putAll(table, values, ttl) {
      if (values.length === 0) return;

      const expiresAt = ttl === undefined ? null : Date.now() + ttl;
      const encodedJsonValues = values.map((v) =>
        encodeJson(encodeRecord(codecs[table], v as RecordOf<S, typeof table>)),
      );
      const encodedKeys = values.map((v) => encodeVaultKey(getRecordKey(schema, table, v)));

      const writeAll = () => {
        for (let i = 0; i < values.length; i++) {
          run(database, UPSERT_SQL, [name, table, encodedKeys[i], encodedJsonValues[i], expiresAt]);
        }
      };

      if (inTransaction) {
        writeAll();
        return;
      }

      database.exec('BEGIN');
      try {
        writeAll();
        database.exec('COMMIT');
      } catch (error) {
        try {
          database.exec('ROLLBACK');
        } catch (rollbackError) {
          throw new VaultError('SQLite putAll rollback failed', { cause: rollbackError });
        }
        throw error;
      }
    },
  };

  return core;
}

/**
 * Creates a SQLite-backed Vault store. The connection is caller-owned unless
 * `closeOnDispose` is explicitly enabled.
 */
export function createSQLite<S extends AnySchema>(options: SQLiteVaultOptions<S>): DocumentVaultStore<S> {
  const { closeOnDispose = false, database, name, schema, codecs } = options;

  assertName(name);

  if (!codecs) {
    throw new VaultError('createSQLite: codecs are required for durable persistence');
  }

  const state = getConnectionState(database);
  const namespaceReady = state.executor.run(async () => {
    await state.initialized;
    initializeNamespace(database, name);
  });
  let ownListener: ConnectionListener | undefined;

  const directCore = createDirectCore(database, name, schema, codecs);
  const withConnection = <T>(work: () => Promise<T>): Promise<T> =>
    state.executor.run(async () => {
      await state.initialized;
      await namespaceReady;

      return work();
    });

  // A synchronous SQLite connection cannot serve store calls while a batch
  // holds its transaction, so every guarded call checks the shared flag first.
  const guard = <A extends readonly unknown[], R>(work: (...args: A) => Promise<R>): ((...args: A) => Promise<R>) => {
    return (...args: A) => {
      if (state.batchActive) {
        throw new VaultError(
          'cannot call a SQLite store sharing this connection from batch(); use the transaction context instead',
        );
      }

      return withConnection(() => work(...args));
    };
  };

  const guardedCore: StorageBackend<S> = {
    clear: guard((table) => directCore.clear(table)),
    delete: guard((table, key) => directCore.delete(table, key)),
    deleteMany: guard((table, keys) => directCore.deleteMany(table, keys)),
    get: guard((table, key) => directCore.get(table, key)),
    getAll: guard((table) => directCore.getAll(table)),
    getMany: guard((table, keys) => directCore.getMany(table, keys)),
    pruneAllExpired: guard(() => directCore.pruneAllExpired()),
    pruneExpiredInTable: guard((table) => directCore.pruneExpiredInTable(table)),
    put: guard((table, value, ttl) => directCore.put(table, value, ttl)),
    putAll: guard((table, values, ttl) => directCore.putAll(table, values, ttl)),
  };

  const adapter = buildDocumentStore(schema, guardedCore, {
    codecs,
    createBatch: (deps) => async (tables, fn) => {
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
        const txCore = createDirectCore<S, keyof S & string>(database, name, schema, codecs, true);
        let contextActive = true;
        const tx = buildOperations(
          schema,
          txCore,
          (table) => dirtyTables.add(table),
          deps.validate,
          batchScopeGuard(tables, () => contextActive),
        );
        let transactionStarted = false;

        state.batchActive = true;

        try {
          database.exec('BEGIN IMMEDIATE');
          transactionStarted = true;

          const result = await fn(tx);

          database.exec('COMMIT');

          for (const table of dirtyTables) {
            deps.notifyMutation(table);
          }

          return result;
        } catch (error) {
          if (transactionStarted) {
            try {
              database.exec('ROLLBACK');
            } catch (rollbackError) {
              throw new VaultError('SQLite batch rollback failed', { cause: rollbackError });
            }
          }

          throw error;
        } finally {
          contextActive = false;
          state.batchActive = false;
        }
      });
    },
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
    onMutation(table) {
      for (const listener of state.listeners) {
        if (listener !== ownListener) listener(name, table);
      }
    },
    schema,
  });

  const store = Object.assign(adapter, {
    iterate<K extends keyof S & string>(table: K): AsyncIterable<RecordOf<S, K>> {
      if (adapter.disposed) throw new VaultDisposedError(`"${name}" is disposed`);

      return {
        [Symbol.asyncIterator](): AsyncIterator<RecordOf<S, K>> {
          let completed = false;
          let lastRowId = 0;
          let rows: RecordOf<S, K>[] = [];
          let index = 0;

          const loadNextPage = async (): Promise<boolean> => {
            const page = await state.executor.run(async () => {
              await state.initialized;
              await namespaceReady;
              const storedRows = all(
                database,
                `SELECT rowid AS row_id, expires_at, value_json
                 FROM ${RECORDS_TABLE}
                 WHERE namespace = ? AND table_name = ? AND rowid > ?
                 ORDER BY rowid
                 LIMIT ?`,
                [name, table, lastRowId, ITERATION_PAGE_SIZE],
              );
              const values: RecordOf<S, K>[] = [];

              for (const row of storedRows) {
                const stored = getStoredRow(row);
                lastRowId = stored.rowId;

                const value = decodeRow(database, table, codecs[table], stored);

                if (value !== undefined) values.push(value);
              }

              return { done: storedRows.length === 0, values };
            });

            rows = page.values;
            index = 0;
            return page.done;
          };

          return {
            async next(): Promise<IteratorResult<RecordOf<S, K>>> {
              if (completed) return { done: true, value: undefined };
              if (adapter.disposed) throw new VaultDisposedError(`"${name}" is disposed`);

              if (state.batchActive) {
                throw new VaultError(
                  'cannot call a SQLite store sharing this connection from batch(); use the transaction context instead',
                );
              }

              try {
                while (index >= rows.length) {
                  if (await loadNextPage()) {
                    completed = true;
                    return { done: true, value: undefined };
                  }
                }

                return { done: false, value: rows[index++] };
              } catch (error) {
                completed = true;
                throw error;
              }
            },
            async return(value?: unknown): Promise<IteratorResult<RecordOf<S, K>>> {
              completed = true;
              return { done: true, value: value as RecordOf<S, K> };
            },
            async throw(error?: unknown): Promise<IteratorResult<RecordOf<S, K>>> {
              completed = true;
              throw error;
            },
          };
        },
      };
    },
  });

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
