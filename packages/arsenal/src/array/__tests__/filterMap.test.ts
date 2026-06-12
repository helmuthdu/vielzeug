import { filterMap } from '../filterMap';

describe('filterMap', () => {
  it('maps values and drops undefined in one pass', () => {
    const arr = [1, 2, 3, 4];
    const result = filterMap(arr, (x) => (x > 2 ? x * x : undefined));

    expect(result).toEqual([9, 16]);
  });

  it('includes all items when callback always returns values', () => {
    const arr = [null, undefined, 5, 0];
    const result = filterMap(arr, (x) => x);

    expect(result).toEqual([null, 5, 0]);
  });

  it('returns an empty array when callback always returns undefined', () => {
    const arr = [1, 2, 3];
    const result = filterMap(arr, () => undefined);

    expect(result).toEqual([]);
  });

  it('should work with objects', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const result = filterMap(arr, (obj) => (obj.a >= 2 ? obj.a : undefined));

    expect(result).toEqual([2, 3]);
  });

  it('passes index and array to callback', () => {
    const arr = [10, 20, 30];
    let called = false;

    filterMap(arr, (value, index, array) => {
      called = true;
      expect(array).toBe(arr);
      expect(typeof index).toBe('number');

      return value;
    });

    expect(called).toBe(true);
  });

  it('should return an empty array for an empty input array', () => {
    const arr: number[] = [];
    const result = filterMap(arr, (x) => (x > 0 ? x : undefined));

    expect(result).toEqual([]);
  });
});
