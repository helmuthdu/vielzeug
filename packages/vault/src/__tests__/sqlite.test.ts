// @vitest-environment node

import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { count, deleteMany, getMany, type KeyValueVaultStore, table, ttl, VaultError, validatorCodec } from '../index';
import { createSQLite } from '../sqlite';

type User = { id: number | string; name: string; role?: string };

const schema = { users: table<User>('id') };
const codecs = { users: validatorCodec({ parse: (v) => v as User }) };
const databases: DatabaseSync[] = [];

function createDatabase(): DatabaseSync {
  const database = new DatabaseSync(':memory:');

  databases.push(database);

  return database;
}

function createStore(database = createDatabase()) {
  return createSQLite({ codecs, database, name: 'app', schema });
}

afterEach(() => {
  vi.useRealTimers();

  for (const database of databases.splice(0)) {
    database.close();
  }
});

describe('SQLite DocumentVaultStore', () => {
  test('persists records with distinct numeric and string keys across stores', async () => {
    const database = createDatabase();
    const writer = createStore(database);
    const reader = createStore(database);

    await writer.putAll('users', [
      { id: 1, name: 'Ada' },
      { id: '1', name: 'Grace' },
    ]);

    await expect(getMany(reader as unknown as KeyValueVaultStore<typeof schema>, 'users', ['1', 1])).resolves.toEqual([
      { id: '1', name: 'Grace' },
      { id: 1, name: 'Ada' },
    ]);
    await expect(count(reader as unknown as KeyValueVaultStore<typeof schema>, 'users')).resolves.toBe(2);
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

    (await store.count) ? null : null; // touch store to init
    await store.getAll('users');
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

  test('allows store operations while an iterator is active', async () => {
    const store = createStore();
    await store.putAll('users', [
      { id: 1, name: 'Ada' },
      { id: 2, name: 'Grace' },
    ]);
    const iterator = store.iterate('users')[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toEqual({ done: false, value: { id: 1, name: 'Ada' } });
    const read = await Promise.race([
      store.get('users', 2),
      new Promise<'blocked'>((resolve) => setTimeout(() => resolve('blocked'), 100)),
    ]);
    await iterator.return?.();

    expect(read).toEqual({ id: 2, name: 'Grace' });
  });

  test('keeps caller-owned connections open unless closeOnDispose is enabled', async () => {
    const callerOwned = createDatabase();
    const store = createStore(callerOwned);

    await store.dispose();
    expect(store.disposed).toBe(true);
    await expect(store.batch(['users'], async () => undefined)).rejects.toThrow('disposed');
    expect(callerOwned.prepare('SELECT 1 AS value').get()).toEqual({ value: 1 });

    const closable = createDatabase();
    const close = vi.fn(() => closable.close());
    const closingStore = createSQLite({
      closeOnDispose: true,
      codecs,
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

    await store.getAll('users');
    database
      .prepare(
        `INSERT INTO "__vielzeug_vault_records"
          (namespace, table_name, key_tag, key_kind, key_number, key_string, value_json, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run('app', 'users', 'n:1', 'number', 1, null, '{invalid', null);

    await expect(store.get('users', 1)).rejects.toBeInstanceOf(VaultError);
  });

  test('putAll inside batch() commits atomically without nested-transaction error', async () => {
    const store = createStore();

    await store.batch(['users'], async (tx) => {
      await tx.putAll('users', [
        { id: 1, name: 'Ada' },
        { id: 2, name: 'Grace' },
      ]);
    });

    await expect(store.getAll('users')).resolves.toEqual([
      { id: 1, name: 'Ada' },
      { id: 2, name: 'Grace' },
    ]);
  });

  test('accepts records with shared subtree references (DAG, not circular)', async () => {
    const itemSchema = { items: table<{ id: number; a: { x: number }; b: { x: number } }>('id') };
    const itemCodecs = {
      items: validatorCodec({ parse: (v) => v as { id: number; a: { x: number }; b: { x: number } } }),
    };
    const store = createSQLite({ codecs: itemCodecs, database: createDatabase(), name: 'dag', schema: itemSchema });
    const shared = { x: 1 };

    await store.put('items', { a: shared, b: shared, id: 1 });
    await expect(store.get('items', 1)).resolves.toEqual({ a: { x: 1 }, b: { x: 1 }, id: 1 });
  });

  test('deleteMany chunks correctly for >996 keys', async () => {
    const bigSchema = { items: table<{ id: number }>('id') };
    const bigCodecs = { items: validatorCodec({ parse: (v) => v as { id: number } }) };
    const store = createSQLite({ codecs: bigCodecs, database: createDatabase(), name: 'big', schema: bigSchema });
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));

    await store.putAll('items', items);
    const deleted = await deleteMany(
      store as unknown as KeyValueVaultStore<typeof bigSchema>,
      'items',
      items.map((i) => i.id),
    );

    expect(deleted).toBe(1000);
  });

  test('runs bound read-modify-write helpers atomically', async () => {
    const store = createStore();
    await store.put('users', { id: 1, name: 'counter', role: '0' });

    await Promise.all([
      store.upsert('users', 1, (current) => ({ ...current!, role: String(Number(current?.role ?? 0) + 1) })),
      store.upsert('users', 1, (current) => ({ ...current!, role: String(Number(current?.role ?? 0) + 1) })),
    ]);

    await expect(store.get('users', 1)).resolves.toMatchObject({ role: '2' });
  });

  test('provides bound helpers and queries inside transactions', async () => {
    const store = createStore();

    await store.batch(['users'], async (tx) => {
      await tx.upsert('users', 1, () => ({ id: 1, name: 'Ada', role: 'admin' }));
      await tx.upsert('users', 2, () => ({ id: 2, name: 'Grace', role: 'viewer' }));
      await expect(tx.query('users').equals('role', 'admin').count()).resolves.toBe(1);
      await expect(tx.query('users').equals('role', 'viewer').delete()).resolves.toBe(1);
    });

    await expect(store.getAll('users')).resolves.toEqual([{ id: 1, name: 'Ada', role: 'admin' }]);
  });

  test('rejects transaction context use after batch completion', async () => {
    const store = createStore();
    let leaked: Parameters<Parameters<typeof store.batch>[1]>[0] | undefined;

    await store.batch(['users'], async (tx) => {
      leaked = tx;
    });

    await expect(leaked?.put('users', { id: 1, name: 'late' })).rejects.toThrow('transaction context');
    await expect(store.get('users', 1)).resolves.toBeUndefined();
  });

  test('supports codecs whose encoded representation is a JSON scalar', async () => {
    type Item = { id: number };
    const itemSchema = { items: table<Item>('id') };
    const store = createSQLite({
      codecs: {
        items: {
          decode: (value) => ({ id: Number(value) }),
          encode: (value) => String(value.id),
        },
      },
      database: createDatabase(),
      name: 'scalar-codec',
      schema: itemSchema,
    });

    await store.put('items', { id: 1 });
    await expect(store.get('items', 1)).resolves.toEqual({ id: 1 });
  });

  test('requires codecs for durable persistence', () => {
    expect(() => createSQLite({ database: createDatabase(), name: 'should-fail', schema } as never)).toThrow(
      'codecs are required',
    );
  });
});
