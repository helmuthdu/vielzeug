import { QueryBuilder } from '../index';

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
      expect(await qb.startsWith('name', 'a', { ignoreCase: true }).toArray()).toEqual([rows[0]]);
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
