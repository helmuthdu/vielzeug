import { standardDeviation } from '../standardDeviation';

describe('standardDeviation', () => {
  it('computes population std dev for a known dataset', () => {
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
  });

  it('returns 0 for an empty array', () => {
    expect(standardDeviation([])).toBe(0);
  });

  it('returns 0 for a single-element array', () => {
    expect(standardDeviation([7])).toBe(0);
  });

  it('returns 0 for all-identical values', () => {
    expect(standardDeviation([5, 5, 5])).toBe(0);
  });

  it('accepts a callback for non-number arrays', () => {
    const items = [{ v: 2 }, { v: 4 }, { v: 4 }, { v: 4 }, { v: 5 }, { v: 5 }, { v: 7 }, { v: 9 }];

    expect(standardDeviation(items, (x) => x.v)).toBe(2);
  });

  it('equals sqrt of variance', () => {
    const arr = [1, 2, 3, 4, 5];

    expect(standardDeviation(arr)).toBeCloseTo(Math.sqrt(2), 10);
  });
});
