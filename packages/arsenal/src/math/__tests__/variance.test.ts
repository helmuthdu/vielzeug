import { variance } from '../variance';

describe('variance', () => {
  it('computes population variance for a known dataset', () => {
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBe(4);
  });

  it('returns 0 for an empty array', () => {
    expect(variance([])).toBe(0);
  });

  it('returns 0 for a single-element array', () => {
    expect(variance([42])).toBe(0);
  });

  it('returns 0 for all-identical values', () => {
    expect(variance([3, 3, 3, 3])).toBe(0);
  });

  it('accepts a callback for non-number arrays', () => {
    const items = [{ v: 2 }, { v: 4 }, { v: 4 }, { v: 4 }, { v: 5 }, { v: 5 }, { v: 7 }, { v: 9 }];

    expect(variance(items, (x) => x.v)).toBe(4);
  });

  it('computes correct variance for symmetric data', () => {
    expect(variance([1, 3])).toBe(1);
  });
});
