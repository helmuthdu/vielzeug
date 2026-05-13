import { createMemory, table, type Adapter } from '../index';

type User = { age?: number; city?: string; id: number; name?: string };

const userSchema = { users: table<User>('id') };

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('Memory adapter', () => {
  let db: Adapter<typeof userSchema>;

  beforeEach(() => {
    db = createMemory(userSchema);
  });

  describe('core CRUD behavior', () => {
    test('put and get roundtrip', async () => {
      await db.put('users', { id: 1, name: 'Alice' });

      expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    });

    test('delete returns false for missing keys', async () => {
      expect(await db.delete('users', 99)).toBe(false);
    });

    test('delete returns true for existing keys', async () => {
      await db.put('users', { id: 1, name: 'Alice' });

      expect(await db.delete('users', 1)).toBe(true);
      expect(await db.get('users', 1)).toBeUndefined();
    });

    test('deleteAll clears table records', async () => {
      await db.putAll('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      expect(await db.deleteAll('users')).toBe(2);

      expect(await db.getAll('users')).toEqual([]);
    });

    test('deleteAll returns zero for an empty table', async () => {
      expect(await db.deleteAll('users')).toBe(0);
    });

    test('count tracks live records', async () => {
      expect(await db.count('users')).toBe(0);

      await db.put('users', { id: 1, name: 'Alice' });
      await db.put('users', { id: 2, name: 'Bob' });

      expect(await db.count('users')).toBe(2);
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

  describe('record lifecycle helpers', () => {
    test('has returns true only for existing keys', async () => {
      await db.put('users', { id: 1, name: 'Alice' });

      expect(await db.has('users', 1)).toBe(true);
      expect(await db.has('users', 99)).toBe(false);
    });

    test('update patches existing record', async () => {
      await db.put('users', { id: 1, name: 'Alice' });

      expect(await db.update('users', 1, { city: 'Paris' })).toEqual({ city: 'Paris', id: 1, name: 'Alice' });
    });

    test('update returns undefined when record does not exist', async () => {
      expect(await db.update('users', 99, { city: 'Berlin' })).toBeUndefined();
    });

    test('update rejects key mutation', async () => {
      await db.put('users', { id: 1, name: 'Alice' });

      await expect(db.update('users', 1, { id: 2 } as Partial<User>)).rejects.toThrow('update key mismatch');
    });

    test('getOrPut returns existing value without overwrite', async () => {
      await db.put('users', { id: 1, name: 'Alice' });

      const existing = await db.getOrPut('users', { id: 1, name: 'Ignored' });

      expect(existing).toEqual({ id: 1, name: 'Alice' });
      expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    });

    test('getOrPut inserts value when key is missing', async () => {
      expect(await db.getOrPut('users', { id: 2, name: 'Bob' })).toEqual({ id: 2, name: 'Bob' });
    });

    test('deleteWhere removes matching records and returns count', async () => {
      await db.putAll('users', [
        { age: 25, id: 1, name: 'Alice' },
        { age: 30, id: 2, name: 'Bob' },
        { age: 35, id: 3, name: 'Charlie' },
      ]);

      const deleted = await db.deleteWhere('users', (u) => (u.age ?? 0) >= 30);

      expect(deleted).toBe(2);
      expect(await db.getAll('users')).toEqual([{ age: 25, id: 1, name: 'Alice' }]);
    });
  });

  describe('ttl behavior', () => {
    test('expired record is not returned by get', async () => {
      await db.put('users', { id: 1, name: 'Alice' }, 1);
      await delay(5);

      expect(await db.get('users', 1)).toBeUndefined();
    });

    test('expired record is not visible through has/count', async () => {
      await db.put('users', { id: 1, name: 'Alice' }, 1);
      await delay(5);

      expect(await db.has('users', 1)).toBe(false);
      expect(await db.count('users')).toBe(0);
    });
  });

  describe('iteration and query', () => {
    test('query filters records via in-memory builder', async () => {
      await db.put('users', { age: 25, id: 1, name: 'Alice' });
      await db.put('users', { age: 30, id: 2, name: 'Bob' });

      expect(await db.query('users').between('age', 26, 40).toArray()).toEqual([{ age: 30, id: 2, name: 'Bob' }]);
    });

    test('forEach iterates records in table order', async () => {
      await db.putAll('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      const ids: number[] = [];

      await db.forEach('users', (u) => {
        ids.push(u.id);
      });

      expect(ids).toEqual([1, 2]);
    });

    test('iterate yields records and supports early break', async () => {
      await db.putAll('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      const ids: number[] = [];

      for await (const user of db.iterate('users')) {
        ids.push(user.id);

        if (user.id === 1) break;
      }

      expect(ids).toEqual([1]);
    });
  });

  describe('observation', () => {
    test('observe emits initial snapshot by default', async () => {
      const snapshots: User[][] = [];
      const stop = db.observe('users', (rows) => {
        snapshots.push(rows);
      });

      await Promise.resolve();
      stop();

      expect(snapshots).toEqual([[]]);
    });

    test('observe with immediate false waits for mutation', async () => {
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

    test('dispose prevents in-flight immediate notifications', async () => {
      const snapshots: User[][] = [];

      db.observe('users', (rows) => {
        snapshots.push(rows);
      });

      db.dispose();
      await Promise.resolve();

      expect(snapshots).toEqual([]);
    });

    test('update and getOrPut(insert) emit observer updates', async () => {
      await db.put('users', { id: 1, name: 'Alice' });

      const snapshots: User[][] = [];
      const stop = db.observe('users', (rows) => {
        snapshots.push(rows);
      });

      await db.update('users', 1, { city: 'Paris' });
      await db.getOrPut('users', { id: 2, name: 'Bob' });
      await Promise.resolve();
      stop();

      expect(snapshots).toEqual([
        [{ id: 1, name: 'Alice' }],
        [{ city: 'Paris', id: 1, name: 'Alice' }],
        [
          { city: 'Paris', id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      ]);
    });

    test('deleteWhere emits a single observer update', async () => {
      await db.putAll('users', [
        { age: 20, id: 1, name: 'Alice' },
        { age: 30, id: 2, name: 'Bob' },
        { age: 40, id: 3, name: 'Charlie' },
      ]);

      const snapshots: User[][] = [];
      const stop = db.observe('users', (rows) => {
        snapshots.push(rows);
      });

      await db.deleteWhere('users', (u) => (u.age ?? 0) >= 30);
      await Promise.resolve();
      stop();

      expect(snapshots).toEqual([
        [
          { age: 20, id: 1, name: 'Alice' },
          { age: 30, id: 2, name: 'Bob' },
          { age: 40, id: 3, name: 'Charlie' },
        ],
        [{ age: 20, id: 1, name: 'Alice' }],
      ]);
    });

    test('listener errors do not block other listeners', async () => {
      const goodSnapshots: User[][] = [];
      const bad = new Error('boom');
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const stopBad = db.observe(
        'users',
        () => {
          throw bad;
        },
        { immediate: false },
      );

      const stopGood = db.observe(
        'users',
        (rows) => {
          goodSnapshots.push(rows);
        },
        { immediate: false },
      );

      await db.put('users', { id: 1, name: 'Alice' });
      await Promise.resolve();

      stopBad();
      stopGood();

      expect(goodSnapshots).toEqual([[{ id: 1, name: 'Alice' }]]);
      expect(errorSpy).toHaveBeenCalledWith('[deposit] observer notification failed', bad);

      errorSpy.mockRestore();
    });
  });

  describe('adapter isolation', () => {
    test('each instance has isolated state', async () => {
      const other = createMemory(userSchema);

      await db.put('users', { id: 1, name: 'Alice' });

      expect(await other.count('users')).toBe(0);
    });
  });
});
