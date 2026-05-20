import { createMemory, table, ttl, type Adapter, type MetricsEvent } from '../index';

type User = { age?: number; city?: string; id: number; name?: string };
type Post = { id: number; title: string; userId: number };

const userSchema = { users: table<User>('id') };
const multiSchema = {
  posts: table<Post>('id'),
  users: table<User>('id'),
};

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

  test('putAll/getAll/clear', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    expect(await db.getAll('users')).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    await db.clear('users');
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

  test('update rejects key mutation attempt', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    await expect(db.update('users', 1, { id: 2 } as Partial<User>)).rejects.toThrow('key');
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

    db.observe(
      'users',
      (rows) => {
        snapshots.push([...rows]);
      },
      { immediate: false },
    );

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

  test('batch rejects access to tables outside its declared scope', async () => {
    const multi = createMemory({ schema: multiSchema });

    await expect(
      multi.batch(['users'], async (tx) => {
        await tx.put('posts' as any, { id: 1, title: 'Hello', userId: 1 });
      }),
    ).rejects.toThrow('batch scope');

    expect(await multi.getAll('posts')).toEqual([]);
    multi.dispose();
  });

  test('batch requires at least one table', async () => {
    await expect(db.batch([], async () => undefined)).rejects.toThrow('at least one table');
  });

  test('debug returns live and expired counts', async () => {
    await db.put('users', { id: 1, name: 'Alice' });
    await db.put('users', { id: 2, name: 'Bob' }, ttl.ms(1));

    await delay(5);

    const info = await db.debug();
    const userTable = info.tables.find((t) => t.name === 'users');

    expect(userTable?.recordCount).toBe(1);
    expect(userTable?.expiredCount).toBe(1);
  });

  test('schema defaultTtl is applied automatically', async () => {
    const ttlSchema = { sessions: table<{ token: string }>('token').ttl(ttl.ms(1)) };
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

  test('onMetrics emits iterate event after full iteration', async () => {
    const events: MetricsEvent[] = [];
    const db2 = createMemory({ onMetrics: (e) => events.push(e), schema: userSchema });

    await db2.put('users', { id: 1, name: 'Alice' });
    await db2.put('users', { id: 2, name: 'Bob' });

    const results: User[] = [];

    for await (const r of db2.iterate('users')) {
      results.push(r);
    }

    expect(results).toHaveLength(2);
    expect(events.some((e) => e.operation === 'iterate' && e.table === 'users')).toBe(true);
  });

  test('onMetrics emits query and queryDelete events for query().delete()', async () => {
    const events: MetricsEvent[] = [];
    const db2 = createMemory({ onMetrics: (e) => events.push(e), schema: userSchema });

    await db2.put('users', { id: 1, name: 'Alice' });
    await db2.put('users', { id: 2, name: 'Bob' });

    const deleted = await db2
      .query('users')
      .filter((u) => u.id === 1)
      .delete();

    expect(deleted).toBe(1);
    expect(events.some((e) => e.operation === 'query' && e.table === 'users')).toBe(true);
    expect(events.some((e) => e.operation === 'queryDelete' && e.table === 'users')).toBe(true);
  });

  test('clear on empty table does not trigger observers', async () => {
    const snapshots: User[][] = [];
    const stop = db.observe('users', (rows) => snapshots.push(rows), { immediate: false });

    await db.clear('users'); // table is already empty

    await Promise.resolve();
    stop();

    expect(snapshots).toHaveLength(0);
  });

  test('ttl expiration removes entries lazily', async () => {
    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1));
    await delay(5);

    expect(await db.get('users', 1)).toBeUndefined();
    expect(await db.has('users', 1)).toBe(false);
  });

  test('observe emits initial snapshot by default', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    const snapshots: User[][] = [];
    const stop = db.observe('users', (rows) => {
      snapshots.push(rows);
    });

    await Promise.resolve();
    stop();

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('observe supports immediate option', async () => {
    const snapshots: User[][] = [];
    const stop = db.observe(
      'users',
      (rows) => {
        snapshots.push(rows);
      },
      { immediate: false },
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

  test('listener errors do not block other observers', async () => {
    const received: User[][] = [];

    db.observe(
      'users',
      () => {
        throw new Error('bad listener');
      },
      { immediate: false },
    );
    db.observe(
      'users',
      (rows) => {
        received.push(rows);
      },
      { immediate: false },
    );

    await db.put('users', { id: 1, name: 'Alice' });
    await Promise.resolve();

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('dispose prevents further observations', async () => {
    db.dispose();

    expect(() => db.observe('users', () => {})).toThrow('disposed');
  });
});
