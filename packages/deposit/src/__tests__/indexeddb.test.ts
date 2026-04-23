import { createIndexedDB, type IndexedDBHandle, type Schema } from '../index';

type User = { age?: number; city?: string; id: number; name?: string };
type Post = { id: number; title: string; userId: number };

const userSchema: Schema<{ users: User }> = {
  users: { key: 'id' },
};

const multiSchema: Schema<{ posts: Post; users: User }> = {
  posts: { key: 'id' },
  users: { key: 'id' },
};

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('IndexedDB adapter', () => {
  let db: IndexedDBHandle<typeof userSchema>;

  beforeEach(async () => {
    db = createIndexedDB({ dbName: 'IDB', schema: userSchema, version: 1 });
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

  test('TTL expiry is respected', async () => {
    await db.put('users', { id: 1, name: 'Alice' }, 1);
    await delay(5);

    expect(await db.get('users', 1)).toBeUndefined();
    expect(await db.count('users')).toBe(0);
  });

  test('query builder via from()', async () => {
    await db.put('users', { age: 25, id: 1, name: 'Alice' });
    await db.put('users', { age: 30, id: 2, name: 'Bob' });

    const r = await db.from('users').between('age', 26, 40).toArray();

    expect(r).toEqual([{ age: 30, id: 2, name: 'Bob' }]);
  });

  test('transaction commits atomically across tables', async () => {
    const multi = createIndexedDB({ dbName: 'Multi', schema: multiSchema, version: 1 });

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
});
