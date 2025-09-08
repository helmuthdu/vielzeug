import { isOdd } from '../isOdd';

describe('isOdd', () => {
  it('returns true for positive odd numbers', () => {
    expect(isOdd(1)).toBe(true);
    expect(isOdd(3)).toBe(true);
    expect(isOdd(999)).toBe(true);
  });

  it('returns true for negative odd numbers', () => {
    expect(isOdd(-1)).toBe(true);
    expect(isOdd(-3)).toBe(true);
    expect(isOdd(-999)).toBe(true);
  });

  it('returns false for positive even numbers', () => {
    expect(isOdd(0)).toBe(false);
    expect(isOdd(2)).toBe(false);
    expect(isOdd(1000)).toBe(false);
  });

  it('returns false for negative even numbers', () => {
    expect(isOdd(-2)).toBe(false);
    expect(isOdd(-1000)).toBe(false);
  });

  it('returns false for non-integer numbers', () => {
    expect(isOdd(1.5)).toBe(false);
    expect(isOdd(-3.7)).toBe(false);
    expect(isOdd(0.1)).toBe(false);
  });

  it('returns false for NaN, Infinity, and -Infinity', () => {
    expect(isOdd(Number.NaN)).toBe(false);
    expect(isOdd(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isOdd(Number.NEGATIVE_INFINITY)).toBe(false);
  });

  it('returns false for non-number types', () => {
    expect(isOdd('1' as any)).toBe(false);
    expect(isOdd(null as any)).toBe(false);
    expect(isOdd(undefined as any)).toBe(false);
    expect(isOdd({} as any)).toBe(false);
    expect(isOdd([] as any)).toBe(false);
    expect(isOdd(() => 1 as any)).toBe(false);
  });
});
