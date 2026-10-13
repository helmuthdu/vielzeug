import { sort } from '../sort';

describe('sort', () => {
  it('should sort numbers in ascending order by default', () => {
    const data = [{ value: 3 }, { value: 1 }, { value: 2 }];
    const result = sort(data, (item) => item.value);

    expect(result).toEqual([{ value: 1 }, { value: 2 }, { value: 3 }]);
  });

  it('should sort numbers in descending order when desc is true', () => {
    const data = [{ value: 3 }, { value: 1 }, { value: 2 }];
    const result = sort(data, (item) => item.value, 'desc');

    expect(result).toEqual([{ value: 3 }, { value: 2 }, { value: 1 }]);
  });

  it('should sort strings in ascending order by default', () => {
    const data = [{ value: 'b' }, { value: 'a' }, { value: 'c' }];
    const result = sort(data, (item) => item.value);

    expect(result).toEqual([{ value: 'a' }, { value: 'b' }, { value: 'c' }]);
  });

  it('should sort strings in descending order when desc is true', () => {
    const data = [{ value: 'b' }, { value: 'a' }, { value: 'c' }];
    const result = sort(data, (item) => item.value, 'desc');

    expect(result).toEqual([{ value: 'c' }, { value: 'b' }, { value: 'a' }]);
  });

  it('should handle undefined values correctly in ascending order', () => {
    const data = [{ value: undefined }, { value: 2 }, { value: 1 }];
    const result = sort(data, (item) => item.value);

    expect(result).toEqual([{ value: 1 }, { value: 2 }, { value: undefined }]);
  });

  it('should handle undefined values correctly in descending order', () => {
    const data = [{ value: undefined }, { value: 2 }, { value: 1 }];
    const result = sort(data, (item) => item.value, 'desc');

    expect(result).toEqual([{ value: undefined }, { value: 2 }, { value: 1 }]);
  });

  it('should sort dates in ascending order by default', () => {
    const data = [
      { value: new Date('2023-01-01') },
      { value: new Date('2022-01-01') },
      { value: new Date('2024-01-01') },
    ];
    const result = sort(data, (item) => item.value);

    expect(result).toEqual([
      { value: new Date('2022-01-01') },
      { value: new Date('2023-01-01') },
      { value: new Date('2024-01-01') },
    ]);
  });

  it('should sort dates in descending order when desc is true', () => {
    const data = [
      { value: new Date('2023-01-01') },
      { value: new Date('2022-01-01') },
      { value: new Date('2024-01-01') },
    ];
    const result = sort(data, (item) => item.value, 'desc');

    expect(result).toEqual([
      { value: new Date('2024-01-01') },
      { value: new Date('2023-01-01') },
      { value: new Date('2022-01-01') },
    ]);
  });

  it('should sort by multiple fields using object selectors', () => {
    const data = [
      { age: 30, name: 'Alice' },
      { age: 25, name: 'Bob' },
      { age: 35, name: 'Charlie' },
      { age: 25, name: 'Alice' },
      { age: 30, name: 'Bob' },
      { age: 30, name: 'Charlie' },
    ];

    expect(sort(data, { age: 'desc', name: 'asc' })).toEqual([
      { age: 35, name: 'Charlie' },
      { age: 30, name: 'Alice' },
      { age: 30, name: 'Bob' },
      { age: 30, name: 'Charlie' },
      { age: 25, name: 'Alice' },
      { age: 25, name: 'Bob' },
    ]);
  });

  it('should sort by a single key using object selector', () => {
    const data = [{ a: 3 }, { a: 1 }, { a: 2 }];

    expect(sort(data, { a: 'asc' })).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
    expect(sort(data, { a: 'desc' })).toEqual([{ a: 3 }, { a: 2 }, { a: 1 }]);
  });

  it('should return an empty array when input is empty', () => {
    const data: any[] = [];
    const result = sort(data, (item) => item.value);

    expect(result).toEqual([]);
  });

  it('should not mutate the original array', () => {
    const data = [{ value: 3 }, { value: 1 }, { value: 2 }];
    const original = [...data];

    sort(data, (item) => item.value);
    expect(data).toEqual(original);
  });

  it('throws TypeError when first argument is not an array', () => {
    expect(() => sort('not an array' as unknown as [], (x) => x)).toThrow(TypeError);
    expect(() => sort(null as unknown as [], (x) => x)).toThrow(TypeError);
    expect(() => sort(42 as unknown as [], (x) => x)).toThrow(TypeError);
  });

  describe('criteria form', () => {
    interface Row {
      address: { city: string };
      age: number;
      name: string;
    }

    const rows: Row[] = [
      { address: { city: 'Berlin' }, age: 30, name: 'Ada' },
      { address: { city: 'Aachen' }, age: 30, name: 'Bo' },
      { address: { city: 'Berlin' }, age: 25, name: 'Cid' },
    ];

    it('orders by a runtime string path', () => {
      expect(sort(rows, [{ key: 'name' }]).map((row) => row.name)).toEqual(['Ada', 'Bo', 'Cid']);
      expect(sort(rows, [{ direction: 'desc', key: 'name' }]).map((row) => row.name)).toEqual(['Cid', 'Bo', 'Ada']);
    });

    it('orders by a nested path', () => {
      expect(sort(rows, [{ key: 'address.city' }, { key: 'age' }]).map((row) => row.name)).toEqual([
        'Bo',
        'Cid',
        'Ada',
      ]);
    });

    it('applies each criterion direction independently', () => {
      expect(sort(rows, [{ key: 'address.city' }, { direction: 'desc', key: 'age' }]).map((row) => row.name)).toEqual([
        'Bo',
        'Ada',
        'Cid',
      ]);
    });

    it('keeps input order on ties', () => {
      const tied = [
        { group: 'a', id: 1 },
        { group: 'a', id: 2 },
        { group: 'a', id: 3 },
      ];

      expect(sort(tied, [{ key: 'group' }])).toEqual(tied);
    });

    it('sorts an empty list and a single criterion list', () => {
      expect(sort<Row>([], [{ key: 'name' }])).toEqual([]);
      expect(sort(rows, [])).toEqual(rows);
    });

    it('treats a missing path as undefined, which sorts last', () => {
      const sparse = [{ id: 1 }, { id: 2, name: 'Zed' }, { id: 3 }];

      expect(sort(sparse, [{ key: 'name' }])).toEqual([{ id: 2, name: 'Zed' }, { id: 1 }, { id: 3 }]);
    });

    it('throws when a column mixes value types', () => {
      const junk = [{ v: 1 }, { v: '2' }];

      expect(() => sort(junk, [{ key: 'v' }])).toThrow(TypeError);
    });

    it('refuses prototype-access paths', () => {
      const polluted = [{ v: 2 }, { v: 1 }];

      expect(sort(polluted, [{ key: 'constructor.prototype' }])).toEqual(polluted);
    });

    it('does not mutate the original array', () => {
      const original = [...rows];

      sort(rows, [{ key: 'name' }]);
      expect(rows).toEqual(original);
    });
  });
});
