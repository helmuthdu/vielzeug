import { isEven } from '../isEven';

describe('isEven', () => {
  it('returns true for positive even numbers', () => {
    expect(isEven(0)).toBe(true);
    expect(isEven(2)).toBe(true);
    expect(isEven(1000)).toBe(true);
  });

  it('returns true for negative even numbers', () => {
    expect(isEven(-2)).toBe(true);
    expect(isEven(-1000)).toBe(true);
  });

  it('returns false for positive odd numbers', () => {
    expect(isEven(1)).toBe(false);
    expect(isEven(3)).toBe(false);
    expect(isEven(999)).toBe(false);
  });

  it('returns false for negative odd numbers', () => {
    expect(isEven(-1)).toBe(false);
    expect(isEven(-3)).toBe(false);
    expect(isEven(-999)).toBe(false);
  });

  it('returns false for non-integer numbers', () => {
    expect(isEven(2.5)).toBe(false);
    expect(isEven(-4.1)).toBe(false);
    expect(isEven(0.1)).toBe(false);
  });

  it('returns false for NaN, Infinity, and -Infinity', () => {
    expect(isEven(Number.NaN)).toBe(false);
    expect(isEven(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isEven(Number.NEGATIVE_INFINITY)).toBe(false);
  });

  it('returns false for non-number types', () => {
    expect(isEven('2')).toBe(false);
    expect(isEven(null)).toBe(false);
    expect(isEven(undefined)).toBe(false);
    expect(isEven({})).toBe(false);
    expect(isEven([])).toBe(false);
    expect(isEven(() => 2)).toBe(false);
  });
});
