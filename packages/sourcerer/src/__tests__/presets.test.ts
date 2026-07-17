import { filterContains, filterEquals, filterRange, searchBy, sortBy } from '../presets';

describe('filterContains', () => {
  const items = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'alice' }];

  it('matches case-insensitively by default', () => {
    const pred = filterContains((i: (typeof items)[0]) => i.name, 'alice');

    expect(items.filter(pred)).toEqual([{ name: 'Alice' }, { name: 'alice' }]);
  });

  it('matches case-sensitively when caseSensitive is true', () => {
    const pred = filterContains((i: (typeof items)[0]) => i.name, 'alice', true);

    expect(items.filter(pred)).toEqual([{ name: 'alice' }]);
  });

  it('returns all items when query is empty string', () => {
    const pred = filterContains((i: (typeof items)[0]) => i.name, '');

    expect(items.filter(pred)).toEqual(items);
  });

  it('handles null/undefined values from getter as empty string', () => {
    const data: { name: string | null }[] = [{ name: null }, { name: 'foo' }];
    const pred = filterContains((i: { name: string | null }) => i.name, 'foo');

    expect(data.filter(pred)).toEqual([{ name: 'foo' }]);
  });
});

describe('filterEquals', () => {
  it('matches by strict equality (Object.is)', () => {
    const items = [{ status: 'active' }, { status: 'inactive' }, { status: 'active' }];
    const pred = filterEquals((i: (typeof items)[0]) => i.status, 'active');

    expect(items.filter(pred)).toEqual([{ status: 'active' }, { status: 'active' }]);
  });

  it('distinguishes NaN from NaN (Object.is semantics)', () => {
    const nums = [NaN, 1, NaN, 2];
    const pred = filterEquals((n: number) => n, NaN);

    expect(nums.filter(pred)).toEqual([NaN, NaN]);
  });

  it('returns empty array when no items match', () => {
    const items = [{ v: 1 }, { v: 2 }];
    const pred = filterEquals((i: (typeof items)[0]) => i.v, 99);

    expect(items.filter(pred)).toEqual([]);
  });
});

describe('filterRange', () => {
  const nums = [1, 2, 3, 4, 5];

  it('filters by min bound (inclusive)', () => {
    const pred = filterRange((n: number) => n, { min: 3 });

    expect(nums.filter(pred)).toEqual([3, 4, 5]);
  });

  it('filters by max bound (inclusive)', () => {
    const pred = filterRange((n: number) => n, { max: 3 });

    expect(nums.filter(pred)).toEqual([1, 2, 3]);
  });

  it('filters by both min and max bounds', () => {
    const pred = filterRange((n: number) => n, { max: 4, min: 2 });

    expect(nums.filter(pred)).toEqual([2, 3, 4]);
  });

  it('returns all items when no bounds are set', () => {
    const pred = filterRange((n: number) => n, {});

    expect(nums.filter(pred)).toEqual(nums);
  });

  it('filters Date values by Date min/max bounds', () => {
    const a = new Date('2020-01-01');
    const b = new Date('2021-06-15');
    const c = new Date('2019-03-10');
    const d = new Date('2022-12-01');
    const items = [a, b, c, d];
    const pred = filterRange((date: Date) => date, { max: new Date('2021-12-31'), min: new Date('2020-01-01') });

    expect(items.filter(pred)).toEqual([a, b]);
  });

  it('filters Date values by numeric timestamp bounds', () => {
    const a = new Date('2020-01-01');
    const b = new Date('2021-06-15');
    const items = [a, b];
    const pred = filterRange((date: Date) => date, { min: new Date('2021-01-01').getTime() });

    expect(items.filter(pred)).toEqual([b]);
  });
});

describe('sortBy', () => {
  it('sorts strings ascending by default', () => {
    const items = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }];
    const sorter = sortBy((i: (typeof items)[0]) => i.name);

    expect([...items].sort(sorter).map((i) => i.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('sorts strings descending', () => {
    const items = [{ name: 'Alice' }, { name: 'Charlie' }, { name: 'Bob' }];
    const sorter = sortBy((i: (typeof items)[0]) => i.name, 'desc');

    expect([...items].sort(sorter).map((i) => i.name)).toEqual(['Charlie', 'Bob', 'Alice']);
  });

  it('sorts numbers ascending', () => {
    const items = [3, 1, 2];
    const sorter = sortBy((n: number) => n);

    expect([...items].sort(sorter)).toEqual([1, 2, 3]);
  });

  it('sorts numbers descending', () => {
    const items = [3, 1, 2];
    const sorter = sortBy((n: number) => n, 'desc');

    expect([...items].sort(sorter)).toEqual([3, 2, 1]);
  });

  it('sorts Date values ascending', () => {
    const a = new Date('2020-01-01');
    const b = new Date('2021-06-15');
    const c = new Date('2019-03-10');
    const items = [{ d: a }, { d: b }, { d: c }];
    const sorter = sortBy((i: (typeof items)[0]) => i.d);

    expect([...items].sort(sorter).map((i) => i.d)).toEqual([c, a, b]);
  });

  it('sorts Date values descending', () => {
    const a = new Date('2020-01-01');
    const b = new Date('2021-06-15');
    const c = new Date('2019-03-10');
    const items = [{ d: a }, { d: b }, { d: c }];
    const sorter = sortBy((i: (typeof items)[0]) => i.d, 'desc');

    expect([...items].sort(sorter).map((i) => i.d)).toEqual([b, a, c]);
  });

  it('returns 0 for equal values', () => {
    const sorter = sortBy((n: number) => n);

    expect(sorter(5, 5)).toBe(0);
  });
});

describe('searchBy', () => {
  const users = [
    { active: true, email: 'alice@acme.dev', id: 1, name: 'Alice' },
    { active: false, email: 'bob@acme.dev', id: 2, name: 'Bob' },
    { active: true, email: 'charlie@acme.dev', id: 3, name: 'Charlie' },
  ];

  it('searches a single field case-insensitively by default', () => {
    const search = searchBy((u: (typeof users)[number]) => u.name);

    expect(search(users, 'ali')).toEqual([users[0]]);
  });

  it('searches multiple fields', () => {
    const search = searchBy([(u: (typeof users)[number]) => u.email, (u: (typeof users)[number]) => u.id]);

    expect(search(users, '2')).toEqual([users[1]]);
    expect(search(users, 'charlie@acme')).toEqual([users[2]]);
  });

  it('supports case-sensitive search', () => {
    const search = searchBy((u: (typeof users)[number]) => u.name, { caseSensitive: true });

    expect(search(users, 'alice')).toEqual([]);
    expect(search(users, 'Alice')).toEqual([users[0]]);
  });

  it('returns original items when query is empty', () => {
    const search = searchBy((u: (typeof users)[number]) => u.name);

    expect(search(users, '')).toBe(users);
  });

  it('supports boolean and date values', () => {
    const values = [{ createdAt: new Date('2024-01-01T00:00:00.000Z'), enabled: true }];
    const search = searchBy([
      (item: (typeof values)[number]) => item.enabled,
      (item: (typeof values)[number]) => item.createdAt,
    ]);

    expect(search(values, 'true')).toEqual(values);
    expect(search(values, '2024-01-01')).toEqual(values);
  });
});
