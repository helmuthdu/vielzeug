import { average } from '../average';

describe('average', () => {
  it('returns undefined for empty array', () => {
    expect(average([])).toBeUndefined();
  });

  it('calculates average of numbers', () => {
    expect(average([1, 2, 3, 4, 5])).toBe(3);
    expect(average([10, 20, 30])).toBe(20);
  });

  it('calculates average using a callback', () => {
    const arr = [{ v: 2 }, { v: 4 }, { v: 6 }];

    expect(average(arr, (x) => x.v)).toBe(4);
  });

  it('returns undefined for unsupported types', () => {
    expect(average(['a', 'b', 'c'] as any)).toBeUndefined();
  });

  it('works with booleans and a callback', () => {
    expect(average([true, false, true], (x) => (x ? 1 : 0))).toBeCloseTo(2 / 3);
  });
});
