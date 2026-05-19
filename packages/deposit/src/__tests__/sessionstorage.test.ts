import { createSessionStorage, table, type Adapter } from '../index';

type User = { age?: number; city?: string; id: number; name?: string };

const userSchema = { users: table<User>('id') };

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('SessionStorage adapter', () => {
  let db: Adapter<typeof userSchema>;

  beforeEach(() => {
    sessionStorage.clear();
    db = createSessionStorage({ name: 'SS', schema: userSchema });
  });

  test('put/get and delete roundtrip', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    expect(await db.delete('users', 1)).toBe(true);
  });

  test('deleteAll clears only the current table namespace', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    sessionStorage.setItem('SS~other~1', JSON.stringify({ value: { id: 1 } }));

    await db.deleteAll('users');

    expect(await db.getAll('users')).toEqual([]);
    expect(sessionStorage.getItem('SS~other~1')).not.toBeNull();
  });

  test('query.delete removes matching records', async () => {
    await db.putAll('users', [
      { age: 20, id: 1, name: 'Alice' },
      { age: 30, id: 2, name: 'Bob' },
    ]);

    expect(
      await db
        .query('users')
        .filter((u) => (u.age ?? 0) >= 30)
        .delete(),
    ).toBe(1);
    expect(await db.getAll('users')).toEqual([{ age: 20, id: 1, name: 'Alice' }]);
  });

  test('ttl expiration removes records lazily', async () => {
    await db.put('users', { id: 1, name: 'Alice' }, 1);
    await delay(5);

    expect(await db.get('users', 1)).toBeUndefined();
    expect(await db.has('users', 1)).toBe(false);
  });

  test('instances sharing the same namespace can read each other writes', async () => {
    const db2 = createSessionStorage({ name: 'SS', schema: userSchema });

    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db2.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
  });
});
