import { median } from '../median';

describe('median', () => {
  it('returns undefined for empty array', () => {
    expect(median([])).toBeUndefined();
  });

  it('returns the only element for single-element array', () => {
    expect(median([42])).toBe(42);
  });

  it('calculates median for odd-length array of numbers', () => {
    expect(median([1, 3, 2])).toBe(2);
    expect(median([7, 1, 3, 5, 9])).toBe(5);
  });

  it('calculates median for even-length array of numbers', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([10, 2, 8, 4])).toBe(6);
  });

  it('works with negative numbers', () => {
    expect(median([-5, -1, -3])).toBe(-3);
    expect(median([-5, -1, -3, -7])).toBe(-4);
  });

  it('works with a callback extracting a number', () => {
    const arr = [{ v: 1 }, { v: 3 }, { v: 2 }];
    expect(median(arr, (x) => x.v)).toBe(2);
    const arr2 = [{ n: 10 }, { n: 2 }, { n: 8 }, { n: 4 }];
    expect(median(arr2, (x) => x.n)).toBe(6);
  });

  it('works with floats', () => {
    expect(median([1.1, 2.2, 3.3])).toBe(2.2);
    expect(median([1.1, 2.2, 3.3, 4.4])).toBe(2.75);
  });

  it('does not mutate the original array', () => {
    const arr = [3, 1, 2];
    const copy = [...arr];
    median(arr);
    expect(arr).toEqual(copy);
  });
});
