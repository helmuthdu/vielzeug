import { QueryBuilder } from '../index';

describe('QueryBuilder', () => {
  const rows = [
    { age: 25, city: 'Paris', id: 1, name: 'Alice' },
    { age: 30, city: 'Berlin', id: 2, name: 'Bob' },
    { age: 35, city: 'Paris', id: 3, name: 'Charlie' },
  ];

  let qb: QueryBuilder<(typeof rows)[0]>;

  beforeEach(() => {
    qb = new QueryBuilder(async () => rows);
  });

  test('filter', async () => {
    expect(await qb.filter((u) => u.age > 25).toArray()).toEqual([rows[1], rows[2]]);
  });

  test('equals', async () => {
    expect(await qb.equals('city', 'Paris').toArray()).toEqual([rows[0], rows[2]]);
  });

  test('between (inclusive)', async () => {
    expect(await qb.between('age', 25, 30).toArray()).toEqual([rows[0], rows[1]]);
  });

  test('startsWith (case-sensitive and insensitive)', async () => {
    expect(await qb.startsWith('name', 'A').toArray()).toEqual([rows[0]]);
    expect(await qb.startsWith('name', 'a').toArray()).toEqual([]);
    expect(await qb.startsWith('name', 'a', { ignoreCase: true }).toArray()).toEqual([rows[0]]);
  });

  test('orderBy asc and desc', async () => {
    expect((await qb.orderBy('age', 'asc').toArray()).map((u) => u.id)).toEqual([1, 2, 3]);
    expect((await qb.orderBy('age', 'desc').toArray()).map((u) => u.id)).toEqual([3, 2, 1]);
  });

  test('limit and offset', async () => {
    expect(await qb.limit(2).toArray()).toEqual([rows[0], rows[1]]);
    expect(await qb.offset(1).toArray()).toEqual([rows[1], rows[2]]);
  });

  test('count', async () => {
    expect(await qb.equals('city', 'Paris').count()).toBe(2);
  });

  test('chain composition', async () => {
    const r = await qb.equals('city', 'Paris').orderBy('age', 'desc').limit(1).toArray();

    expect(r).toEqual([rows[2]]);
  });
});
