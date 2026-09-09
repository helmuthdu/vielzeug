import {
  assertBatchTables,
  type BatchImpl,
  buildDocumentStore,
  buildTxContext,
  type StorageBackend,
  withBatch,
} from '../adapter-core';
import { decodeRecord, encodeRecord } from '../codec';
import { VaultDisposedError, VaultError } from '../errors';
import { encodeVaultKey, getRecordKey } from '../internal';
import { isExpired } from '../ttl';
import type { AnySchema, DocumentVaultStore, DurableStoreOptions, KeyOf, RecordOf, TransactionContext } from '../types';

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

function decodeJson(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch (error) {
    if (error instanceof VaultError) throw error;

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
  return withStatement(database, sql, (statement) => statement.get(...parameters) ?? undefined);
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

function createDirectCore<S extends AnySchema, K extends keyof S & string>(
  database: SQLiteDatabase,
  name: string,
  schema: S,
  codecs: NonNullable<DurableStoreOptions<S>['codecs']>,
  inTransaction = false,
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

    if (row === undefined) return undefined;

    const stored = getStoredRow(row);

    if (isExpired(stored.expiresAt)) {
      run(database, `DELETE FROM ${RECORDS_TABLE} WHERE rowid = ?`, [stored.rowId]);

      return undefined;
    }

    try {
      const decoded = decodeJson(stored.json);

      return decodeRecord(codecs[table], decoded) as RecordOf<S, T>;
    } catch (err) {
      if (err instanceof VaultError) throw err;

      throw new VaultError(`validation failed for table "${String(table)}"`, { cause: err });
    }
  };

  const core: StorageBackend<S, K> = {
    async clear(table) {
      run(database, `DELETE FROM ${RECORDS_TABLE} WHERE namespace = ? AND table_name = ?`, [name, table]);
    },
    async delete(table, key) {
      const columns = toKeyColumns(key);
      const result = run(
        database,
        `DELETE FROM ${RECORDS_TABLE}
         WHERE namespace = ? AND table_name = ? AND key_tag = ?
           AND (expires_at IS NULL OR expires_at > ?)`,
        [name, table, columns.encoded, Date.now()],
      ) as { changes?: number } | undefined;

      return (result?.changes ?? 0) > 0;
    },
    async deleteMany(table, keys) {
      let deleted = 0;
      const maxKeysPerChunk = 996;
      const encodedKeys = keys.map((key) => toKeyColumns(key).encoded);

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
        const stored = getStoredRow(row);

        if (isExpired(stored.expiresAt)) {
          run(database, `DELETE FROM ${RECORDS_TABLE} WHERE rowid = ?`, [stored.rowId]);

          return [];
        }

        try {
          const decoded = decodeJson(stored.json);

          return [decodeRecord(codecs[table], decoded) as RecordOf<S, typeof table>];
        } catch (err) {
          if (err instanceof VaultError) throw err;

          throw new VaultError(`validation failed for table "${String(table)}"`, { cause: err });
        }
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
      const beforeRow = get(
        database,
        `SELECT COUNT(*) AS count FROM ${RECORDS_TABLE} WHERE namespace = ? AND table_name = ?`,
        [name, table],
      );
      const before = beforeRow?.count;

      if (typeof before !== 'number') throw new VaultError('SQLite storage returned an invalid count');

      deleteExpired(database, name, table);

      const afterRow = get(
        database,
        `SELECT COUNT(*) AS count FROM ${RECORDS_TABLE} WHERE namespace = ? AND table_name = ?`,
        [name, table],
      );
      const after = afterRow?.count;

      if (typeof after !== 'number') throw new VaultError('SQLite storage returned an invalid count');

      return before - after;
    },
    async put(table, value, ttl) {
      const key = getRecordKey(schema, table, value);
      const columns = toKeyColumns(key);
      const expiresAt = ttl === undefined ? null : Date.now() + ttl;
      const encoded = encodeRecord(codecs[table], value as RecordOf<S, typeof table>);

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
        [name, table, columns.encoded, columns.kind, columns.number, columns.string, encodeJson(encoded), expiresAt],
      );
    },
    async putAll(table, values, ttl) {
      if (values.length === 0) return;

      const expiresAt = ttl === undefined ? null : Date.now() + ttl;
      const encodedJsonValues = values.map((v) =>
        encodeJson(encodeRecord(codecs[table], v as RecordOf<S, typeof table>)),
      );
      const columnsList = values.map((v) => toKeyColumns(getRecordKey(schema, table, v)));

      const writeAll = () => {
        for (let i = 0; i < values.length; i++) {
          const columns = columnsList[i];
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
            [
              name,
              table,
              columns.encoded,
              columns.kind,
              columns.number,
              columns.string,
              encodedJsonValues[i],
              expiresAt,
            ],
          );
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
  ) as unknown as StorageBackend<S>;

  let batch: BatchImpl<S> | undefined;
  const adapter = buildDocumentStore(schema, guardedCore, {
    codecs,
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
          const txCore = createDirectCore<S, keyof S & string>(database, name, schema, codecs, true);
          let contextActive = true;
          const tx = buildTxContext(
            schema,
            txCore,
            (table) => dirtyTables.add(table),
            deps.validate,
            new Set<string>(tables),
            () => contextActive,
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
            contextActive = false;
            state.batchActive = false;
          }
        });
      };
    },
    schema,
  });

  if (!batch) throw new VaultError('SQLite transaction capability was not initialized');

  const batched = withBatch(adapter, batch, schema);
  const store = Object.assign(batched, {
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

                if (isExpired(stored.expiresAt)) {
                  run(database, `DELETE FROM ${RECORDS_TABLE} WHERE rowid = ?`, [stored.rowId]);
                  continue;
                }

                try {
                  values.push(decodeRecord(codecs[table], decodeJson(stored.json)) as RecordOf<S, K>);
                } catch (err) {
                  if (err instanceof VaultError) throw err;
                  throw new VaultError(`validation failed for table "${String(table)}"`, { cause: err });
                }
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
