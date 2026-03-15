import {
  type Adapter,
  createIndexedDB,
  createLocalStorage,
  defineSchema,
  type IndexedDBHandle,
  QueryBuilder,
  ttl,
} from './deposit';

/* -------------------- Shared types & fixtures -------------------- */

type User = { age?: number; city?: string; id: number; name?: string };
type Post = { id: number; title: string; userId: number };

const userSchema = defineSchema<{ users: User }>({
  users: { indexes: ['name', 'age', 'city'], key: 'id' },
});

const multiSchema = defineSchema<{ posts: Post; users: User }>({
  posts: { key: 'id' },
  users: { key: 'id' },
});

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* ==================== QueryBuilder ==================== */

describe('QueryBuilder', () => {
  const rows = [
    { age: 25, city: 'Paris', id: 1, name: 'Alice' },
    { age: 30, city: 'Berlin', id: 2, name: 'Bob' },
    { age: 35, city: 'Paris', id: 3, name: 'Charlie' },
  ];

  const mock = { getAll: async (_: string) => rows };
  let qb: QueryBuilder<(typeof rows)[0]>;

  beforeEach(() => {
    qb = new QueryBuilder(mock, 'users');
  });

  describe('Filtering', () => {
    test('filter – custom predicate', async () => {
      const r = await qb.filter((u) => (u.age ?? 0) > 25).toArray();

      expect(r).toHaveLength(2);
    });

    test('equals', async () => {
      expect(await qb.equals('city', 'Paris').toArray()).toHaveLength(2);
    });

    test('between – inclusive bounds', async () => {
      const ages = (await qb.between('age', 25, 30).toArray()).map((u) => u.age).sort();

      expect(ages).toEqual([25, 30]);
    });

    test('startsWith – case-sensitive', async () => {
      expect(await qb.startsWith('name', 'A').toArray()).toEqual([rows[0]]);
      expect(await qb.startsWith('name', 'a').toArray()).toEqual([]);
    });

    test('startsWith – case-insensitive', async () => {
      expect(await qb.startsWith('name', 'a', true).toArray()).toEqual([rows[0]]);
    });

    test('and – all predicates must match', async () => {
      const r = await qb
        .and(
          (u) => u.city === 'Paris',
          (u) => (u.age ?? 0) > 30,
        )
        .toArray();

      expect(r).toEqual([rows[2]]);
    });

    test('or – any predicate matches', async () => {
      const r = await qb
        .or(
          (u) => u.city === 'Berlin',
          (u) => u.age === 35,
        )
        .toArray();

      expect(r).toHaveLength(2);
    });
  });

  describe('Sorting & Pagination', () => {
    test('orderBy asc and desc', async () => {
      expect((await qb.orderBy('age', 'asc').toArray()).map((u) => u.age)).toEqual([25, 30, 35]);
      expect((await qb.orderBy('age', 'desc').toArray()).map((u) => u.age)).toEqual([35, 30, 25]);
    });

    test('limit', async () => {
      expect(await qb.limit(2).toArray()).toHaveLength(2);
    });

    test('offset', async () => {
      const r = await qb.offset(2).toArray();

      expect(r).toHaveLength(1);
      expect(r[0].id).toBe(3);
    });

    test('page', async () => {
      expect(await qb.page(1, 2).toArray()).toEqual([rows[0], rows[1]]);
      expect(await qb.page(2, 2).toArray()).toEqual([rows[2]]);
    });

    test('reverse', async () => {
      const r = await qb.reverse().toArray();

      expect(r[0].id).toBe(3);
      expect(r[2].id).toBe(1);
    });
  });

  describe('Transformations', () => {
    test('map', async () => {
      const r = await qb.map((u) => ({ ...u, age: (u.age ?? 0) + 1 })).toArray();

      expect(r.map((u) => u.age)).toEqual([26, 31, 36]);
    });

    test('search', async () => {
      expect(await qb.search('Alice', 1).toArray()).toEqual([rows[0]]);
    });

    test('contains – substring match on specific fields', async () => {
      expect(await qb.contains('paris', ['name']).toArray()).toHaveLength(0);
      expect(await qb.contains('alice', ['name']).toArray()).toHaveLength(1);
      expect(await qb.contains('paris', ['city']).toArray()).toHaveLength(2);
    });

    test('contains – no fields = all string fields', async () => {
      expect(await qb.contains('paris').toArray()).toHaveLength(2);
      expect(await qb.contains('ali').toArray()).toHaveLength(1);
    });
  });

  describe('Terminals', () => {
    test('first / last', async () => {
      expect(await qb.first()).toEqual(rows[0]);
      expect(await qb.last()).toEqual(rows[2]);
    });

    test('count', async () => {
      expect(await qb.equals('city', 'Paris').count()).toBe(2);
    });

    test('asyncIterator – yields all matching records', async () => {
      const collected: (typeof rows)[0][] = [];

      for await (const row of qb.equals('city', 'Paris')) {
        collected.push(row);
      }
      expect(collected).toHaveLength(2);
    });

    test('chaining – filter + sort + limit', async () => {
      const r = await qb.equals('city', 'Paris').orderBy('age', 'desc').limit(1).toArray();

      expect(r).toEqual([rows[2]]);
    });
  });

  describe('Aggregations', () => {
    test('reduce – sum', async () => {
      const total = await qb.reduce((acc, u) => acc + (u.age ?? 0), 0);

      expect(total).toBe(90);
    });

    test('reduce – collect names', async () => {
      const names = await qb.reduce<string[]>((acc, u) => [...acc, u.name ?? ''], []);

      expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    test('reduce – after filter', async () => {
      const total = await qb.equals('city', 'Paris').reduce((acc, u) => acc + (u.age ?? 0), 0);

      expect(total).toBe(60); // Alice (25) + Charlie (35)
    });
  });
});

/* ==================== LocalStorage adapter ==================== */

describe('LocalStorage adapter', () => {
  let db: Adapter<typeof userSchema>;

  beforeEach(() => {
    localStorage.clear();
    db = createLocalStorage({ dbName: 'LS', schema: userSchema });
  });

  describe('CRUD', () => {
    test('put / get', async () => {
      await db.put('users', { id: 1, name: 'Alice' });
      expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    });

    test('put array / getAll', async () => {
      await db.putMany('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      expect(await db.getAll('users')).toHaveLength(2);
    });

    test('patch – returns merged record on hit', async () => {
      await db.put('users', { age: 25, id: 1, name: 'Alice' });
      expect(await db.patch('users', 1, { name: 'Alicia' })).toEqual({ age: 25, id: 1, name: 'Alicia' });
    });

    test('patch – returns undefined when key absent', async () => {
      expect(await db.patch('users', 99, { name: 'Ghost' })).toBeUndefined();
    });

    test('patch – no follow-up get needed', async () => {
      await db.put('users', { age: 25, id: 1, name: 'Alice' });

      const updated = await db.patch('users', 1, { age: 26 });

      expect(updated).toEqual({ age: 26, id: 1, name: 'Alice' });
    });

    test('delete single', async () => {
      await db.put('users', { id: 1 });
      await db.delete('users', 1);
      expect(await db.get('users', 1)).toBeUndefined();
    });

    test('delete array removes only specified keys', async () => {
      await db.putMany('users', [{ id: 1 }, { id: 2 }, { id: 3 }]);
      await db.deleteMany('users', [1, 3]);
      expect(await db.getAll('users')).toEqual([{ id: 2 }]);
    });

    test('deleteAll empties the table', async () => {
      await db.putMany('users', [{ id: 1 }, { id: 2 }]);
      await db.deleteAll('users');
      expect(await db.getAll('users')).toEqual([]);
    });

    test('count tracks live records', async () => {
      expect(await db.count('users')).toBe(0);
      await db.putMany('users', [{ id: 1 }, { id: 2 }]);
      expect(await db.count('users')).toBe(2);
    });

    test('has', async () => {
      await db.put('users', { id: 1 });
      expect(await db.has('users', 1)).toBe(true);
      expect(await db.has('users', 99)).toBe(false);
    });

    test('getOrPut – returns cached value; factory not called', async () => {
      await db.put('users', { id: 1, name: 'Alice' });

      const factory = vi.fn();

      expect(await db.getOrPut('users', 1, factory)).toEqual({ id: 1, name: 'Alice' });
      expect(factory).not.toHaveBeenCalled();
    });

    test('getOrPut – stores factory value on miss', async () => {
      const result = await db.getOrPut('users', 5, () => ({ id: 5, name: 'Eve' }));

      expect(result).toEqual({ id: 5, name: 'Eve' });
      expect(await db.get('users', 5)).toEqual({ id: 5, name: 'Eve' });
    });

    test('getMany – returns only found records', async () => {
      await db.putMany('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      expect(await db.getMany('users', [1, 2, 99])).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    test('getMany – empty keys returns empty array', async () => {
      await db.putMany('users', [{ id: 1, name: 'Alice' }]);
      expect(await db.getMany('users', [])).toEqual([]);
    });

    test('getOrPut – async factory is awaited', async () => {
      const result = await db.getOrPut('users', 7, async () => {
        await Promise.resolve();

        return { id: 7, name: 'Async' };
      });

      expect(result).toEqual({ id: 7, name: 'Async' });
      expect(await db.get('users', 7)).toEqual({ id: 7, name: 'Async' });
    });
  });

  describe('TTL', () => {
    test('record is invisible after TTL expires', async () => {
      await db.put('users', { id: 1, name: 'Alice' }, 1);
      await delay(5);
      expect(await db.get('users', 1)).toBeUndefined();
    });

    test('getAll excludes all expired records', async () => {
      await db.putMany('users', [{ id: 1 }, { id: 2 }], 1);
      await delay(5);
      expect(await db.getAll('users')).toEqual([]);
    });

    test('count excludes expired records', async () => {
      await db.putMany('users', [{ id: 1 }, { id: 2 }], 1);
      await db.put('users', { id: 3 });
      await delay(5);
      expect(await db.count('users')).toBe(1);
    });

    test('update preserves TTL', async () => {
      await db.put('users', { id: 1, name: 'Alice' }, 50);

      const updated = await db.patch('users', 1, { name: 'Alicia' });

      expect(updated).toEqual({ id: 1, name: 'Alicia' });
      await delay(55);
      expect(await db.get('users', 1)).toBeUndefined();
    });

    test('getOrPut with TTL – stored value expires', async () => {
      await db.getOrPut('users', 1, () => ({ id: 1, name: 'Alice' }), 1);
      await delay(5);
      expect(await db.get('users', 1)).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('getOr returns defaultValue when key absent', async () => {
      const fallback = { id: 0, name: 'Fallback' };

      expect(await db.getOr('users', 0, fallback)).toBe(fallback);
    });

    test('delete non-existent key is silent', async () => {
      await expect(db.delete('users', 999)).resolves.toBeUndefined();
    });

    test('deleteAll on empty table is silent', async () => {
      await expect(db.deleteAll('users')).resolves.toBeUndefined();
    });

    test('corrupted entry is evicted and returns undefined', async () => {
      localStorage.setItem('LS:users:1', '{bad json');
      expect(await db.get('users', 1)).toBeUndefined();
      expect(localStorage.getItem('LS:users:1')).toBeNull();
    });

    test('indexes declaration emits a warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      createLocalStorage({ dbName: 'Warn', schema: userSchema });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('indexes'));
      warnSpy.mockRestore();
    });

    test('from filters stored records', async () => {
      await db.putMany('users', [
        { age: 25, id: 1, name: 'Alice' },
        { age: 30, id: 2, name: 'Bob' },
      ]);

      const r = await db.from('users').equals('age', 30).toArray();

      expect(r).toEqual([{ age: 30, id: 2, name: 'Bob' }]);
    });

    test('inline schema without separate defineSchema variable', async () => {
      const inlineDb = createLocalStorage<{ items: { id: number; label: string } }>({
        dbName: 'Inline',
        schema: { items: { key: 'id' } },
      });

      await inlineDb.put('items', { id: 1, label: 'hello' });
      expect(await inlineDb.get('items', 1)).toEqual({ id: 1, label: 'hello' });
    });

    test('checkStorage guards getMany when storage unavailable', async () => {
      const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!;

      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('SecurityError');
        },
      });

      try {
        await expect(db.getMany('users', [1])).rejects.toThrow();
      } finally {
        Object.defineProperty(globalThis, 'localStorage', descriptor);
      }
    });

    test('checkStorage guards patch when storage unavailable', async () => {
      const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!;

      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('SecurityError');
        },
      });

      try {
        await expect(db.patch('users', 1, { name: 'X' })).rejects.toThrow();
      } finally {
        Object.defineProperty(globalThis, 'localStorage', descriptor);
      }
    });
  });
});

/* ==================== IndexedDB adapter ==================== */

describe('IndexedDB adapter', () => {
  let db: IndexedDBHandle<typeof userSchema>;

  beforeEach(async () => {
    db = createIndexedDB({ dbName: 'IDB', schema: userSchema, version: 1 });
    await db.deleteAll('users');
  });

  afterEach(() => {
    db.close();
  });

  describe('CRUD', () => {
    test('put / get', async () => {
      await db.put('users', { id: 1, name: 'Alice' });
      expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    });

    test('put array / getAll', async () => {
      await db.putMany('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      expect(await db.getAll('users')).toHaveLength(2);
    });

    test('patch – returns merged record on hit', async () => {
      await db.put('users', { age: 25, id: 1, name: 'Alice' });
      expect(await db.patch('users', 1, { name: 'Alicia' })).toEqual({ age: 25, id: 1, name: 'Alicia' });
    });

    test('patch – returns undefined when key absent', async () => {
      expect(await db.patch('users', 99, { name: 'Ghost' })).toBeUndefined();
    });

    test('patch – no follow-up get needed', async () => {
      await db.put('users', { age: 25, id: 1, name: 'Alice' });

      const updated = await db.patch('users', 1, { age: 26 });

      expect(updated).toEqual({ age: 26, id: 1, name: 'Alice' });
    });

    test('delete single', async () => {
      await db.put('users', { id: 1 });
      await db.delete('users', 1);
      expect(await db.get('users', 1)).toBeUndefined();
    });

    test('delete array removes only specified keys', async () => {
      await db.putMany('users', [{ id: 1 }, { id: 2 }, { id: 3 }]);
      await db.deleteMany('users', [1, 3]);
      expect(await db.getAll('users')).toEqual([{ id: 2 }]);
    });

    test('deleteAll empties the table', async () => {
      await db.putMany('users', [{ id: 1 }, { id: 2 }]);
      await db.deleteAll('users');
      expect(await db.getAll('users')).toEqual([]);
    });

    test('count tracks live records', async () => {
      expect(await db.count('users')).toBe(0);
      await db.putMany('users', [{ id: 1 }, { id: 2 }]);
      expect(await db.count('users')).toBe(2);
    });

    test('has', async () => {
      await db.put('users', { id: 1 });
      expect(await db.has('users', 1)).toBe(true);
      expect(await db.has('users', 99)).toBe(false);
    });

    test('getOrPut – returns cached value; factory not called', async () => {
      await db.put('users', { id: 1, name: 'Alice' });

      const factory = vi.fn();

      expect(await db.getOrPut('users', 1, factory)).toEqual({ id: 1, name: 'Alice' });
      expect(factory).not.toHaveBeenCalled();
    });

    test('getOrPut – stores factory value on miss', async () => {
      const result = await db.getOrPut('users', 5, () => ({ id: 5, name: 'Eve' }));

      expect(result).toEqual({ id: 5, name: 'Eve' });
      expect(await db.get('users', 5)).toEqual({ id: 5, name: 'Eve' });
    });

    test('getMany – returns only found records', async () => {
      await db.putMany('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      expect(await db.getMany('users', [1, 2, 99])).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    test('getMany – empty keys returns empty array', async () => {
      await db.putMany('users', [{ id: 1, name: 'Alice' }]);
      expect(await db.getMany('users', [])).toEqual([]);
    });

    test('getOrPut – async factory is awaited', async () => {
      const result = await db.getOrPut('users', 7, async () => {
        await Promise.resolve();

        return { id: 7, name: 'Async' };
      });

      expect(result).toEqual({ id: 7, name: 'Async' });
      expect(await db.get('users', 7)).toEqual({ id: 7, name: 'Async' });
    });
  });

  describe('TTL', () => {
    test('record is invisible after TTL expires', async () => {
      await db.put('users', { id: 1, name: 'Alice' }, 1);
      await delay(5);
      expect(await db.get('users', 1)).toBeUndefined();
    });

    test('getAll returns live records and evicts expired from store', async () => {
      await db.putMany('users', [{ id: 1 }, { id: 2 }], 1);
      await db.put('users', { id: 3, name: 'Charlie' });
      await delay(5);
      expect(await db.getAll('users')).toEqual([{ id: 3, name: 'Charlie' }]);
      await delay(0); // let background eviction settle

      const db2 = createIndexedDB({ dbName: 'IDB', schema: userSchema, version: 1 });

      expect(await db2.getAll('users')).toEqual([{ id: 3, name: 'Charlie' }]);
      db2.close();
    });

    test('count excludes expired records', async () => {
      await db.putMany('users', [{ id: 1 }, { id: 2 }], 1);
      await db.put('users', { id: 3 });
      await delay(5);
      expect(await db.count('users')).toBe(1);
    });

    test('update preserves TTL', async () => {
      await db.put('users', { id: 1, name: 'Alice' }, 50);

      const updated = await db.patch('users', 1, { name: 'Alicia' });

      expect(updated).toEqual({ id: 1, name: 'Alicia' });
      await delay(55);
      expect(await db.get('users', 1)).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('getOr returns defaultValue when key absent', async () => {
      const fallback = { id: 0, name: 'Fallback' };

      expect(await db.getOr('users', 0, fallback)).toBe(fallback);
    });

    test('delete non-existent key is silent', async () => {
      await expect(db.delete('users', 999)).resolves.toBeUndefined();
    });

    test('from filters stored records', async () => {
      await db.putMany('users', [
        { age: 25, id: 1, name: 'Alice' },
        { age: 30, id: 2, name: 'Bob' },
      ]);

      const r = await db.from('users').equals('age', 30).toArray();

      expect(r).toEqual([{ age: 30, id: 2, name: 'Bob' }]);
    });
  });

  describe('Transaction', () => {
    test('put and delete commit atomically', async () => {
      await db.putMany('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      await db.transaction(['users'], async (tx) => {
        await tx.delete('users', 1);
        await tx.put('users', { id: 3, name: 'Charlie' });
      });

      const all = await db.getAll('users');

      expect(all).toContainEqual({ id: 2, name: 'Bob' });
      expect(all).toContainEqual({ id: 3, name: 'Charlie' });
      expect(all.find((u) => u.id === 1)).toBeUndefined();
    });

    test('get inside transaction sees in-flight writes', async () => {
      await db.put('users', { id: 1, name: 'Alice' });

      let seen: User | undefined;

      await db.transaction(['users'], async (tx) => {
        await tx.put('users', { id: 2, name: 'Bob' });
        seen = await tx.get('users', 2);
      });
      expect(seen).toEqual({ id: 2, name: 'Bob' });
    });

    test('patch inside transaction updates atomically', async () => {
      await db.put('users', { age: 25, id: 1, name: 'Alice' });

      let patched: User | undefined;

      await db.transaction(['users'], async (tx) => {
        patched = await tx.patch('users', 1, { age: 26 });
      });
      expect(patched).toEqual({ age: 26, id: 1, name: 'Alice' });
      expect(await db.get('users', 1)).toEqual({ age: 26, id: 1, name: 'Alice' });
    });

    test('getAll inside transaction sees all committed records', async () => {
      await db.putMany('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      let count = 0;

      await db.transaction(['users'], async (tx) => {
        const all = await tx.getAll('users');

        count = all.length;
      });
      expect(count).toBe(2);
    });

    test('changes across multiple tables commit atomically', async () => {
      const multi = createIndexedDB({ dbName: 'Multi', schema: multiSchema, version: 1 });

      await multi.deleteAll('users');
      await multi.deleteAll('posts');
      await multi.putMany('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      await multi.putMany('posts', [
        { id: 1, title: 'P1', userId: 1 },
        { id: 2, title: 'P2', userId: 2 },
      ]);
      await multi.transaction(['users', 'posts'], async (tx) => {
        await tx.delete('users', 1);
        await tx.delete('posts', 1);
      });
      expect(await multi.getAll('users')).toEqual([{ id: 2, name: 'Bob' }]);
      expect(await multi.getAll('posts')).toEqual([{ id: 2, title: 'P2', userId: 2 }]);
      multi.close();
    });

    test('rolls back all changes on callback error', async () => {
      await db.putMany('users', [{ id: 1, name: 'Alice' }]);
      await expect(
        db.transaction(['users'], async (tx) => {
          await tx.put('users', { id: 2, name: 'Bob' });
          throw new Error('fail');
        }),
      ).rejects.toThrow();
      expect(await db.getAll('users')).toEqual([{ id: 1, name: 'Alice' }]);
    });

    test('getMany inside transaction returns matching records', async () => {
      await db.putMany('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]);

      let found: User[] = [];

      await db.transaction(['users'], async (tx) => {
        found = await tx.getMany('users', [1, 3, 99]);
      });
      expect(found).toEqual([
        { id: 1, name: 'Alice' },
        { id: 3, name: 'Charlie' },
      ]);
    });

    test('deleteAll inside transaction clears the table', async () => {
      await db.putMany('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      await db.transaction(['users'], async (tx) => {
        await tx.deleteAll('users');
      });
      expect(await db.getAll('users')).toEqual([]);
    });

    test('putMany inside transaction inserts multiple records', async () => {
      await db.transaction(['users'], async (tx) => {
        await tx.putMany('users', [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ]);
      });
      expect(await db.getAll('users')).toHaveLength(2);
    });

    test('deleteMany inside transaction removes specified keys', async () => {
      await db.putMany('users', [{ id: 1 }, { id: 2 }, { id: 3 }]);

      await db.transaction(['users'], async (tx) => {
        await tx.deleteMany('users', [1, 3]);
      });
      expect(await db.getAll('users')).toEqual([{ id: 2 }]);
    });

    test('getOr inside transaction returns default when missing', async () => {
      const fallback = { id: 99, name: 'Ghost' };

      let result: User | undefined;

      await db.transaction(['users'], async (tx) => {
        result = await tx.getOr('users', 99, fallback);
      });
      expect(result).toBe(fallback);
    });

    test('has inside transaction reflects in-flight writes', async () => {
      let exists = false;

      await db.transaction(['users'], async (tx) => {
        await tx.put('users', { id: 5, name: 'Eve' });
        exists = await tx.has('users', 5);
      });
      expect(exists).toBe(true);
    });

    test('count inside transaction returns native record count', async () => {
      await db.putMany('users', [{ id: 1 }, { id: 2 }, { id: 3 }]);

      let n = 0;

      await db.transaction(['users'], async (tx) => {
        n = await tx.count('users');
      });
      expect(n).toBe(3);
    });

    test('from inside transaction enables query-builder filtering', async () => {
      await db.putMany('users', [
        { age: 25, city: 'Paris', id: 1, name: 'Alice' },
        { age: 30, city: 'Berlin', id: 2, name: 'Bob' },
        { age: 35, city: 'Paris', id: 3, name: 'Charlie' },
      ]);

      let parisians: User[] = [];

      await db.transaction(['users'], async (tx) => {
        parisians = await tx.from('users').equals('city', 'Paris').orderBy('age', 'desc').toArray();
      });
      expect(parisians.map((u) => u.id)).toEqual([3, 1]);
    });
  });

  describe('Lifecycle', () => {
    test('close and reuse reopens the connection', async () => {
      await db.put('users', { id: 1, name: 'Alice' });
      db.close();
      // After close, the next operation should transparently reconnect
      expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    });

    test('migration function is called on first open', async () => {
      const migrationSpy = vi.fn();
      const migDb = createIndexedDB({
        dbName: 'MigrationTest',
        migrationFn: migrationSpy,
        schema: userSchema,
        version: 1,
      });

      await migDb.put('users', { id: 1, name: 'Alice' });
      expect(migrationSpy).toHaveBeenCalledOnce();
      expect(migrationSpy).toHaveBeenCalledWith(
        expect.any(IDBDatabase),
        expect.any(Number),
        1,
        expect.any(IDBTransaction),
      );
      migDb.close();
    });
  });
});

/* ==================== Logger ==================== */

describe('Logger', () => {
  afterEach(() => {
    localStorage.clear();
  });

  test('custom logger receives warnings for corrupted data', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const db = createLocalStorage({
      dbName: 'LogTest',
      logger: {
        error: (...args: unknown[]) => console.error('[deposit-test]', ...args),
        warn: (...args: unknown[]) => console.warn('[deposit-test]', ...args),
      },
      schema: userSchema,
    });

    localStorage.setItem('LogTest:users:1', '{bad json');
    await db.get('users', 1);

    const scopedCall = warnSpy.mock.calls.find((c) =>
      c.some((a) => typeof a === 'string' && a.includes('deposit-test')),
    );

    expect(scopedCall).toBeDefined();
    warnSpy.mockRestore();
  });

  test('console is used as default logger', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const simpleSchema = defineSchema<{ items: { id: number } }>({ items: { key: 'id' } });
    const db = createLocalStorage({ dbName: 'Default', schema: simpleSchema });

    localStorage.setItem('Default:items:1', '{bad json');
    await db.get('items', 1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Removing corrupted entry'), expect.any(Error));
    warnSpy.mockRestore();
  });
});

/* ==================== ttl helpers ==================== */

describe('ttl helpers', () => {
  test('ms passes value through', () => {
    expect(ttl.ms(500)).toBe(500);
  });

  test('seconds converts to milliseconds', () => {
    expect(ttl.seconds(2)).toBe(2000);
  });

  test('minutes converts to milliseconds', () => {
    expect(ttl.minutes(1)).toBe(60_000);
  });

  test('hours converts to milliseconds', () => {
    expect(ttl.hours(1)).toBe(3_600_000);
  });

  test('ttl helpers can be used with put', async () => {
    localStorage.clear();

    const db = createLocalStorage({ dbName: 'TtlHelper', schema: userSchema });

    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1));
    await delay(5);
    expect(await db.get('users', 1)).toBeUndefined();
  });
});
