// @vitest-environment node

import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { table, ttl, VaultError } from '../index';
import { createSQLite } from '../sqlite';

type User = { id: number | string; name: string; role?: string };

const schema = { users: table<User>('id') };
const databases: DatabaseSync[] = [];

function createDatabase(): DatabaseSync {
  const database = new DatabaseSync(':memory:');

  databases.push(database);

  return database;
}

function createStore(database = createDatabase()) {
  return createSQLite({ database, name: 'app', schema });
}

afterEach(() => {
  vi.useRealTimers();

  for (const database of databases.splice(0)) {
    database.close();
  }
});

describe('SQLiteVaultStore', () => {
  test('persists records with distinct numeric and string keys across stores', async () => {
    const database = createDatabase();
    const writer = createStore(database);
    const reader = createStore(database);

    await writer.putAll('users', [
      { id: 1, name: 'Ada' },
      { id: '1', name: 'Grace' },
    ]);

    await expect(reader.getMany('users', ['1', 1])).resolves.toEqual([
      { id: '1', name: 'Grace' },
      { id: 1, name: 'Ada' },
    ]);
    await expect(reader.count('users')).resolves.toBe(2);
  });

  test('applies TTL expiry and prunes expired records', async () => {
    vi.useFakeTimers();

    const store = createStore();

    await store.put('users', { id: 1, name: 'Ada' }, ttl.ms(100));
    vi.advanceTimersByTime(100);

    await expect(store.get('users', 1)).resolves.toBeUndefined();
    await expect(store.pruneExpired()).resolves.toEqual({ users: 0 });
  });

  test('rejects records that cannot round-trip through JSON', async () => {
    const store = createStore();
    const circular: { id: number; self?: unknown } = { id: 1 };

    circular.self = circular;

    await expect(store.put('users', circular as User)).rejects.toThrow('circular references');
    await expect(store.put('users', { id: 2, name: 'Ada', role: BigInt(1) as unknown as string })).rejects.toThrow(
      'JSON-compatible',
    );
    await expect(store.put('users', { id: 3, name: 'Ada', role: new Date() as unknown as string })).rejects.toThrow(
      'plain object',
    );
  });

  test('pushes down primary-key equality, range, and prefix queries', async () => {
    const store = createStore();

    await store.putAll('users', [
      { id: 1, name: 'one' },
      { id: 2, name: 'two' },
      { id: 3, name: 'three' },
      { id: 'alpine', name: 'Alpine' },
      { id: 'alpha', name: 'Alpha' },
      { id: 'beta', name: 'Beta' },
    ]);

    await expect(store.query('users').equals('id', 2).toArray()).resolves.toEqual([{ id: 2, name: 'two' }]);
    await expect(store.query('users').between('id', 1, 2).toArray()).resolves.toEqual([
      { id: 1, name: 'one' },
      { id: 2, name: 'two' },
    ]);
    await expect(store.query('users').startsWith('id', 'alp').toArray()).resolves.toEqual([
      { id: 'alpine', name: 'Alpine' },
      { id: 'alpha', name: 'Alpha' },
    ]);
  });

  test('commits successful batches and rolls back callback failures', async () => {
    const store = createStore();

    await store.batch(['users'], async (tx) => {
      await tx.put('users', { id: 1, name: 'Ada' });
      await tx.put('users', { id: 2, name: 'Grace' });
    });

    await expect(
      store.batch(['users'], async (tx) => {
        await tx.put('users', { id: 3, name: 'Lin' });
        throw new Error('stop');
      }),
    ).rejects.toThrow('stop');

    await expect(store.getAll('users')).resolves.toEqual([
      { id: 1, name: 'Ada' },
      { id: 2, name: 'Grace' },
    ]);
  });

  test('rejects empty batch scopes consistently', async () => {
    const store = createStore();

    await expect(store.batch([], async () => undefined)).rejects.toThrow('declare at least one table');
  });

  test('rejects outer-store calls during a batch instead of deadlocking', async () => {
    const store = createStore();

    await expect(
      store.batch(['users'], async (tx) => {
        await tx.put('users', { id: 1, name: 'Ada' });
        await store.get('users', 1);
      }),
    ).rejects.toThrow('use the transaction context instead');

    await expect(store.get('users', 1)).resolves.toBeUndefined();
  });

  test('rejects outer-store calls from any store sharing the batch connection', async () => {
    const database = createDatabase();
    const writer = createStore(database);
    const reader = createStore(database);

    await expect(
      writer.batch(['users'], async (tx) => {
        await tx.put('users', { id: 1, name: 'Ada' });
        await reader.get('users', 1);
      }),
    ).rejects.toThrow('sharing this connection');

    await expect(reader.get('users', 1)).resolves.toBeUndefined();
  });

  test('recovers when SQLite rejects transaction startup', async () => {
    const database = createDatabase();
    const store = createStore(database);

    await store.count('users');
    database.exec('BEGIN IMMEDIATE');

    await expect(store.batch(['users'], async () => undefined)).rejects.toThrow('cannot start a transaction');

    database.exec('ROLLBACK');

    await store.put('users', { id: 1, name: 'Ada' });
    await expect(store.get('users', 1)).resolves.toEqual({ id: 1, name: 'Ada' });
  });

  test('notifies stores sharing a connection after committed writes', async () => {
    const database = createDatabase();
    const writer = createStore(database);
    const reader = createStore(database);
    const snapshots: User[][] = [];
    const stop = reader.observe('users', (records) => snapshots.push(records), { immediate: false });

    await writer.put('users', { id: 1, name: 'Ada' });

    await vi.waitFor(() => expect(snapshots).toEqual([[{ id: 1, name: 'Ada' }]]));
    stop();
  });

  test('iterates lazily and releases the connection lease after early completion', async () => {
    const store = createStore();

    await store.putAll(
      'users',
      Array.from({ length: 101 }, (_, id) => ({ id, name: `User ${String(id)}` })),
    );

    const iterator = store.iterate('users')[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toEqual({ done: false, value: { id: 0, name: 'User 0' } });
    await iterator.return?.();
    await store.put('users', { id: 200, name: 'Released' });

    await expect(store.get('users', 200)).resolves.toEqual({ id: 200, name: 'Released' });
  });

  test('keeps caller-owned connections open unless closeOnDispose is enabled', async () => {
    const callerOwned = createDatabase();
    const store = createStore(callerOwned);

    await store.dispose();
    expect(callerOwned.prepare('SELECT 1 AS value').get()).toEqual({ value: 1 });

    const closable = createDatabase();
    const close = vi.fn(() => closable.close());
    const closingStore = createSQLite({
      closeOnDispose: true,
      database: { close, exec: closable.exec.bind(closable), prepare: closable.prepare.bind(closable) },
      name: 'closing',
      schema,
    });

    await closingStore.dispose();
    await closingStore.dispose();

    expect(close).toHaveBeenCalledOnce();
    databases.splice(databases.indexOf(closable), 1);
  });

  test('rejects iteration after disposal', async () => {
    const store = createStore();

    await store.dispose();

    expect(() => store.iterate('users')).toThrow('disposed');
  });

  test('surfaces malformed stored JSON as a VaultError', async () => {
    const database = createDatabase();
    const store = createStore(database);

    await store.count('users');
    database
      .prepare(
        `INSERT INTO "__vielzeug_vault_records"
          (namespace, table_name, key_tag, key_kind, key_number, key_string, value_json, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run('app', 'users', 'n:1', 'number', 1, null, '{invalid', null);

    await expect(store.get('users', 1)).rejects.toBeInstanceOf(VaultError);
  });
});
