import { createMemory, table, type Adapter } from '../index';

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
    db = createMemory(schema);
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
      await expect(() => db.query('rows').limit(-1)).toThrow('query.limit must be a non-negative integer');
      await expect(() => db.query('rows').limit(1.5)).toThrow('query.limit must be a non-negative integer');
    });

    test('offset rejects invalid values', async () => {
      await expect(() => db.query('rows').offset(-1)).toThrow('query.offset must be a non-negative integer');
      await expect(() => db.query('rows').offset(Number.NaN)).toThrow('query.offset must be a non-negative integer');
    });
  });

  describe('terminal operations', () => {
    test('toArray returns full transformed set', async () => {
      const r = await db.query('rows').equals('city', 'Paris').orderBy('age', 'desc').limit(1).toArray();

      expect(r).toEqual([rowsData[2]]);
    });

    test('count returns number of filtered records', async () => {
      expect(await db.query('rows').equals('city', 'Paris').count()).toBe(2);
    });

    test('count follows the same transformed pipeline as toArray', async () => {
      expect(await db.query('rows').orderBy('age', 'asc').limit(1).count()).toBe(1);
    });

    test('count preserves filter index semantics from transformed pipeline', async () => {
      const toArrayCount = (
        await db
          .query('rows')
          .orderBy('age', 'desc')
          .filter((row, index) => row.id === index + 1)
          .toArray()
      ).length;
      const count = await db
        .query('rows')
        .orderBy('age', 'desc')
        .filter((row, index) => row.id === index + 1)
        .count();

      expect(toArrayCount).toBe(1);
      expect(count).toBe(1);
    });

    test('first returns first transformed record', async () => {
      expect(await db.query('rows').orderBy('age', 'asc').first()).toEqual(rowsData[0]);
    });

    test('first returns undefined for empty result', async () => {
      expect(await db.query('rows').equals('id', 99).first()).toBeUndefined();
    });
  });
});
