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
    db = createMemory({ schema });
    await db.putAll('rows', rowsData);
  });

  test('filter', async () => {
    expect(
      await db
        .query('rows')
        .filter((u) => u.age > 25)
        .toArray(),
    ).toEqual([rowsData[1], rowsData[2]]);
  });

  test('equals', async () => {
    expect(await db.query('rows').equals('city', 'Paris').toArray()).toEqual([rowsData[0], rowsData[2]]);
  });

  test('between (inclusive)', async () => {
    expect(await db.query('rows').between('age', 25, 30).toArray()).toEqual([rowsData[0], rowsData[1]]);
  });

  test('startsWith (case-sensitive and insensitive)', async () => {
    expect(await db.query('rows').startsWith('name', 'A').toArray()).toEqual([rowsData[0]]);
    expect(await db.query('rows').startsWith('name', 'a').toArray()).toEqual([]);
    expect(await db.query('rows').startsWith('name', 'a', { ignoreCase: true }).toArray()).toEqual([rowsData[0]]);
  });

  test('orderBy asc and desc', async () => {
    expect((await db.query('rows').orderBy('age', 'asc').toArray()).map((u) => u.id)).toEqual([1, 2, 3]);
    expect((await db.query('rows').orderBy('age', 'desc').toArray()).map((u) => u.id)).toEqual([3, 2, 1]);
  });

  test('limit and offset', async () => {
    expect(await db.query('rows').limit(2).toArray()).toEqual([rowsData[0], rowsData[1]]);
    expect(await db.query('rows').offset(1).toArray()).toEqual([rowsData[1], rowsData[2]]);
  });

  test('count', async () => {
    expect(await db.query('rows').equals('city', 'Paris').count()).toBe(2);
  });

  test('count ignores pagination', async () => {
    expect(await db.query('rows').orderBy('age', 'asc').limit(1).count()).toBe(3);
  });

  test('first', async () => {
    expect(await db.query('rows').orderBy('age', 'asc').first()).toEqual(rowsData[0]);
  });

  test('chain composition', async () => {
    const r = await db.query('rows').equals('city', 'Paris').orderBy('age', 'desc').limit(1).toArray();

    expect(r).toEqual([rowsData[2]]);
  });
});
