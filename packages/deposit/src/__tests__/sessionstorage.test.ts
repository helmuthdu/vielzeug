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

  describe('core CRUD behavior', () => {
    test('put/get roundtrip and count', async () => {
      await db.put('users', { id: 1, name: 'Alice' });
      await db.put('users', { id: 2, name: 'Bob' });

      expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
      expect(await db.count('users')).toBe(2);
    });

    test('delete returns false for missing keys', async () => {
      expect(await db.delete('users', 99)).toBe(false);
    });

    test('delete removes existing records', async () => {
      await db.put('users', { id: 1, name: 'Alice' });

      expect(await db.delete('users', 1)).toBe(true);
      expect(await db.get('users', 1)).toBeUndefined();
    });

    test('deleteAll clears only current table records', async () => {
      await db.putAll('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      sessionStorage.setItem('SS~other~1', JSON.stringify({ value: { id: 1 } }));

      await db.deleteAll('users');

      expect(await db.getAll('users')).toEqual([]);
      expect(sessionStorage.getItem('SS~other~1')).not.toBeNull();
    });
  });

  describe('record lifecycle helpers', () => {
    test('has returns true for existing and false for missing', async () => {
      await db.put('users', { id: 1, name: 'Alice' });

      expect(await db.has('users', 1)).toBe(true);
      expect(await db.has('users', 99)).toBe(false);
    });

    test('putAll writes all records', async () => {
      await db.putAll('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      expect(await db.getAll('users')).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });
  });

  describe('ttl behavior', () => {
    test('expired records are not returned by get', async () => {
      await db.put('users', { id: 1, name: 'Alice' }, 1);
      await delay(5);

      expect(await db.get('users', 1)).toBeUndefined();
    });

    test('expired records are not visible through has/count', async () => {
      await db.put('users', { id: 1, name: 'Alice' }, 1);
      await delay(5);

      expect(await db.has('users', 1)).toBe(false);
      expect(await db.count('users')).toBe(0);
    });
  });

  describe('query integration', () => {
    test('query runs against persisted records', async () => {
      await db.put('users', { age: 25, id: 1, name: 'Alice' });
      await db.put('users', { age: 30, id: 2, name: 'Bob' });

      expect(await db.query('users').between('age', 26, 40).toArray()).toEqual([{ age: 30, id: 2, name: 'Bob' }]);
    });
  });

  describe('robustness and namespace behavior', () => {
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
});
