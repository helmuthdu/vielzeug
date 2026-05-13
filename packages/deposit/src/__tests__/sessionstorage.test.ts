import { createSessionStorage, table, type Adapter } from '../index';

type User = { age?: number; city?: string; id: number; name?: string };

const userSchema = { users: table<User>('id') };

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('SessionStorage adapter', () => {
  let db: Adapter<typeof userSchema>;

  beforeEach(() => {
    sessionStorage.clear();
    db = createSessionStorage('SS', userSchema);
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

  test('putAll() writes all records', async () => {
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

  test('corrupted entries are removed lazily on read', async () => {
    sessionStorage.setItem('SS~users~1', '{bad json');

    expect(await db.get('users', 1)).toBeUndefined();
    expect(sessionStorage.getItem('SS~users~1')).toBeNull();
  });

  test('two instances share the same sessionStorage namespace', async () => {
    const db2 = createSessionStorage('SS', userSchema);

    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db2.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
  });
});
