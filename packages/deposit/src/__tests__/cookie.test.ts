import { createCookie, type Adapter, type Schema } from '../index';

type User = { age?: number; id: number; name?: string };

const userSchema: Schema<{ users: User }> = {
  users: { key: 'id' },
};

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function clearAllCookies(): void {
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0].trim();

    if (name) document.cookie = `${name}=; max-age=0; path=/`;
  }
}

describe('Cookie adapter', () => {
  let db: Adapter<typeof userSchema>;

  beforeEach(() => {
    clearAllCookies();
    db = createCookie({ dbName: 'CO', schema: userSchema });
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

  test('putAll() writes all records', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    expect(await db.count('users')).toBe(2);
    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
  });

  test('TTL expiry is respected via __exp field', async () => {
    await db.put('users', { id: 1, name: 'Alice' }, 1);
    await delay(5);

    expect(await db.get('users', 1)).toBeUndefined();
    expect(await db.count('users')).toBe(0);
  });

  test('has() respects TTL expiry', async () => {
    await db.put('users', { id: 1, name: 'Alice' }, 1);
    await delay(5);

    expect(await db.has('users', 1)).toBe(false);
  });

  test('query builder via from()', async () => {
    await db.put('users', { age: 25, id: 1, name: 'Alice' });
    await db.put('users', { age: 30, id: 2, name: 'Bob' });

    const r = await db.from('users').between('age', 26, 40).toArray();

    expect(r).toEqual([{ age: 30, id: 2, name: 'Bob' }]);
  });

  test('corrupted cookie values are cleaned up on read', async () => {
    // Set a cookie with an invalid JSON value directly
    document.cookie = `CO:users:99=${encodeURIComponent('{bad json')}; path=/`;

    expect(await db.get('users', 99)).toBeUndefined();
    // Cookie should be removed — it won't appear in getAll
    expect(await db.getAll('users')).toEqual([]);
  });

  test('two instances share cookies under the same dbName', async () => {
    const db2 = createCookie({ dbName: 'CO', schema: userSchema });

    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db2.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
  });
});
