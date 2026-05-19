import { createMemory, table, type Adapter, type MetricsEvent } from '../index';

type User = { age?: number; city?: string; id: number; name?: string };

const userSchema = { users: table<User>('id') };

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('Memory adapter', () => {
  let db: Adapter<typeof userSchema>;

  beforeEach(() => {
    db = createMemory({ schema: userSchema });
  });

  test('put/get/delete roundtrip', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    expect(await db.delete('users', 1)).toBe(true);
    expect(await db.get('users', 1)).toBeUndefined();
  });

  test('putAll/getAll/deleteAll', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    expect(await db.getAll('users')).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    await db.deleteAll('users');
    expect(await db.getAll('users')).toEqual([]);
  });

  test('has reflects key existence', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.has('users', 1)).toBe(true);
    expect(await db.has('users', 2)).toBe(false);
  });

  test('count returns live records and clear empties table', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    expect(await db.count('users')).toBe(2);

    await db.clear('users');

    expect(await db.count('users')).toBe(0);
  });

  test('update patches existing records', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.update('users', 1, { city: 'Paris' })).toEqual({ city: 'Paris', id: 1, name: 'Alice' });
    expect(await db.update('users', 99, { city: 'Berlin' })).toBeUndefined();
  });

  test('upsert inserts when record does not exist', async () => {
    const result = await db.upsert('users', 1, () => ({ id: 1, name: 'Alice' }));

    expect(result).toEqual({ id: 1, name: 'Alice' });
    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
  });

  test('upsert merges when record exists', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    const result = await db.upsert('users', 1, (existing) => ({ ...existing!, city: 'Paris' }));

    expect(result).toEqual({ city: 'Paris', id: 1, name: 'Alice' });
  });

  test('upsert rejects key mismatch', async () => {
    await expect(db.upsert('users', 1, () => ({ id: 2, name: 'Alice' }))).rejects.toThrow('key');
  });

  test('query.delete removes matching records', async () => {
    await db.putAll('users', [
      { age: 25, id: 1, name: 'Alice' },
      { age: 30, id: 2, name: 'Bob' },
      { age: 35, id: 3, name: 'Charlie' },
    ]);

    const deleted = await db
      .query('users')
      .filter((u) => (u.age ?? 0) >= 30)
      .delete();

    expect(deleted).toBe(2);
    expect(await db.getAll('users')).toEqual([{ age: 25, id: 1, name: 'Alice' }]);
  });

  test('batch defers notifications until completion', async () => {
    const snapshots: User[][] = [];

    db.observe('users', (rows) => {
      snapshots.push([...rows]);
    });

    await db.batch(['users'], async (tx) => {
      await tx.put('users', { id: 1, name: 'Alice' });
      await tx.put('users', { id: 2, name: 'Bob' });
    });

    await Promise.resolve();

    // Should have received exactly ONE notification (after batch), not two
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  });

  test('batch supports upsert', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    await db.batch(['users'], async (tx) => {
      await tx.upsert('users', 1, (existing) => ({ ...existing!, city: 'Paris' }));
    });

    expect(await db.get('users', 1)).toEqual({ city: 'Paris', id: 1, name: 'Alice' });
  });

  test('debug returns live and expired counts', async () => {
    await db.put('users', { id: 1, name: 'Alice' });
    await db.put('users', { id: 2, name: 'Bob' }, 1);

    await delay(5);

    const info = await db.debug();
    const userTable = info.tables.find((t) => t.name === 'users');

    expect(userTable?.recordCount).toBe(1);
    expect(userTable?.expiredCount).toBe(1);
  });

  test('schema defaultTtl is applied automatically', async () => {
    const ttlSchema = { sessions: table<{ token: string }>('token').ttl(1) };
    const db2 = createMemory({ schema: ttlSchema });

    await db2.put('sessions', { token: 'abc' }); // uses defaultTtl

    await delay(5);

    expect(await db2.get('sessions', 'abc')).toBeUndefined();
  });

  test('onMetrics callback receives events', async () => {
    const events: MetricsEvent[] = [];
    const db2 = createMemory({ onMetrics: (e) => events.push(e), schema: userSchema });

    await db2.put('users', { id: 1, name: 'Alice' });
    await db2.get('users', 1);

    expect(events.some((e) => e.operation === 'put' && e.table === 'users')).toBe(true);
    expect(events.some((e) => e.operation === 'get' && e.table === 'users')).toBe(true);
  });

  test('ttl expiration removes entries lazily', async () => {
    await db.put('users', { id: 1, name: 'Alice' }, 1);
    await delay(5);

    expect(await db.get('users', 1)).toBeUndefined();
    expect(await db.has('users', 1)).toBe(false);
  });

  test('observe supports initialEmit option', async () => {
    const snapshots: User[][] = [];
    const stop = db.observe(
      'users',
      (rows) => {
        snapshots.push(rows);
      },
      { initialEmit: false },
    );

    await db.put('users', { id: 1, name: 'Alice' });
    await Promise.resolve();
    stop();

    expect(snapshots).toEqual([[{ id: 1, name: 'Alice' }]]);
  });

  test('instances are isolated', async () => {
    const other = createMemory({ schema: userSchema });

    await db.put('users', { id: 1, name: 'Alice' });

    expect(await other.getAll('users')).toEqual([]);
  });
});
