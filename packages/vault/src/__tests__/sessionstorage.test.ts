import { deleteMany, type KeyValueVaultStore, table, ttl, validatorCodec } from '../index';
import { createSessionStorage } from '../session-storage';

type User = { age?: number; city?: string; id: number; name?: string };

const userSchema = { users: table<User>('id') };
const codecs = { users: validatorCodec({ parse: (v) => v as User }) };

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('SessionStorage adapter', () => {
  let db: KeyValueVaultStore<typeof userSchema>;

  beforeEach(() => {
    sessionStorage.clear();
    db = createSessionStorage({ codecs, name: 'SS', schema: userSchema });
  });

  test('put/get and delete roundtrip', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    expect(await db.delete('users', 1)).toBe(true);
  });

  test('clear clears only the current table namespace', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    sessionStorage.setItem('SS~other~1', JSON.stringify({ value: { id: 1 } }));

    await db.clear('users');

    expect(await db.getAll('users')).toEqual([]);
    expect(sessionStorage.getItem('SS~other~1')).not.toBeNull();
  });

  test('deleteMany removes matching records (derived helper)', async () => {
    await db.putAll('users', [
      { age: 20, id: 1, name: 'Alice' },
      { age: 30, id: 2, name: 'Bob' },
    ]);

    expect(await deleteMany(db, 'users', [2])).toBe(1);
    expect(await db.getAll('users')).toEqual([{ age: 20, id: 1, name: 'Alice' }]);
  });

  test('ttl expiration removes records lazily', async () => {
    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1));
    await delay(5);

    expect(await db.get('users', 1)).toBeUndefined();
  });

  test('instances sharing the same namespace can read each other writes', async () => {
    const db2 = createSessionStorage({ codecs, name: 'SS', schema: userSchema });

    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db2.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
  });
});
