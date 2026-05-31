import type { IndexedDbAdapter } from '../adapters/indexeddb';

import {
  type Adapter,
  createIndexedDB,
  type MetricsEvent,
  table,
  ttl,
  VaultDisposedError,
  VaultScopeError,
} from '../index';

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

function rawStorePut(dbName: string, storeName: string, key: IDBValidKey, value: unknown): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onerror = () => reject(request.error ?? new Error('failed to open database'));
    request.onsuccess = () => {
      const rawDb = request.result;
      const tx = rawDb.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const putRequest = store.put(value, key);

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
  let db: Adapter<typeof userSchema>;

  beforeEach(async () => {
    db = createIndexedDB({ name: 'IDB', schema: userSchema, version: 1 });
    await db.clear('users');
  });

  afterEach(() => {
    db.dispose();
  });

  test('put/get/delete CRUD behavior', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    expect(await db.delete('users', 1)).toBe(true);
    expect(await db.get('users', 1)).toBeUndefined();
  });

  test('putAll and getAll', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    expect(await db.getAll('users')).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  });

  test('query.delete removes matching rows', async () => {
    await db.putAll('users', [
      { age: 25, id: 1, name: 'Alice' },
      { age: 30, id: 2, name: 'Bob' },
    ]);

    expect(
      await db
        .query('users')
        .filter((u) => (u.age ?? 0) >= 30)
        .delete(),
    ).toBe(1);
    expect(await db.getAll('users')).toEqual([{ age: 25, id: 1, name: 'Alice' }]);
  });

  test('ttl expiration is respected', async () => {
    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1));
    await delay(5);

    expect(await db.get('users', 1)).toBeUndefined();
    expect(await db.has('users', 1)).toBe(false);
  });

  test('delete returns false for TTL-expired records', async () => {
    // Only fake Date.now — faking all timers blocks IDB async operations in the test environment.
    vi.useFakeTimers({ toFake: ['Date'] });

    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1000));
    vi.advanceTimersByTime(2000); // record is now expired

    // has() returns false for expired records
    expect(await db.has('users', 1)).toBe(false);
    // delete() is now consistent with has(): returns false for expired records
    expect(await db.delete('users', 1)).toBe(false);
    // physical entry was cleaned up
    expect(await rawStoreCount('IDB', 'users')).toBe(0);

    vi.useRealTimers();
  });

  test('malformed payloads are ignored during reads', async () => {
    // Write a record with OLD format (e/v) — should not parse with new format (expiresAt/value)
    await rawStorePut('IDB', 'users', 1, { e: 'bad', v: { id: 1, name: 'Corrupt' } });

    expect(await db.get('users', 1)).toBeUndefined();
    expect(await rawStoreCount('IDB', 'users')).toBe(1);
  });

  test('observe receives updates after mutations', async () => {
    const snapshots: User[][] = [];
    const done = new Promise<void>((resolve) => {
      const stop = db.observe('users', (rows) => {
        snapshots.push(rows);

        if (snapshots.length === 3) {
          stop();
          resolve();
        }
      });
    });

    await db.put('users', { id: 1, name: 'Alice' });
    await db.update('users', 1, { city: 'Paris' });
    await done;

    expect(snapshots[1]).toEqual([{ id: 1, name: 'Alice' }]);
    expect(snapshots[2]).toEqual([{ city: 'Paris', id: 1, name: 'Alice' }]);
  });

  test('upsert inserts when record does not exist', async () => {
    const result = await db.upsert('users', 1, () => ({ id: 1, name: 'Alice' }));

    expect(result).toEqual({ id: 1, name: 'Alice' });
    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
  });

  test('upsert merges when record exists', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    const result = await db.upsert('users', 1, (existing) => ({ ...existing!, city: 'Paris' }));

    expect(result).toEqual({ city: 'Paris', id: 1, name: 'Alice' });
  });

  test('upsert rejects key mismatch', async () => {
    await expect(db.upsert('users', 1, () => ({ id: 2, name: 'Alice' }))).rejects.toThrow('key');
  });

  test('batch commits atomically across tables', async () => {
    const multi = createIndexedDB({ name: 'Multi', schema: multiSchema, version: 1 });

    await multi.clear('users');
    await multi.clear('posts');
    await multi.put('users', { id: 1, name: 'Alice' });
    await multi.put('posts', { id: 1, title: 'P1', userId: 1 });

    await multi.batch(['users', 'posts'], async (tx) => {
      await tx.delete('users', 1);
      await tx.put('users', { id: 2, name: 'Bob' });
      await tx.put('posts', { id: 2, title: 'P2', userId: 2 });
    });

    expect(await multi.getAll('users')).toEqual([{ id: 2, name: 'Bob' }]);
    expect(await multi.getAll('posts')).toEqual([
      { id: 1, title: 'P1', userId: 1 },
      { id: 2, title: 'P2', userId: 2 },
    ]);

    multi.dispose();
  });

  test('batch rolls back on callback error', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    await expect(
      db.batch(['users'], async (tx) => {
        await tx.put('users', { id: 2, name: 'Bob' });
        throw new Error('fail');
      }),
    ).rejects.toThrow();

    expect(await db.getAll('users')).toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('batch supports upsert inside transaction', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    await db.batch(['users'], async (tx) => {
      await tx.upsert('users', 1, (existing) => ({ ...existing!, city: 'Paris' }));
      await tx.upsert('users', 2, () => ({ id: 2, name: 'Bob' }));
    });

    expect(await db.getAll('users')).toEqual([
      { city: 'Paris', id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  });

  test('batch rejects access to tables outside its declared scope', async () => {
    const multi = createIndexedDB({ name: 'ScopedBatch', schema: multiSchema, version: 1 });

    await multi.clear('users');
    await multi.clear('posts');

    let caughtError: unknown;

    try {
      await multi.batch(['users'], async (tx) => {
        await tx.put('posts' as any, { id: 1, title: 'Hello', userId: 1 });
      });
    } catch (e) {
      caughtError = e;
    }

    // VaultScopeError must be catchable as its specific type — not wrapped in a plain Error.
    expect(caughtError).toBeInstanceOf(VaultScopeError);
    expect((caughtError as VaultScopeError).message).toContain('batch scope');
    expect(await multi.getAll('posts')).toEqual([]);
    multi.dispose();
  });

  test('debug returns live and expired counts', async () => {
    await db.put('users', { id: 1, name: 'Alice' });
    await db.put('users', { id: 2, name: 'Bob' }, ttl.ms(1)); // expires immediately

    await delay(5);

    const info = await db.debug();

    expect(info.tables).toHaveLength(1);

    const userTable = info.tables.find((t) => t.name === 'users');

    expect(userTable?.recordCount).toBe(1);
    expect(userTable?.expiredCount).toBe(1);
  });

  test('schema defaultTtl is applied to put/putAll', async () => {
    const ttlSchema = { sessions: table<{ token: string }>('token').ttl(ttl.ms(1)) };
    const db2 = createIndexedDB({ name: 'TTL', schema: ttlSchema, version: 1 });

    await db2.clear('sessions');
    await db2.put('sessions', { token: 'abc' }); // uses schema defaultTtl

    await delay(5);

    expect(await db2.get('sessions', 'abc')).toBeUndefined();
    db2.dispose();
  });

  test('onMetrics callback receives operation events', async () => {
    const events: MetricsEvent[] = [];
    const dbM = createIndexedDB({ name: 'IDB', onMetrics: (e) => events.push(e), schema: userSchema, version: 1 });

    await dbM.clear('users');
    await dbM.put('users', { id: 1, name: 'Alice' });
    await dbM.get('users', 1);

    expect(events.some((e) => e.operation === 'put' && e.table === 'users')).toBe(true);
    expect(events.some((e) => e.operation === 'get' && e.table === 'users')).toBe(true);
    expect(events.every((e) => e.duration >= 0)).toBe(true);

    dbM.dispose();
  });

  test('BroadcastChannel propagates mutations across instances', async () => {
    const db2 = createIndexedDB({ name: 'IDB', schema: userSchema, version: 1 });

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

  test('operations throw after dispose', async () => {
    db.dispose();

    await expect(db.get('users', 1)).rejects.toThrow('disposed');
    await expect(db.put('users', { id: 1, name: 'Alice' })).rejects.toThrow('disposed');
  });

  test('query.equals on primary key uses native IDB range (single record)', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);

    const results = await db.query('users').equals('id', 2).toArray();

    expect(results).toEqual([{ id: 2, name: 'Bob' }]);
  });

  test('query.between on primary key uses native IDB range', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
      { id: 4, name: 'Dave' },
    ]);

    const results = await db.query('users').between('id', 2, 3).toArray();

    expect(results).toEqual([
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);
  });

  test('query.startsWith on string primary key uses native IDB range', async () => {
    type Tag = { label: string };

    const tagSchema = { tags: table<Tag>('label') };
    const dbT = createIndexedDB({ name: 'IDB-tags', schema: tagSchema, version: 1 });

    try {
      await dbT.putAll('tags', [{ label: 'alpha' }, { label: 'beta' }, { label: 'almond' }, { label: 'gamma' }]);

      const results = await dbT.query('tags').startsWith('label', 'al').toArray();

      // IDB key order is lexicographic: 'almond' < 'alpha' (m < p at position 2)
      expect(results).toEqual([{ label: 'almond' }, { label: 'alpha' }]);
    } finally {
      dbT.dispose();
    }
  });

  test('batch supports deleteMany within scope', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);

    const deleted = await db.batch(['users'], async (tx) => tx.deleteMany('users', [1, 3]));

    expect(deleted).toBe(2);
    expect(await db.getAll('users')).toEqual([{ id: 2, name: 'Bob' }]);
  });

  test('pruneExpired deletes TTL-expired records via cursor and returns correct count', async () => {
    // Only fake Date.now — faking all timers blocks IDB async operations in the test environment.
    vi.useFakeTimers({ toFake: ['Date'] });

    const dbP = createIndexedDB({ name: 'IDB-prune', schema: userSchema, version: 1 });

    await dbP.put('users', { id: 1, name: 'Alice' }, ttl.ms(1000));
    await dbP.put('users', { id: 2, name: 'Bob' }, ttl.ms(1000));
    await dbP.put('users', { id: 3, name: 'Charlie' }); // no TTL

    // Verify 3 physical records exist before prune
    expect(await rawStoreCount('IDB-prune', 'users')).toBe(3);

    vi.advanceTimersByTime(2000);

    const result = await dbP.pruneExpired();

    vi.useRealTimers();

    expect(result.users).toBe(2);

    // Physical records reduced: only Charlie remains
    expect(await rawStoreCount('IDB-prune', 'users')).toBe(1);
    expect(await dbP.get('users', 3)).toEqual({ id: 3, name: 'Charlie' });

    dbP.dispose();
  });
});

describe('IndexedDB adapter — iterate()', () => {
  let db: IndexedDbAdapter<typeof userSchema>;

  beforeEach(async () => {
    db = createIndexedDB({ name: 'IDB-iterate', schema: userSchema, version: 1 });
    await db.clear('users');
  });

  afterEach(() => {
    db.dispose();
  });

  test('iterates all records in key order', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);

    const results: User[] = [];

    for await (const r of db.iterate('users')) {
      results.push(r);
    }

    expect(results).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);
  });

  test('empty table yields nothing (done immediately)', async () => {
    const results: User[] = [];

    for await (const r of db.iterate('users')) {
      results.push(r);
    }

    expect(results).toHaveLength(0);
  });

  test('skips TTL-expired records without yielding them', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });

    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1000));
    await db.put('users', { id: 2, name: 'Bob' }); // no TTL
    await db.put('users', { id: 3, name: 'Charlie' }, ttl.ms(1000));

    vi.advanceTimersByTime(2000); // ids 1 and 3 are now expired

    const results: User[] = [];

    for await (const r of db.iterate('users')) {
      results.push(r);
    }

    vi.useRealTimers();

    expect(results).toEqual([{ id: 2, name: 'Bob' }]);
  });

  test('early return() stops iteration cleanly', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);

    const results: User[] = [];

    for await (const r of db.iterate('users')) {
      results.push(r);

      break; // exits via return()
    }

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ id: 1, name: 'Alice' });
  });

  test('consumer can await between iterations without transaction timeout', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    const results: User[] = [];

    for await (const r of db.iterate('users')) {
      // Do an async operation between iterations — the cursor must stay alive.
      await Promise.resolve();
      results.push(r);
    }

    expect(results).toHaveLength(2);
  });

  test('throws VaultDisposedError after dispose()', async () => {
    db.dispose();

    await expect(async () => {
      for await (const _ of db.iterate('users')) {
        // should throw before yielding
      }
    }).rejects.toThrow(VaultDisposedError);
  });

  test('multiple independent iterations do not interfere', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    const [first, second] = await Promise.all([
      (async () => {
        const out: User[] = [];

        for await (const r of db.iterate('users')) out.push(r);

        return out;
      })(),
      (async () => {
        const out: User[] = [];

        for await (const r of db.iterate('users')) out.push(r);

        return out;
      })(),
    ]);

    const expected = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];

    expect(first).toEqual(expected);
    expect(second).toEqual(expected);
  });

  test('all-expired table yields nothing (done immediately)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });

    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1000));
    await db.put('users', { id: 2, name: 'Bob' }, ttl.ms(1000));

    vi.advanceTimersByTime(2000); // both records expired

    const results: User[] = [];

    for await (const r of db.iterate('users')) {
      results.push(r);
    }

    vi.useRealTimers();

    expect(results).toHaveLength(0);
  });
});

describe('createIndexedDB input validation', () => {
  test('throws RangeError for version = 0', () => {
    expect(() => createIndexedDB({ name: 'bad-version', schema: userSchema, version: 0 })).toThrow(RangeError);
    expect(() => createIndexedDB({ name: 'bad-version', schema: userSchema, version: 0 })).toThrow('positive integer');
  });

  test('throws RangeError for negative version', () => {
    expect(() => createIndexedDB({ name: 'bad-version', schema: userSchema, version: -1 })).toThrow(RangeError);
  });

  test('throws RangeError for non-integer version', () => {
    expect(() => createIndexedDB({ name: 'bad-version', schema: userSchema, version: 1.5 })).toThrow(RangeError);
  });

  test('accepts version = 1 (default)', () => {
    const adapter = createIndexedDB({ name: 'good-version', schema: userSchema, version: 1 });

    adapter.dispose();
  });

  test('accepts version = 2', () => {
    const adapter = createIndexedDB({ name: 'good-version-2', schema: userSchema, version: 2 });

    adapter.dispose();
  });
});

/* -------------------- Secondary indexes (F5) -------------------- */

describe('Secondary indexes (F5)', () => {
  type Product = { category: string; id: number; name: string; price: number };

  const indexedSchema = {
    products: table<Product>('id').index('category').index('name'),
  };

  let db: ReturnType<typeof createIndexedDB<typeof indexedSchema>>;

  beforeEach(async () => {
    db = createIndexedDB({ name: 'IDB-indexes', schema: indexedSchema, version: 1 });
    await db.clear('products');
    await db.putAll('products', [
      { category: 'electronics', id: 1, name: 'Laptop', price: 999 },
      { category: 'electronics', id: 2, name: 'Phone', price: 499 },
      { category: 'furniture', id: 3, name: 'Chair', price: 199 },
      { category: 'electronics', id: 4, name: 'Tablet', price: 299 },
    ]);
  });

  afterEach(() => {
    db.dispose();
  });

  test('equals() pushes down to secondary index when field is indexed', async () => {
    const results = await db.query('products').equals('category', 'electronics').toArray();

    expect(results).toHaveLength(3);
    expect(results.map((p) => p.id).sort()).toEqual([1, 2, 4]);
  });

  test('equals() on non-indexed field still returns correct results (in-memory filter)', async () => {
    const results = await db.query('products').equals('price', 499).toArray();

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Phone');
  });

  test('equals() returns empty array when no records match indexed field', async () => {
    const results = await db.query('products').equals('category', 'sports').toArray();

    expect(results).toEqual([]);
  });

  test('between() pushes down to secondary index', async () => {
    const results = await db.query('products').between('name', 'L', 'P\uffff').toArray();

    // Laptop and Phone fall between 'L' and 'P\uffff'
    expect(results.map((p) => p.name).sort()).toEqual(['Laptop', 'Phone']);
  });

  test('startsWith() pushes down to secondary index', async () => {
    const results = await db.query('products').startsWith('name', 'Tab').toArray();

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Tablet');
  });

  test('secondary index query composes with filter()', async () => {
    const results = await db
      .query('products')
      .equals('category', 'electronics')
      .filter((p) => p.price > 400)
      .toArray();

    expect(results.map((p) => p.id).sort()).toEqual([1, 2]);
  });

  test('table().index() chaining creates correct schema entry', () => {
    expect(indexedSchema.products.indexes).toEqual(['category', 'name']);
  });
});
