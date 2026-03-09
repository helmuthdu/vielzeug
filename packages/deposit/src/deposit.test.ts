import { Logit } from '@vielzeug/logit';
import {
  type Adapter,
  createDeposit,
  defineSchema,
  IndexedDBAdapter,
  LocalStorageAdapter,
  QueryBuilder,
} from './deposit';

// Define a minimal DataSchemaDef for testing
type User = { id: number; name?: string; age?: number; city?: string };
type TestSchemaDef = { users: User };

const userSchema = defineSchema<TestSchemaDef>({
  users: {
    indexes: ['name', 'age', 'city'],
    key: 'id',
  },
});

describe('QueryBuilder', () => {
  const sampleData = [
    { age: 25, city: 'Paris', id: 1, name: 'Alice' },
    { age: 30, city: 'Berlin', id: 2, name: 'Bob' },
    { age: 35, city: 'Paris', id: 3, name: 'Charlie' },
  ];

  const mockAdapter = {
    getAll: async (_table: string) => sampleData,
  };

  let builder: QueryBuilder<(typeof sampleData)[0]>;

  beforeEach(() => {
    builder = new QueryBuilder<(typeof sampleData)[0]>(mockAdapter, 'users');
  });

  describe('Filtering', () => {
    test('equals', async () => {
      const result = await builder.equals('city', 'Paris').toArray();
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.city === 'Paris')).toBe(true);
    });

    test('between', async () => {
      const result = await builder.between('age', 25, 35).toArray();
      expect(result).toHaveLength(3);
    });

    test('startsWith', async () => {
      const result = await builder.startsWith('name', 'A').toArray();
      expect(result).toEqual([{ age: 25, city: 'Paris', id: 1, name: 'Alice' }]);
    });

    test('and combines multiple predicates', async () => {
      const result = await builder.filter((item) => item.city === 'Paris' && (item.age ?? 0) > 30).toArray();
      expect(result).toEqual([{ age: 35, city: 'Paris', id: 3, name: 'Charlie' }]);
    });

    test('or combines predicates with OR logic', async () => {
      const result = await builder.filter((item) => item.city === 'Berlin' || item.age === 35).toArray();
      expect(result).toHaveLength(2);
    });
  });

  describe('Ordering and Pagination', () => {
    test('orderBy desc', async () => {
      const result = await builder.orderBy('age', 'desc').toArray();
      expect(result.map((r) => r.age)).toEqual([35, 30, 25]);
    });

    test('limit', async () => {
      const result = await builder.limit(2).toArray();
      expect(result).toHaveLength(2);
    });

    test('offset', async () => {
      const result = await builder.offset(1).toArray();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(2);
    });

    test('page', async () => {
      const result = await builder.page(2, 2).toArray();
      expect(result).toEqual([{ age: 35, city: 'Paris', id: 3, name: 'Charlie' }]);
    });

    test('reverse', async () => {
      const result = await builder.reverse().toArray();
      expect(result[0].id).toBe(3);
    });
  });

  describe('Aggregations', () => {
    test('first and last', async () => {
      expect(await builder.first()).toEqual(sampleData[0]);
      expect(await builder.last()).toEqual(sampleData[2]);
    });
  });

  describe('Transformations', () => {
    test('map', async () => {
      const result = await builder.map((item) => ({ ...item, age: item.age + 1 })).toArray();
      expect(result.map((r) => r.age)).toEqual([26, 31, 36]);
    });

    test('search', async () => {
      const result = await builder.search('Alice', 1).toArray();
      expect(result).toEqual([{ age: 25, city: 'Paris', id: 1, name: 'Alice' }]);
    });
  });

  describe('Utilities', () => {
    test('fluent chaining applies multiple conditions', async () => {
      const result = await builder.equals('city', 'Paris').orderBy('age', 'desc').limit(1).toArray();
      expect(result).toEqual([{ age: 35, city: 'Paris', id: 3, name: 'Charlie' }]);
    });
  });
});

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter<typeof userSchema>;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter('TestDB', userSchema);
  });

  describe('CRUD Operations', () => {
    test('put and get', async () => {
      await adapter.put('users', { id: 1, name: 'Alice' });
      const result = await adapter.get('users', 1);
      expect(result).toEqual({ id: 1, name: 'Alice' });
    });

    test('bulkPut and getAll', async () => {
      await adapter.bulkPut('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      expect(await adapter.getAll('users')).toHaveLength(2);
    });

    test('delete', async () => {
      await adapter.put('users', { id: 1 });
      await adapter.delete('users', 1);
      expect(await adapter.get('users', 1)).toBeUndefined();
    });

    test('bulkDelete', async () => {
      await adapter.bulkPut('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]);
      await adapter.bulkDelete('users', [1, 3]);
      expect(await adapter.getAll('users')).toEqual([{ id: 2, name: 'Bob' }]);
    });

    test('clear', async () => {
      await adapter.bulkPut('users', [{ id: 1 }, { id: 2 }]);
      await adapter.clear('users');
      expect(await adapter.getAll('users')).toEqual([]);
    });

    test('count', async () => {
      await adapter.bulkPut('users', [{ id: 1 }, { id: 2 }]);
      expect(await adapter.count('users')).toBe(2);
      await adapter.delete('users', 1);
      expect(await adapter.count('users')).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    test('get returns defaultValue if not found', async () => {
      const def = { id: 99, name: 'Default' };
      expect(await adapter.get('users', 99, def)).toBe(def);
    });

    test('delete non-existent key does not throw', async () => {
      await expect(adapter.delete('users', 999)).resolves.toBeUndefined();
    });

    test('corrupted JSON is skipped gracefully', async () => {
      const key = 'TestDB:users:1';
      localStorage.setItem(key, '{invalid json');
      expect(await adapter.get('users', 1)).toBeUndefined();
      expect(localStorage.getItem(key)).toBeNull();
    });
  });

  describe('TTL', () => {
    test('put with TTL expires record', async () => {
      await adapter.put('users', { id: 1, name: 'Alice' }, 1);
      await new Promise((r) => setTimeout(r, 5));
      expect(await adapter.get('users', 1)).toBeUndefined();
    });
  });
});

describe('IndexedDBAdapter', () => {
  let adapter: IndexedDBAdapter<typeof userSchema>;

  beforeEach(async () => {
    adapter = new IndexedDBAdapter('TestDB', 1, userSchema);
    await adapter.clear('users');
  });

  describe('CRUD Operations', () => {
    test('put and get', async () => {
      await adapter.put('users', { id: 1, name: 'Alice' });
      expect(await adapter.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    });

    test('bulkPut and getAll', async () => {
      await adapter.bulkPut('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      expect(await adapter.getAll('users')).toHaveLength(2);
    });

    test('delete', async () => {
      await adapter.put('users', { id: 1 });
      await adapter.delete('users', 1);
      expect(await adapter.get('users', 1)).toBeUndefined();
    });

    test('bulkDelete', async () => {
      await adapter.bulkPut('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]);
      await adapter.bulkDelete('users', [1, 3]);
      expect(await adapter.getAll('users')).toEqual([{ id: 2, name: 'Bob' }]);
    });

    test('clear', async () => {
      await adapter.put('users', { id: 1 });
      await adapter.clear('users');
      expect(await adapter.getAll('users')).toEqual([]);
    });

    test('count', async () => {
      await adapter.bulkPut('users', [{ id: 1 }, { id: 2 }]);
      expect(await adapter.count('users')).toBe(2);
      await adapter.delete('users', 1);
      expect(await adapter.count('users')).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    test('get returns defaultValue if not found', async () => {
      const def = { id: 99, name: 'Default' };
      expect(await adapter.get('users', 99, def)).toBe(def);
    });

    test('delete non-existent key does not throw', async () => {
      await expect(adapter.delete('users', 999)).resolves.toBeUndefined();
    });
  });

  describe('TTL', () => {
    test('put with TTL expires record', async () => {
      await adapter.put('users', { id: 1, name: 'Alice' }, 1);
      await new Promise((r) => setTimeout(r, 5));
      expect(await adapter.get('users', 1)).toBeUndefined();
    });
  });

  describe('Transaction', () => {
    test('commits changes', async () => {
      await adapter.bulkPut('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      await adapter.transaction(['users'], async (stores) => {
        stores.users = stores.users.filter((u) => u.id !== 1);
        stores.users.push({ id: 3, name: 'Charlie' });
      });
      expect(await adapter.getAll('users')).toEqual([
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]);
    });

    test('does not apply changes on error', async () => {
      await adapter.bulkPut('users', [{ id: 1, name: 'Alice' }]);
      await expect(
        adapter.transaction(['users'], async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();
      expect(await adapter.getAll('users')).toEqual([{ id: 1, name: 'Alice' }]);
    });
  });
});

describe('Depot', () => {
  let deposit: Adapter<typeof userSchema>;

  beforeEach(() => {
    localStorage.clear();
    deposit = createDeposit({
      dbName: 'TestDB',
      schema: userSchema,
      type: 'localStorage',
    });
  });

  test('basic CRUD', async () => {
    await deposit.put('users', { id: 1, name: 'Alice' });
    expect(await deposit.get('users', 1)).toEqual({ id: 1, name: 'Alice' });

    await deposit.bulkPut('users', [
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);
    expect((await deposit.getAll('users')).length).toBe(3);

    await deposit.delete('users', 1);
    expect(await deposit.get('users', 1)).toBeUndefined();

    await deposit.clear('users');
    expect(await deposit.getAll('users')).toEqual([]);
  });

  test('bulkDelete removes multiple users', async () => {
    await deposit.bulkPut('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);
    await deposit.bulkDelete('users', [1, 3]);
    expect(await deposit.getAll('users')).toEqual([{ id: 2, name: 'Bob' }]);
  });

  test('bulkDelete with non-existent keys does not throw', async () => {
    await deposit.bulkPut('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    await expect(deposit.bulkDelete('users', [1, 999])).resolves.toBeUndefined();
    expect(await deposit.getAll('users')).toEqual([{ id: 2, name: 'Bob' }]);
  });

  test('bulkPut with TTL stores and expires records', async () => {
    await deposit.bulkPut(
      'users',
      [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      1,
    );
    await new Promise((r) => setTimeout(r, 5));
    expect(await deposit.getAll('users')).toEqual([]);
  });

  test('clear on empty table does not throw', async () => {
    await expect(deposit.clear('users')).resolves.toBeUndefined();
    expect(await deposit.getAll('users')).toEqual([]);
  });

  test('count returns correct number after operations', async () => {
    expect(await deposit.count('users')).toBe(0);
    await deposit.put('users', { id: 1, name: 'Alice' });
    expect(await deposit.count('users')).toBe(1);
    await deposit.bulkPut('users', [
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);
    expect(await deposit.count('users')).toBe(3);
    await deposit.delete('users', 2);
    expect(await deposit.count('users')).toBe(2);
    await deposit.clear('users');
    expect(await deposit.count('users')).toBe(0);
  });

  test('delete non-existent key does not throw', async () => {
    await expect(deposit.delete('users', 999)).resolves.toBeUndefined();
  });

  test('get returns defaultValue if not found', async () => {
    const def = { id: 99, name: 'Default' };
    expect(await deposit.get('users', 99, def)).toBe(def);
  });

  test('put with TTL expires record', async () => {
    await deposit.put('users', { id: 1, name: 'Alice' }, 1);
    await new Promise((r) => setTimeout(r, 5));
    expect(await deposit.get('users', 1)).toBeUndefined();
  });

  test('query chaining works', async () => {
    await deposit.bulkPut('users', [
      { age: 25, id: 1, name: 'Alice' },
      { age: 30, id: 2, name: 'Bob' },
      { age: 28, id: 3, name: 'Charlie' },
    ]);
    const results = await deposit.query('users').equals('age', 30).orderBy('id', 'desc').toArray();
    expect(results).toEqual([{ age: 30, id: 2, name: 'Bob' }]);
  });

  test('transaction is atomic for IndexedDB with multiple tables', async () => {
    type Post = { id: number; userId: number; title: string };
    type MultiTableSchema = { users: User; posts: Post };

    const idbSchema = defineSchema<MultiTableSchema>({
      posts: { key: 'id' },
      users: { key: 'id' },
    });

    const idbDeposit = new IndexedDBAdapter('AtomicTestDB', 1, idbSchema);

    await idbDeposit.bulkPut('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    await idbDeposit.bulkPut('posts', [
      { id: 1, title: 'Post 1', userId: 1 },
      { id: 2, title: 'Post 2', userId: 2 },
    ]);

    await idbDeposit.transaction(['users', 'posts'], async (stores) => {
      stores.users = stores.users.filter((u) => u.id !== 1);
      stores.posts = stores.posts.filter((p) => p.userId !== 1);
    });

    expect(await idbDeposit.getAll('users')).toEqual([{ id: 2, name: 'Bob' }]);
    expect(await idbDeposit.getAll('posts')).toEqual([{ id: 2, title: 'Post 2', userId: 2 }]);

    await idbDeposit.clear('users');
    await idbDeposit.clear('posts');
  });

  test('integrates with Logit as custom logger', async () => {
    // Spy on console since Logit outputs to console
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const depositWithLogger = createDeposit({
      dbName: 'LoggerTestDB',
      logger: Logit.scope('createDeposit'),
      schema: userSchema,
      type: 'localStorage',
    });

    // Test that logger is used when handling corrupted data
    const key = 'LoggerTestDB:users:1';
    localStorage.setItem(key, '{invalid json');

    await depositWithLogger.get('users', 1);

    // Verify Logit logged the warning (Logit outputs to the console with its own formatting)
    expect(consoleWarnSpy).toHaveBeenCalled();
    const warnCall = consoleWarnSpy.mock.calls.find((call) =>
      call.some((arg) => typeof arg === 'string' && arg.includes('createDeposit')),
    );
    expect(warnCall).toBeDefined();

    // Restore console.warn
    consoleWarnSpy.mockRestore();

    // Clean up
    localStorage.clear();
  });

  test('uses console as default logger when not provided', async () => {
    // Spy on console.warn to verify default logger behavior
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const depositNoLogger = createDeposit({
      dbName: 'NoLoggerDB',
      schema: userSchema,
      type: 'localStorage',
      // No logger provided - should use console
    });

    // Test that the console is used when handling corrupted data
    const key = 'NoLoggerDB:users:1';
    localStorage.setItem(key, '{invalid json');

    await depositNoLogger.get('users', 1);

    // Verify console.warn was called
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Removing corrupted entry for key: 1'),
      expect.any(Error),
    );

    // Restore console.warn
    consoleWarnSpy.mockRestore();

    // Clean up
    localStorage.clear();
  });
});
