import { createLocalStorage, table, ttl, type Adapter } from '../index';

type User = { age?: number; city?: string; id: number; name?: string };

const userSchema = { users: table<User>('id') };

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('LocalStorage adapter', () => {
  let db: Adapter<typeof userSchema>;

  beforeEach(() => {
    window.localStorage.clear();
    db = createLocalStorage({ name: 'LS', schema: userSchema });
  });

  test('put/get and delete roundtrip', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    expect(await db.delete('users', 1)).toBe(true);
    expect(await db.get('users', 1)).toBeUndefined();
  });

  test('deleteAll removes table-prefixed records only', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    window.localStorage.setItem('LS~other~1', JSON.stringify({ value: { id: 1 } }));

    await db.deleteAll('users');

    expect(await db.getAll('users')).toEqual([]);
    expect(window.localStorage.getItem('LS~other~1')).not.toBeNull();
  });

  test('has and update work as expected', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.has('users', 1)).toBe(true);
    expect(await db.update('users', 1, { city: 'Paris' })).toEqual({ city: 'Paris', id: 1, name: 'Alice' });
  });

  test('upsert inserts when record does not exist', async () => {
    const result = await db.upsert('users', 1, () => ({ id: 1, name: 'Alice' }));

    expect(result).toEqual({ id: 1, name: 'Alice' });
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

  test('ttl expiration is respected', async () => {
    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1));
    await delay(5);

    expect(await db.get('users', 1)).toBeUndefined();
    expect(await db.has('users', 1)).toBe(false);
  });

  test('storage clear event notifies observers', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    const snapshots: User[][] = [];
    const stop = db.observe('users', (rows) => {
      snapshots.push(rows);
    });

    window.localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    await Promise.resolve();
    stop();

    expect(snapshots[0]).toEqual([{ id: 1, name: 'Alice' }]);
    expect(snapshots[1]).toEqual([]);
  });

  test('corrupted entries are removed lazily on read', async () => {
    // Write an entry with corrupted JSON directly — bypasses the adapter
    window.localStorage.setItem('LS~users~99', 'not valid json {{{');

    expect(await db.getAll('users')).toEqual([]);
    expect(window.localStorage.getItem('LS~users~99')).toBeNull();
  });
});
