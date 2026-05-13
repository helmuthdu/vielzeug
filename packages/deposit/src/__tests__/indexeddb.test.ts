import { createIndexedDB, table, type IndexedDBHandle } from '../index';

type User = { age?: number; city?: string; id: number; name?: string };
type Post = { id: number; title: string; userId: number };

const userSchema = { users: table<User>('id') };

const multiSchema = {
  posts: table<Post>('id'),
  users: table<User>('id'),
};

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function rawStoreCount(dbName: string, storeName: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onerror = () => reject(request.error ?? new Error('failed to open database'));
    request.onsuccess = () => {
      const rawDb = request.result;
      const tx = rawDb.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const countRequest = store.count();

      countRequest.onerror = () => reject(countRequest.error ?? new Error('failed to count records'));
      countRequest.onsuccess = () => resolve(countRequest.result);
      tx.oncomplete = () => rawDb.close();
      tx.onabort = () => reject(tx.error ?? new Error('count transaction aborted'));
      tx.onerror = () => reject(tx.error ?? new Error('count transaction failed'));
    };
  });
}

function rawStorePut(dbName: string, storeName: string, value: unknown): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onerror = () => reject(request.error ?? new Error('failed to open database'));
    request.onsuccess = () => {
      const rawDb = request.result;
      const tx = rawDb.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const putRequest = store.put(value);

      putRequest.onerror = () => reject(putRequest.error ?? new Error('failed to write raw record'));
      tx.oncomplete = () => {
        rawDb.close();
        resolve();
      };
      tx.onabort = () => reject(tx.error ?? new Error('raw write transaction aborted'));
      tx.onerror = () => reject(tx.error ?? new Error('raw write transaction failed'));
    };
  });
}

describe('IndexedDB adapter', () => {
  let db: IndexedDBHandle<typeof userSchema>;

  beforeEach(async () => {
    db = createIndexedDB({ dbName: 'IDB', schema: userSchema, schemaVersion: 1 });
    await db.deleteAll('users');
  });

  afterEach(() => {
    db.dispose();
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

    test('deleteAll clears records', async () => {
      await db.putAll('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      await db.deleteAll('users');

      expect(await db.getAll('users')).toEqual([]);
    });

    test('putAll writes all records in a single call', async () => {
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

    test('expired records remain in storage until a write-path cleanup runs', async () => {
      await db.put('users', { id: 1, name: 'Alice' }, 1);
      await delay(5);

      expect(await db.get('users', 1)).toBeUndefined();
      expect(await rawStoreCount('IDB', 'users')).toBe(1);
    });

    test('malformed stored payloads are ignored during reads', async () => {
      await rawStorePut('IDB', 'users', { e: 'bad', v: { id: 1, name: 'Corrupt' } });

      expect(await db.get('users', 1)).toBeUndefined();
      expect(await rawStoreCount('IDB', 'users')).toBe(1);
    });
  });

  describe('query and iteration', () => {
    test('query builder runs over table records', async () => {
      await db.put('users', { age: 25, id: 1, name: 'Alice' });
      await db.put('users', { age: 30, id: 2, name: 'Bob' });

      expect(await db.query('users').between('age', 26, 40).toArray()).toEqual([{ age: 30, id: 2, name: 'Bob' }]);
    });

    test('iterate yields records in table order', async () => {
      await db.putAll('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      const ids: number[] = [];

      for await (const user of db.iterate('users')) {
        ids.push(user.id);
      }

      expect(ids).toEqual([1, 2]);
    });
  });

  describe('adapter methods and observation', () => {
    test('update/getOrPut/deleteWhere/forEach work together and notify observers', async () => {
      const snapshots: User[][] = [];
      const stop = db.observe('users', (rows) => {
        snapshots.push(rows);
      });

      await db.put('users', { id: 1, name: 'Alice' });
      await db.update('users', 1, { city: 'Paris' });
      await db.getOrPut('users', { id: 2, name: 'Bob' });

      const deleted = await db.deleteWhere('users', (u) => u.id === 2);

      const ids: number[] = [];

      await db.forEach('users', (u) => {
        ids.push(u.id);
      });

      await Promise.resolve();
      stop();

      expect(deleted).toBe(1);
      expect(ids).toEqual([1]);
      expect(await db.get('users', 1)).toEqual({ city: 'Paris', id: 1, name: 'Alice' });
      expect(snapshots).toEqual([
        [],
        [{ id: 1, name: 'Alice' }],
        [{ city: 'Paris', id: 1, name: 'Alice' }],
        [
          { city: 'Paris', id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        [{ city: 'Paris', id: 1, name: 'Alice' }],
      ]);
    });

    test('operations throw after dispose', async () => {
      db.dispose();

      await expect(db.getAll('users')).rejects.toThrow('is disposed');
    });
  });

  describe('transactions', () => {
    test('transaction commits atomically across tables', async () => {
      const multi = createIndexedDB({ dbName: 'Multi', schema: multiSchema, schemaVersion: 1 });

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

      multi.dispose();
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

    test('transaction returns callback result', async () => {
      await db.put('users', { age: 30, id: 1, name: 'Alice' });

      const user = await db.transaction(['users'] as const, async (tx) => {
        const row = await tx.get('users', 1);

        if (!row) throw new Error('missing user');

        return row;
      });

      expect(user).toEqual({ age: 30, id: 1, name: 'Alice' });
    });

    test('transaction context supports update/getOrPut/deleteWhere/forEach', async () => {
      await db.transaction(['users'] as const, async (tx) => {
        await tx.getOrPut('users', { id: 1, name: 'Alice' });
        await tx.update('users', 1, { city: 'Paris' });
        await tx.getOrPut('users', { id: 2, name: 'Bob' });

        const ids: number[] = [];

        await tx.forEach('users', (u) => {
          ids.push(u.id);
        });

        expect(ids).toEqual([1, 2]);

        const deleted = await tx.deleteWhere('users', (u) => u.id === 2);

        expect(deleted).toBe(1);
      });

      expect(await db.getAll('users')).toEqual([{ city: 'Paris', id: 1, name: 'Alice' }]);
    });
  });

  describe('cross-instance sync', () => {
    test('BroadcastChannel propagates mutations to a second adapter instance', async () => {
      const db2 = createIndexedDB({ dbName: 'IDB', schema: userSchema, schemaVersion: 1 });

      await new Promise<void>((resolve) => {
        const stop = db2.observe('users', () => {
          stop();
          resolve();
        });
      });

      const updated = new Promise<User[]>((resolve) => {
        const stop = db2.observe('users', (rows) => {
          if (rows.length > 0) {
            stop();
            resolve(rows);
          }
        });
      });

      await db.put('users', { id: 1, name: 'Alice' });

      expect(await updated).toEqual([{ id: 1, name: 'Alice' }]);

      db2.dispose();
    });
  });
});
