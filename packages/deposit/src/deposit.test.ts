/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import {
  Deposit,
  type DepositDataSchema,
  type DepositStorageAdapter,
  IndexedDBAdapter,
  LocalStorageAdapter,
  QueryBuilder,
} from './deposit';

// Define a minimal DataSchemaDef for testing
type User = { id: number; name?: string; age?: number; city?: string };
type TestSchemaDef = { users: User };
const userSchema = {
  users: {
    indexes: ['name', 'age', 'city'] as Array<keyof User>,
    key: 'id' as keyof User,
    record: {} as User,
  },
} as const satisfies DepositDataSchema<TestSchemaDef>;

describe('QueryBuilder', () => {
  const sampleData = [
    { age: 25, city: 'Paris', id: 1, name: 'Alice' },
    { age: 30, city: 'Berlin', id: 2, name: 'Bob' },
    { age: 35, city: 'Paris', id: 3, name: 'Charlie' },
  ];

  // Use a mock adapter for QueryBuilder tests
  const mockAdapter = {
    getAll: async (_table: string) => sampleData,
  };

  let builder: QueryBuilder<(typeof sampleData)[0]>;

  beforeEach(() => {
    builder = new QueryBuilder<(typeof sampleData)[0]>(
      mockAdapter as unknown as {
        getAll: (table: string) => Promise<readonly (typeof sampleData)[0][]>;
      } as DepositStorageAdapter<any>,
      'users',
    );
  });

  test('filters with equals', async () => {
    const result = await builder.equals('city', 'Paris').toArray();
    expect(result).toEqual([
      { age: 25, city: 'Paris', id: 1, name: 'Alice' },
      { age: 35, city: 'Paris', id: 3, name: 'Charlie' },
    ]);
  });

  test('filters with between', async () => {
    // Use correct values from sampleData for type safety
    const result = await builder.between('age', 25, 35).toArray();
    expect(result).toEqual([
      { age: 25, city: 'Paris', id: 1, name: 'Alice' },
      { age: 30, city: 'Berlin', id: 2, name: 'Bob' },
      { age: 35, city: 'Paris', id: 3, name: 'Charlie' },
    ]);
  });

  test('startsWith works', async () => {
    const result = await builder.startsWith('name', 'A').toArray();
    expect(result).toEqual([{ age: 25, city: 'Paris', id: 1, name: 'Alice' }]);
  });

  test('orderBy works', async () => {
    const result = await builder.orderBy('age', 'desc').toArray();
    expect(result.map((r) => r.age)).toEqual([35, 30, 25]);
  });

  // groupBy returns T[] in QueryBuilder, so we test grouping logic separately if needed
  test('modify works', async () => {
    // Use a copy to avoid mutating readonly sampleData
    const result = await builder.modify((item) => ({ ...item, age: item.age + 1 })).toArray();
    expect(result.map((r) => r.age)).toEqual([26, 31, 36]);
  });

  test('first/last', async () => {
    expect(await builder.first()).toEqual(sampleData[0]);
    expect(await builder.last()).toEqual(sampleData[2]);
  });

  test('not works', async () => {
    const result = await builder.not((item) => item.city === 'Paris').toArray();
    expect(result).toEqual([{ age: 30, city: 'Berlin', id: 2, name: 'Bob' }]);
  });

  test('and works', async () => {
    const result = await builder
      .and(
        (item) => item.city === 'Paris',
        (item) => item.age > 30,
      )
      .toArray();
    expect(result).toEqual([{ age: 35, city: 'Paris', id: 3, name: 'Charlie' }]);
  });

  test('or works', async () => {
    const result = await builder
      .or(
        (item) => item.city === 'Berlin',
        (item) => item.age === 35,
      )
      .toArray();
    expect(result).toEqual([
      { age: 30, city: 'Berlin', id: 2, name: 'Bob' },
      { age: 35, city: 'Paris', id: 3, name: 'Charlie' },
    ]);
  });

  test('limit works', async () => {
    const result = await builder.limit(2).toArray();
    expect(result.length).toBe(2);
  });

  test('offset works', async () => {
    const result = await builder.offset(1).toArray();
    expect(result).toEqual([
      { age: 30, city: 'Berlin', id: 2, name: 'Bob' },
      { age: 35, city: 'Paris', id: 3, name: 'Charlie' },
    ]);
  });

  test('page works', async () => {
    const result = await builder.page(2, 2).toArray();
    expect(result).toEqual([{ age: 35, city: 'Paris', id: 3, name: 'Charlie' }]);
  });

  test('reverse works', async () => {
    const result = await builder.reverse().toArray();
    expect(result[0]).toEqual({ age: 35, city: 'Paris', id: 3, name: 'Charlie' });
  });

  test('min/max/sum/average work', async () => {
    expect(await builder.min('age')).toEqual({ age: 25, city: 'Paris', id: 1, name: 'Alice' });
    expect(await builder.max('age')).toEqual({ age: 35, city: 'Paris', id: 3, name: 'Charlie' });
    expect(await builder.sum('age')).toBe(90);
    expect(await builder.average('age')).toBeCloseTo(30);
  });

  test('groupBy works', async () => {
    const result = await builder.groupBy('city').toArray();
    // groupBy returns a grouped object: { [key: string]: T[] }
    expect(result).toEqual(
      expect.objectContaining({
        Berlin: [
          {
            age: 30,
            city: 'Berlin',
            id: 2,
            name: 'Bob',
          },
        ],
        Paris: [
          {
            age: 25,
            city: 'Paris',
            id: 1,
            name: 'Alice',
          },
          {
            age: 35,
            city: 'Paris',
            id: 3,
            name: 'Charlie',
          },
        ],
      }),
    );
  });

  test('search works', async () => {
    const result = await builder.search('Alice', 1).toArray();
    expect(result).toEqual([{ age: 25, city: 'Paris', id: 1, name: 'Alice' }]);
  });

  test('reset works', async () => {
    builder.equals('city', 'Paris');
    builder.reset();
    const result = await builder.toArray();
    expect(result.length).toBe(3);
  });

  test('build works', async () => {
    const result = await builder
      .build([
        { field: 'city', type: 'equals', value: 'Paris' },
        { field: 'age', type: 'orderBy', value: 'desc' },
        { type: 'limit', value: 1 },
      ])
      .toArray();
    expect(result).toEqual([{ age: 35, city: 'Paris', id: 3, name: 'Charlie' }]);
  });
});

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter<typeof userSchema>;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter('TestDB', 1, userSchema);
  });

  test('put and get', async () => {
    await adapter.put('users', { id: 1, name: 'Alice' });
    expect(await adapter.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
  });

  test('bulkPut and getAll', async () => {
    await adapter.bulkPut('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    const all = await adapter.getAll('users');
    expect(all.length).toBe(2);
  });

  test('delete works', async () => {
    await adapter.put('users', { id: 1 });
    await adapter.delete('users', 1);
    expect(await adapter.get('users', 1)).toBeUndefined();
  });

  test('clear works', async () => {
    await adapter.put('users', { id: 1 });
    await adapter.clear('users');
    expect(await adapter.getAll('users')).toEqual([]);
  });

  test('bulkDelete works', async () => {
    await adapter.bulkPut('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);
    await adapter.bulkDelete('users', [1, 3]);
    const all = await adapter.getAll('users');
    expect(all).toEqual([{ id: 2, name: 'Bob' }]);
  });

  test('count works', async () => {
    await adapter.bulkPut('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    expect(await adapter.count('users')).toBe(2);
    await adapter.delete('users', 1);
    expect(await adapter.count('users')).toBe(1);
  });

  test('get returns defaultValue if not found', async () => {
    const def = { id: 99, name: 'Default' };
    expect(await adapter.get('users', 99, def)).toBe(def);
  });

  test('getAll returns empty array if table is empty', async () => {
    expect(await adapter.getAll('users')).toEqual([]);
  });

  test('delete non-existent key does not throw', async () => {
    await expect(adapter.delete('users', 999)).resolves.toBeUndefined();
  });

  test('put with TTL expires record', async () => {
    await adapter.put('users', { id: 1, name: 'Alice' }, 1); // 1 ms TTL
    await new Promise((r) => setTimeout(r, 5));
    expect(await adapter.get('users', 1)).toBeUndefined();
  });

  test('get handles corrupted JSON gracefully', async () => {
    const key = 'TestDB:1:users:1';
    localStorage.setItem(key, '{invalid json');
    expect(await adapter.get('users', 1)).toBeUndefined();
    expect(localStorage.getItem(key)).toBeNull(); // Should be cleaned up
  });
});

describe('IndexedDBAdapter', () => {
  let adapter: IndexedDBAdapter<typeof userSchema>;

  beforeEach(async () => {
    adapter = new IndexedDBAdapter('TestDB', 1, userSchema);
    await adapter.clear('users');
  });

  test('put and get', async () => {
    await adapter.put('users', { id: 1, name: 'Alice' });
    expect(await adapter.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
  });

  test('bulkPut and getAll', async () => {
    await adapter.bulkPut('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    const all = await adapter.getAll('users');
    expect(all.length).toBe(2);
  });

  test('delete works', async () => {
    await adapter.put('users', { id: 1 });
    await adapter.delete('users', 1);
    expect(await adapter.get('users', 1)).toBeUndefined();
  });

  test('clear works', async () => {
    await adapter.put('users', { id: 1 });
    await adapter.clear('users');
    expect(await adapter.getAll('users')).toEqual([]);
  });

  test('bulkDelete works', async () => {
    await adapter.bulkPut('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);
    await adapter.bulkDelete('users', [1, 3]);
    const all = await adapter.getAll('users');
    expect(all).toEqual([{ id: 2, name: 'Bob' }]);
  });

  test('count works', async () => {
    await adapter.bulkPut('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    expect(await adapter.count('users')).toBe(2);
    await adapter.delete('users', 1);
    expect(await adapter.count('users')).toBe(1);
  });

  test('get returns defaultValue if not found', async () => {
    const def = { id: 99, name: 'Default' };
    expect(await adapter.get('users', 99, def)).toBe(def);
  });

  test('getAll returns empty array if table is empty', async () => {
    expect(await adapter.getAll('users')).toEqual([]);
  });

  test('delete non-existent key does not throw', async () => {
    await expect(adapter.delete('users', 999)).resolves.toBeUndefined();
  });

  test('put with TTL expires record', async () => {
    await adapter.put('users', { id: 1, name: 'Alice' }, 1); // 1 ms TTL
    await new Promise((r) => setTimeout(r, 5));
    expect(await adapter.get('users', 1)).toBeUndefined();
  });

  test('get handles corrupted JSON gracefully', async () => {
    // IndexedDB does not store raw JSON, so this test is not applicable.
    // But we can test that get on a non-existent key returns undefined.
    expect(await adapter.get('users', 12345)).toBeUndefined();
  });
});

describe('Depot', () => {
  let depot: Deposit<typeof userSchema>;

  beforeEach(() => {
    localStorage.clear();
    depot = new Deposit({
      dbName: 'TestDB',
      schema: userSchema,
      type: 'localStorage',
      version: 1,
    });
  });

  test('basic CRUD', async () => {
    await depot.put('users', { id: 1, name: 'Alice' });
    expect(await depot.get('users', 1)).toEqual({ id: 1, name: 'Alice' });

    await depot.bulkPut('users', [
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);
    expect((await depot.getAll('users')).length).toBe(3);

    await depot.delete('users', 1);
    expect(await depot.get('users', 1)).toBeUndefined();

    await depot.clear('users');
    expect(await depot.getAll('users')).toEqual([]);
  });

  test('bulkDelete removes multiple users', async () => {
    await depot.bulkPut('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);
    await depot.bulkDelete('users', [1, 3]);
    expect(await depot.getAll('users')).toEqual([{ id: 2, name: 'Bob' }]);
  });

  test('bulkDelete with non-existent keys does not throw', async () => {
    await depot.bulkPut('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    await expect(depot.bulkDelete('users', [1, 999])).resolves.toBeUndefined();
    expect(await depot.getAll('users')).toEqual([{ id: 2, name: 'Bob' }]);
  });

  test('bulkPut with TTL stores and expires records', async () => {
    await depot.bulkPut(
      'users',
      [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      1,
    );
    await new Promise((r) => setTimeout(r, 5));
    expect(await depot.getAll('users')).toEqual([]);
  });

  test('clear on empty table does not throw', async () => {
    await expect(depot.clear('users')).resolves.toBeUndefined();
    expect(await depot.getAll('users')).toEqual([]);
  });

  test('count returns correct number after operations', async () => {
    expect(await depot.count('users')).toBe(0);
    await depot.put('users', { id: 1, name: 'Alice' });
    expect(await depot.count('users')).toBe(1);
    await depot.bulkPut('users', [
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);
    expect(await depot.count('users')).toBe(3);
    await depot.delete('users', 2);
    expect(await depot.count('users')).toBe(2);
    await depot.clear('users');
    expect(await depot.count('users')).toBe(0);
  });

  test('delete non-existent key does not throw', async () => {
    await expect(depot.delete('users', 999)).resolves.toBeUndefined();
  });

  test('get returns defaultValue if not found', async () => {
    const def = { id: 99, name: 'Default' };
    expect(await depot.get('users', 99, def)).toBe(def);
  });

  test('put with TTL expires record', async () => {
    await depot.put('users', { id: 1, name: 'Alice' }, 1);
    await new Promise((r) => setTimeout(r, 5));
    expect(await depot.get('users', 1)).toBeUndefined();
  });

  test('query chaining works', async () => {
    await depot.bulkPut('users', [
      { age: 25, id: 1, name: 'Alice' },
      { age: 30, id: 2, name: 'Bob' },
      { age: 28, id: 3, name: 'Charlie' },
    ]);
    const results = await depot.query('users').equals('age', 30).orderBy('id', 'desc').toArray();
    expect(results).toEqual([{ age: 30, id: 2, name: 'Bob' }]);
  });

  test('transaction commits changes atomically', async () => {
    await depot.bulkPut('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    await depot.transaction(['users'], async (stores) => {
      (stores as any).users = stores.users.filter((u) => u.id !== 1);
      stores.users.push({ id: 3, name: 'Charlie' });
    });
    const all = await depot.getAll('users');
    expect(all).toEqual([
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);
  });

  test('transaction throws and does not apply changes on error', async () => {
    await depot.bulkPut('users', [{ id: 1, name: 'Alice' }]);
    await expect(
      depot.transaction(['users'], async () => {
        throw new Error('fail');
      }),
    ).rejects.toThrow('Transaction failed');
    // Data should remain unchanged
    expect(await depot.getAll('users')).toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('patch applies put, delete, and clear operations', async () => {
    await depot.bulkPut('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    await depot.patch('users', [
      { type: 'put', value: { id: 3, name: 'Charlie' } },
      { key: 1, type: 'delete' },
    ]);
    expect(await depot.getAll('users')).toEqual([
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);
    await depot.patch('users', [{ type: 'clear' }]);
    expect(await depot.getAll('users')).toEqual([]);
  });

  test('patch with empty array does nothing', async () => {
    await depot.bulkPut('users', [{ id: 1, name: 'Alice' }]);
    await depot.patch('users', []);
    expect(await depot.getAll('users')).toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('Depot constructor throws on unknown adapter type', () => {
    expect(
      () =>
        new Deposit({
          dbName: 'TestDB',
          schema: userSchema,
          type: 'unknown' as any,
          version: 1,
        }),
    ).toThrow('Unknown adapter type: unknown');
  });
});
