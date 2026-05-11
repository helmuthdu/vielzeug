import { createCookie, table, ttl, type Adapter } from '../index';

type User = { age?: number; city?: string; id: number; name?: string };

const userSchema = { users: table<User>('id') };

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('Cookie adapter', () => {
  let db: Adapter<typeof userSchema>;

  beforeEach(() => {
    // Remove all cookies set by tests.
    for (const c of document.cookie.split(';')) {
      const name = c.trim().split('=')[0];

      if (name) document.cookie = `${name}=; Max-Age=0; path=/`;
    }

    db = createCookie({ dbName: 'CK', schema: userSchema });
  });

  test('put/get/delete/deleteAll/count', async () => {
    expect(await db.count('users')).toBe(0);

    await db.put('users', { id: 1, name: 'Alice' });
    await db.put('users', { id: 2, name: 'Bob' });

    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    expect(await db.getAll('users')).toHaveLength(2);
    expect(await db.count('users')).toBe(2);

    await db.delete('users', 1);
    expect(await db.get('users', 1)).toBeUndefined();

    await db.deleteAll('users');
    expect(await db.getAll('users')).toEqual([]);
  });

  test('has() returns correct results', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.has('users', 1)).toBe(true);
    expect(await db.has('users', 99)).toBe(false);
  });

  test('TTL expiry is respected', async () => {
    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1));
    await delay(5);

    expect(await db.get('users', 1)).toBeUndefined();
    expect(await db.count('users')).toBe(0);
  });

  test('putAll() writes all records', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    expect(await db.count('users')).toBe(2);
    expect(await db.get('users', 2)).toEqual({ id: 2, name: 'Bob' });
  });

  test('update() patches existing records', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.update('users', 1, { city: 'Paris' })).toEqual({ city: 'Paris', id: 1, name: 'Alice' });
    expect(await db.update('users', 99, { city: 'X' })).toBeUndefined();
  });

  test('getOrPut() returns existing or inserts fallback', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    const existing = await db.getOrPut('users', 1, { id: 1, name: 'Ignored' });
    const created = await db.getOrPut('users', 2, () => ({ id: 2, name: 'Bob' }));

    expect(existing).toEqual({ id: 1, name: 'Alice' });
    expect(created).toEqual({ id: 2, name: 'Bob' });
  });

  test('deleteWhere() removes matching records and returns count', async () => {
    await db.putAll('users', [
      { age: 20, id: 1, name: 'Alice' },
      { age: 35, id: 2, name: 'Bob' },
      { age: 40, id: 3, name: 'Charlie' },
    ]);

    const deleted = await db.deleteWhere('users', (u) => (u.age ?? 0) >= 35);

    expect(deleted).toBe(2);
    expect(await db.count('users')).toBe(1);
    expect(await db.get('users', 1)).toEqual({ age: 20, id: 1, name: 'Alice' });
  });

  test('query builder works over cookie-backed records', async () => {
    await db.put('users', { age: 25, id: 1, name: 'Alice' });
    await db.put('users', { age: 35, id: 2, name: 'Bob' });

    const r = await db.query('users').between('age', 26, 99).orderBy('age', 'asc').toArray();

    expect(r).toEqual([{ age: 35, id: 2, name: 'Bob' }]);
  });

  test('observe() fires on mutations', async () => {
    const snapshots: User[][] = [];
    const done = new Promise<void>((resolve) => {
      const stop = db.observe('users', (rows) => {
        snapshots.push(rows);

        if (snapshots.length === 2) {
          stop();
          resolve();
        }
      });
    });

    await db.put('users', { id: 1, name: 'Alice' });
    await done;

    expect(snapshots[0]).toEqual([]);
    expect(snapshots[1]).toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('two instances sharing the same dbName see the same data', async () => {
    const db2 = createCookie({ dbName: 'CK', schema: userSchema });

    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db2.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
  });

  test('corrupted cookie entries are removed lazily on read', async () => {
    document.cookie = 'CK~users~corrupt=NOTJSON; path=/';

    expect(await db.get('users', 'corrupt' as unknown as number)).toBeUndefined();
  });

  test('options: secure and sameSite are passed through', async () => {
    const strictDb = createCookie({
      dbName: 'strict',
      sameSite: 'Lax',
      schema: userSchema,
      secure: true,
    });

    // Should not throw and should store/retrieve normally.
    await strictDb.put('users', { id: 1, name: 'Alice' });
    expect(await strictDb.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
  });
});
