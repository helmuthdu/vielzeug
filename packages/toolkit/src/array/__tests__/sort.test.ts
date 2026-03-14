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

  it('should handle objects by stringifying them in ascending order', () => {
    const data = [{ value: { b: 2 } }, { value: { a: 1 } }, { value: { c: 3 } }];
    const result = sort(data, (item) => item.value);

    expect(result).toEqual([{ value: { a: 1 } }, { value: { b: 2 } }, { value: { c: 3 } }]);
  });

  it('should handle objects by stringifying them in descending order', () => {
    const data = [{ value: { b: 2 } }, { value: { a: 1 } }, { value: { c: 3 } }];
    const result = sort(data, (item) => item.value, 'desc');

    expect(result).toEqual([{ value: { c: 3 } }, { value: { b: 2 } }, { value: { a: 1 } }]);
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
      { age: 30, name: 'Alice' },
      { age: 25, name: 'Alice' },
      { age: 30, name: 'Bob' },
      { age: 25, name: 'Bob' },
      { age: 35, name: 'Charlie' },
      { age: 30, name: 'Charlie' },
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
});
