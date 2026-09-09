import { type KeyValueVaultStore, table, VaultError } from '../index';
import { createMemory } from '../memory';

type Row = { age: number; city: string; id: number; name: string };

const schema = { rows: table<Row>('id') };
const rowsData: Row[] = [
  { age: 25, city: 'Paris', id: 1, name: 'Alice' },
  { age: 30, city: 'Berlin', id: 2, name: 'Bob' },
  { age: 35, city: 'Paris', id: 3, name: 'Charlie' },
];

describe('bound helpers and QueryBuilder', () => {
  let db: KeyValueVaultStore<typeof schema>;

  beforeEach(async () => {
    db = createMemory({ schema });
    await db.putAll('rows', rowsData);
  });

  test('provides common helpers without separate imports', async () => {
    await expect(db.has('rows', 1)).resolves.toBe(true);
    await expect(db.count('rows')).resolves.toBe(3);
    await expect(db.isEmpty('rows')).resolves.toBe(false);
    await expect(db.getMany('rows', [3, 1])).resolves.toEqual([rowsData[2], rowsData[0]]);
    await expect(db.keys('rows', (row) => row.city === 'Paris')).resolves.toEqual([1, 3]);
  });

  test('filters, sorts, and paginates fluently', async () => {
    const result = await db
      .query('rows')
      .filter((row) => row.age > 20)
      .equals('city', 'Paris')
      .orderBy('age', 'desc')
      .offset(0)
      .limit(1)
      .toArray();

    expect(result).toEqual([rowsData[2]]);
  });

  test('counts the filtered set before presentation operations', async () => {
    await expect(db.query('rows').equals('city', 'Paris').limit(1).count()).resolves.toBe(2);
  });

  test('deletes query results', async () => {
    await expect(
      db
        .query('rows')
        .filter((row) => row.age >= 30)
        .delete(),
    ).resolves.toBe(2);
    await expect(db.getAll('rows')).resolves.toEqual([rowsData[0]]);
  });

  test('supports bound update and upsert', async () => {
    await expect(db.update('rows', 1, { city: 'Rome' })).resolves.toMatchObject({ city: 'Rome', id: 1 });
    await expect(db.upsert('rows', 4, () => ({ age: 40, city: 'Paris', id: 4, name: 'Dora' }))).resolves.toMatchObject({
      id: 4,
    });
  });

  test('validates limit and offset', () => {
    expect(() => db.query('rows').limit(-1)).toThrow(VaultError);
    expect(() => db.query('rows').offset(Number.NaN)).toThrow(VaultError);
  });
});
