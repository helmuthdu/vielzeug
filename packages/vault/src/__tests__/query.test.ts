import { VaultError, createMemory, table, type Adapter } from '../index';

type Row = { age: number; city: string; id: number; name: string };

const schema = { rows: table<Row>('id') };

describe('QueryBuilder (via query)', () => {
  const rowsData: Row[] = [
    { age: 25, city: 'Paris', id: 1, name: 'Alice' },
    { age: 30, city: 'Berlin', id: 2, name: 'Bob' },
    { age: 35, city: 'Paris', id: 3, name: 'Charlie' },
  ];

  let db: Adapter<typeof schema>;

  beforeEach(async () => {
    db = createMemory({ schema });
    await db.putAll('rows', rowsData);
  });

  describe('filters', () => {
    test('filter applies predicate', async () => {
      expect(
        await db
          .query('rows')
          .filter((u) => u.age > 25)
          .toArray(),
      ).toEqual([rowsData[1], rowsData[2]]);
    });

    test('equals filters by exact field value', async () => {
      expect(await db.query('rows').equals('city', 'Paris').toArray()).toEqual([rowsData[0], rowsData[2]]);
    });

    test('between is inclusive', async () => {
      expect(await db.query('rows').between('age', 25, 30).toArray()).toEqual([rowsData[0], rowsData[1]]);
    });

    test('startsWith is case-sensitive by default', async () => {
      expect(await db.query('rows').startsWith('name', 'A').toArray()).toEqual([rowsData[0]]);
      expect(await db.query('rows').startsWith('name', 'a').toArray()).toEqual([]);
    });

    test('startsWith supports case-insensitive matching', async () => {
      expect(await db.query('rows').startsWith('name', 'a', { ignoreCase: true }).toArray()).toEqual([rowsData[0]]);
    });

    test('startsWith on non-string fields returns no matches', async () => {
      expect(
        await db
          .query('rows')
          .startsWith('age' as keyof Row, '2')
          .toArray(),
      ).toEqual([]);
    });
  });

  describe('sorting and pagination', () => {
    test('orderBy sorts ascending', async () => {
      expect((await db.query('rows').orderBy('age', 'asc').toArray()).map((u) => u.id)).toEqual([1, 2, 3]);
    });

    test('orderBy sorts descending', async () => {
      expect((await db.query('rows').orderBy('age', 'desc').toArray()).map((u) => u.id)).toEqual([3, 2, 1]);
    });

    test('limit truncates result set', async () => {
      expect(await db.query('rows').limit(2).toArray()).toEqual([rowsData[0], rowsData[1]]);
    });

    test('offset skips first records', async () => {
      expect(await db.query('rows').offset(1).toArray()).toEqual([rowsData[1], rowsData[2]]);
    });

    test('limit accepts zero', async () => {
      expect(await db.query('rows').limit(0).toArray()).toEqual([]);
    });

    test('offset beyond list length returns empty array', async () => {
      expect(await db.query('rows').offset(99).toArray()).toEqual([]);
    });

    test('limit rejects invalid values', async () => {
      expect(() => db.query('rows').limit(-1)).toThrow(VaultError);
      expect(() => db.query('rows').limit(-1)).toThrow('query.limit must be a non-negative integer');
      expect(() => db.query('rows').limit(1.5)).toThrow(VaultError);
    });

    test('offset rejects invalid values', async () => {
      expect(() => db.query('rows').offset(-1)).toThrow(VaultError);
      expect(() => db.query('rows').offset(-1)).toThrow('query.offset must be a non-negative integer');
      expect(() => db.query('rows').offset(Number.NaN)).toThrow(VaultError);
    });
  });

  describe('terminal operations', () => {
    test('toArray returns full transformed set', async () => {
      const r = await db.query('rows').equals('city', 'Paris').orderBy('age', 'desc').limit(1).toArray();

      expect(r).toEqual([rowsData[2]]);
    });

    test('count returns number of filtered records including pagination', async () => {
      expect(await db.query('rows').equals('city', 'Paris').count()).toBe(2);
    });

    test('count respects limit and offset', async () => {
      expect(await db.query('rows').limit(1).count()).toBe(1);
      expect(await db.query('rows').offset(2).count()).toBe(1);
      expect(await db.query('rows').equals('city', 'Paris').limit(1).count()).toBe(1);
    });

    test('totalCount ignores limit and offset — returns full filtered set size', async () => {
      // Enables paginated total-count queries without a second query
      expect(await db.query('rows').limit(1).totalCount()).toBe(3);
      expect(await db.query('rows').offset(2).totalCount()).toBe(3);
      expect(await db.query('rows').equals('city', 'Paris').limit(1).totalCount()).toBe(2);
    });

    test('totalCount ignores orderBy — does not sort before counting', async () => {
      // orderBy is isNonFilter and must be excluded; result must be the full filtered count
      expect(await db.query('rows').orderBy('age', 'desc').totalCount()).toBe(3);
      expect(await db.query('rows').equals('city', 'Paris').orderBy('age', 'asc').limit(1).totalCount()).toBe(2);
    });

    test('delete removes transformed records and returns count', async () => {
      const deleted = await db
        .query('rows')
        .filter((row) => row.age >= 30)
        .delete();

      expect(deleted).toBe(2);
      expect(await db.getAll('rows')).toEqual([rowsData[0]]);
    });

    test('first returns first transformed record', async () => {
      expect(await db.query('rows').orderBy('age', 'asc').first()).toEqual(rowsData[0]);
    });

    test('first returns undefined for empty result', async () => {
      expect(await db.query('rows').equals('id', 99).first()).toBeUndefined();
    });
  });
});
