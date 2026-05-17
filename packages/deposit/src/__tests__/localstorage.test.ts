import { createLocalStorage, table, type Adapter } from '../index';

type User = { age?: number; city?: string; id: number; name?: string };

const userSchema = { users: table<User>('id') };

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('LocalStorage adapter', () => {
  let db: Adapter<typeof userSchema>;

  beforeEach(() => {
    window.localStorage.clear();
    db = createLocalStorage('LS', userSchema);
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

    test('deleteAll removes all records for current table', async () => {
      await db.putAll('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      window.localStorage.setItem('LS~other~1', JSON.stringify({ value: { id: 1 } }));

      await db.deleteAll('users');

      expect(await db.getAll('users')).toEqual([]);
      expect(window.localStorage.getItem('LS~other~1')).not.toBeNull();
    });

    test('deleteAll removes every matching key without skipping', async () => {
      await db.putAll('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
        { id: 4, name: 'Dora' },
      ]);

      await db.deleteAll('users');

      expect(await db.count('users')).toBe(0);
      expect(window.localStorage.length).toBe(0);
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

  describe('robustness and observation', () => {
    test('corrupted entries are removed lazily on read', async () => {
      window.localStorage.setItem('LS~users~1', '{bad json');

      expect(await db.get('users', 1)).toBeUndefined();
      expect(window.localStorage.getItem('LS~users~1')).toBeNull();
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

    test('observe with immediate false does not emit until mutation', async () => {
      const snapshots: User[][] = [];
      const stop = db.observe(
        'users',
        (rows) => {
          snapshots.push(rows);
        },
        { immediate: false },
      );

      await Promise.resolve();
      expect(snapshots).toEqual([]);

      await db.put('users', { id: 1, name: 'Alice' });
      await Promise.resolve();
      stop();

      expect(snapshots).toEqual([[{ id: 1, name: 'Alice' }]]);
    });
  });
});
