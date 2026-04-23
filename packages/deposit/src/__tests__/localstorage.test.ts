import { createLocalStorage, type Adapter, type Schema } from '../index';

type User = { age?: number; city?: string; id: number; name?: string };

const userSchema: Schema<{ users: User }> = {
  users: { key: 'id' },
};

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('LocalStorage adapter', () => {
  let db: Adapter<typeof userSchema>;

  beforeEach(() => {
    localStorage.clear();
    db = createLocalStorage({ dbName: 'LS', schema: userSchema });
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

  test('corrupted entries are removed lazily on read', async () => {
    localStorage.setItem('LS:users:1', '{bad json');

    expect(await db.get('users', 1)).toBeUndefined();
    expect(localStorage.getItem('LS:users:1')).toBeNull();
  });
});
