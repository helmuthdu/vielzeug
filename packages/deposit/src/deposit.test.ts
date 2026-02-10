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

  const mockAdapter = {
    getAll: async (_table: string) => sampleData,
  };

  let builder: QueryBuilder<(typeof sampleData)[0]>;

  beforeEach(() => {
    builder = new QueryBuilder<(typeof sampleData)[0]>(
      mockAdapter as unknown as DepositStorageAdapter<any>,
      'users',
    );
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

    test('not', async () => {
      const result = await builder.not((item) => item.city === 'Paris').toArray();
      expect(result).toEqual([{ age: 30, city: 'Berlin', id: 2, name: 'Bob' }]);
    });

    test('and combines multiple predicates', async () => {
      const result = await builder
        .and(
          (item) => item.city === 'Paris',
          (item) => item.age > 30,
        )
        .toArray();
      expect(result).toEqual([{ age: 35, city: 'Paris', id: 3, name: 'Charlie' }]);
    });

    test('or combines predicates with OR logic', async () => {
      const result = await builder
        .or(
          (item) => item.city === 'Berlin',
          (item) => item.age === 35,
        )
        .toArray();
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

    test('min and max', async () => {
      expect(await builder.min('age')).toEqual({ age: 25, city: 'Paris', id: 1, name: 'Alice' });
      expect(await builder.max('age')).toEqual({ age: 35, city: 'Paris', id: 3, name: 'Charlie' });
    });

    test('sum and average', async () => {
      expect(await builder.sum('age')).toBe(90);
      expect(await builder.average('age')).toBeCloseTo(30);
    });
  });

  describe('Transformations', () => {
    test('modify', async () => {
      const result = await builder.modify((item) => ({ ...item, age: item.age + 1 })).toArray();
      expect(result.map((r) => r.age)).toEqual([26, 31, 36]);
    });

    test('groupBy', async () => {
      const result = await builder.groupBy('city').toArray();
      expect(result).toEqual(
        expect.objectContaining({
          Berlin: [{ age: 30, city: 'Berlin', id: 2, name: 'Bob' }],
          Paris: expect.arrayContaining([
            { age: 25, city: 'Paris', id: 1, name: 'Alice' },
            { age: 35, city: 'Paris', id: 3, name: 'Charlie' },
          ]),
        }),
      );
    });

    test('toGrouped - type-safe grouping', async () => {
      const result = await builder.toGrouped('city');
      expect(result).toHaveLength(2);
      const parisGroup = result.find((g) => g.key === 'Paris');
      expect(parisGroup?.values).toHaveLength(2);
    });

    test('search', async () => {
      const result = await builder.search('Alice', 1).toArray();
      expect(result).toEqual([{ age: 25, city: 'Paris', id: 1, name: 'Alice' }]);
    });
  });

  describe('Utilities', () => {
    test('reset clears operations', async () => {
      builder.equals('city', 'Paris');
      builder.reset();
      const result = await builder.toArray();
      expect(result).toHaveLength(3);
    });

    test('build applies multiple conditions', async () => {
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
});

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter<typeof userSchema>;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter('TestDB', 1, userSchema);
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
      const key = 'TestDB:1:users:1';
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

  describe('Schema Validation', () => {
    test('throws on missing key field in schema', () => {
      const badSchema = { users: { record: {} as User } } as any;
      expect(() => new LocalStorageAdapter('TestDB', 1, badSchema)).toThrow('missing required "key" field');
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

  describe('Schema Validation', () => {
    test('throws on missing key field in schema', () => {
      const badSchema = { users: { record: {} as User } } as any;
      expect(() => new IndexedDBAdapter('TestDB', 1, badSchema)).toThrow('missing required "key" field');
    });
  });
});

describe('Depot', () => {
  let deposit: Deposit<typeof userSchema>;

  beforeEach(() => {
    localStorage.clear();
    deposit = new Deposit({
      dbName: 'TestDB',
      schema: userSchema,
      type: 'localStorage',
      version: 1,
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

  test('transaction commits changes atomically', async () => {
    await deposit.bulkPut('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    await deposit.transaction(['users'], async (stores) => {
      (stores as any).users = stores.users.filter((u) => u.id !== 1);
      stores.users.push({ id: 3, name: 'Charlie' });
    });
    const all = await deposit.getAll('users');
    expect(all).toEqual([
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);
  });

  test('transaction throws and does not apply changes on error', async () => {
    await deposit.bulkPut('users', [{ id: 1, name: 'Alice' }]);
    await expect(
      deposit.transaction(['users'], async () => {
        throw new Error('fail');
      }),
    ).rejects.toThrow('Transaction failed');
    // Data should remain unchanged
    expect(await deposit.getAll('users')).toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('patch applies put, delete, and clear operations', async () => {
    await deposit.bulkPut('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    await deposit.patch('users', [
      { type: 'put', value: { id: 3, name: 'Charlie' } },
      { key: 1, type: 'delete' },
    ]);
    expect(await deposit.getAll('users')).toEqual([
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);
    await deposit.patch('users', [{ type: 'clear' }]);
    expect(await deposit.getAll('users')).toEqual([]);
  });

  test('patch with empty array does nothing', async () => {
    await deposit.bulkPut('users', [{ id: 1, name: 'Alice' }]);
    await deposit.patch('users', []);
    expect(await deposit.getAll('users')).toEqual([{ id: 1, name: 'Alice' }]);
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
