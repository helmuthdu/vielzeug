import { createIndexedDB, table, type IndexedDBHandle } from '../index';

type User = { age?: number; city?: string; id: number; name?: string };
type Post = { id: number; title: string; userId: number };

const userSchema = { users: table<User>('id') };

const multiSchema = {
  posts: table<Post>('id'),
  users: table<User>('id'),
};

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('IndexedDB adapter', () => {
  let db: IndexedDBHandle<typeof userSchema>;

  beforeEach(async () => {
    db = createIndexedDB({ dbName: 'IDB', schema: userSchema, schemaVersion: 1 });
    await db.deleteAll('users');
  });

  afterEach(() => {
    db.close();
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

  test('putAll() writes all records atomically', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    expect(await db.count('users')).toBe(2);
    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
  });

  test('TTL expiry is respected', async () => {
    await db.put('users', { id: 1, name: 'Alice' }, 1);
    await delay(5);

    expect(await db.get('users', 1)).toBeUndefined();
    expect(await db.count('users')).toBe(0);
  });

  test('query builder via query()', async () => {
    await db.put('users', { age: 25, id: 1, name: 'Alice' });
    await db.put('users', { age: 30, id: 2, name: 'Bob' });

    const r = await db.query('users').between('age', 26, 40).toArray();

    expect(r).toEqual([{ age: 30, id: 2, name: 'Bob' }]);
  });

  test('transaction commits atomically across tables', async () => {
    const multi = createIndexedDB({ dbName: 'Multi', schema: multiSchema, schemaVersion: 1 });

    await multi.deleteAll('users');
    await multi.deleteAll('posts');
    await multi.put('users', { id: 1, name: 'Alice' });
    await multi.put('users', { id: 2, name: 'Bob' });
    await multi.put('posts', { id: 1, title: 'P1', userId: 1 });
    await multi.put('posts', { id: 2, title: 'P2', userId: 2 });

    await multi.transaction(['users', 'posts'], async (tx) => {
      await tx.delete('users', 1);
      await tx.delete('posts', 1);
      await tx.put('users', { id: 3, name: 'Charlie' });
    });

    expect(await multi.getAll('users')).toEqual([
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);
    expect(await multi.getAll('posts')).toEqual([{ id: 2, title: 'P2', userId: 2 }]);

    multi.close();
  });

  test('transaction rolls back on callback error', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    await expect(
      db.transaction(['users'], async (tx) => {
        await tx.put('users', { id: 2, name: 'Bob' });
        throw new Error('fail');
      }),
    ).rejects.toThrow();

    expect(await db.getAll('users')).toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('transaction returns the callback result', async () => {
    await db.put('users', { age: 30, id: 1, name: 'Alice' });

    const user = await db.transaction(['users'] as const, async (tx) => {
      const row = await tx.get('users', 1);

      if (!row) throw new Error('missing user');

      return row;
    });

    expect(user).toEqual({ age: 30, id: 1, name: 'Alice' });
  });
});
