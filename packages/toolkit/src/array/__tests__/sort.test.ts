import { sort } from '../sort';

describe('sort', () => {
  it('should sort numbers in ascending order by default', () => {
    const data = [{ value: 3 }, { value: 1 }, { value: 2 }];
    const result = sort(data, (item) => item.value);
    expect(result).toEqual([{ value: 1 }, { value: 2 }, { value: 3 }]);
  });

  it('should sort numbers in descending order when desc is true', () => {
    const data = [{ value: 3 }, { value: 1 }, { value: 2 }];
    const result = sort(data, (item) => item.value, true);
    expect(result).toEqual([{ value: 3 }, { value: 2 }, { value: 1 }]);
  });

  it('should sort strings in ascending order by default', () => {
    const data = [{ value: 'b' }, { value: 'a' }, { value: 'c' }];
    const result = sort(data, (item) => item.value);
    expect(result).toEqual([{ value: 'a' }, { value: 'b' }, { value: 'c' }]);
  });

  it('should sort strings in descending order when desc is true', () => {
    const data = [{ value: 'b' }, { value: 'a' }, { value: 'c' }];
    const result = sort(data, (item) => item.value, true);
    expect(result).toEqual([{ value: 'c' }, { value: 'b' }, { value: 'a' }]);
  });

  it('should handle undefined values correctly in ascending order', () => {
    const data = [{ value: undefined }, { value: 2 }, { value: 1 }];
    const result = sort(data, (item) => item.value);
    expect(result).toEqual([{ value: 1 }, { value: 2 }, { value: undefined }]);
  });

  it('should handle undefined values correctly in descending order', () => {
    const data = [{ value: undefined }, { value: 2 }, { value: 1 }];
    const result = sort(data, (item) => item.value, true);
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
    const result = sort(data, (item) => item.value, true);
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
    const result = sort(data, (item) => item.value, true);
    expect(result).toEqual([{ value: { c: 3 } }, { value: { b: 2 } }, { value: { a: 1 } }]);
  });

  it('should return an empty array when input is empty', () => {
    // biome-ignore lint/suspicious/noExplicitAny: -
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
