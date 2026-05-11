import { createMemory, table, type Adapter } from '../index';

type User = { age?: number; city?: string; id: number; name?: string };

const userSchema = { users: table<User>('id') };

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('Memory adapter', () => {
  let db: Adapter<typeof userSchema>;

  beforeEach(() => {
    db = createMemory({ schema: userSchema });
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

  test('has() returns true for existing and false for missing records', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.has('users', 1)).toBe(true);
    expect(await db.has('users', 99)).toBe(false);
  });

  test('has() respects TTL expiry', async () => {
    await db.put('users', { id: 1, name: 'Alice' }, 1);
    await delay(5);

    expect(await db.has('users', 1)).toBe(false);
  });

  test('TTL expiry is respected', async () => {
    await db.put('users', { id: 1, name: 'Alice' }, 1);
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
    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
  });

  test('query builder via query()', async () => {
    await db.put('users', { age: 25, id: 1, name: 'Alice' });
    await db.put('users', { age: 30, id: 2, name: 'Bob' });

    const r = await db.query('users').between('age', 26, 40).toArray();

    expect(r).toEqual([{ age: 30, id: 2, name: 'Bob' }]);
  });

  test('each instance has isolated state', async () => {
    const other = createMemory({ schema: userSchema });

    await db.put('users', { id: 1, name: 'Alice' });

    expect(await other.count('users')).toBe(0);
  });

  test('update() patches existing records and returns undefined for missing keys', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.update('users', 1, { city: 'Paris' })).toEqual({ city: 'Paris', id: 1, name: 'Alice' });
    expect(await db.update('users', 99, { city: 'Berlin' })).toBeUndefined();
  });

  test('getOrPut() returns existing value or inserts fallback', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    const existing = await db.getOrPut('users', 1, { id: 1, name: 'Ignored' });
    const created = await db.getOrPut('users', 2, () => ({ id: 2, name: 'Bob' }));

    expect(existing).toEqual({ id: 1, name: 'Alice' });
    expect(created).toEqual({ id: 2, name: 'Bob' });
    expect(await db.count('users')).toBe(2);
  });

  test('deleteWhere() removes matching records and returns deletion count', async () => {
    await db.putAll('users', [
      { age: 25, id: 1, name: 'Alice' },
      { age: 30, id: 2, name: 'Bob' },
      { age: 35, id: 3, name: 'Charlie' },
    ]);

    const deleted = await db.deleteWhere('users', (u) => (u.age ?? 0) >= 30);

    expect(deleted).toBe(2);
    expect(await db.getAll('users')).toEqual([{ age: 25, id: 1, name: 'Alice' }]);
  });

  test('forEach() iterates records in table order', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    const ids: number[] = [];

    await db.forEach('users', (u) => {
      ids.push(u.id);
    });

    expect(ids).toEqual([1, 2]);
  });

  test('observe() emits initial and updated snapshots', async () => {
    const snapshots: User[][] = [];
    const done = new Promise<void>((resolve) => {
      const stop = db.observe('users', (rows) => {
        snapshots.push(rows);

        if (snapshots.length === 3) {
          stop();
          resolve();
        }
      });
    });

    await db.put('users', { id: 1, name: 'Alice' });
    await db.put('users', { id: 2, name: 'Bob' });
    await done;

    expect(snapshots[0]).toEqual([]);
    expect(snapshots[1]).toEqual([{ id: 1, name: 'Alice' }]);
    expect(snapshots[2]).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  });
});
