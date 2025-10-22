import { isNegative } from '../isNegative';

describe('isNegative', () => {
  it('returns true for negative numbers', () => {
    expect(isNegative(-1)).toBe(true);
    expect(isNegative(-123)).toBe(true);
    expect(isNegative(-0.1)).toBe(true);
    expect(isNegative(Number.MIN_SAFE_INTEGER)).toBe(true);
  });

  it('returns false for positive numbers', () => {
    expect(isNegative(1)).toBe(false);
    expect(isNegative(123)).toBe(false);
    expect(isNegative(0.1)).toBe(false);
    expect(isNegative(Number.MAX_SAFE_INTEGER)).toBe(false);
  });

  it('returns false for zero', () => {
    expect(isNegative(0)).toBe(false);
    expect(isNegative(-0)).toBe(false);
  });

  it('returns false for NaN and infinities', () => {
    expect(isNegative(Number.NaN)).toBe(false);
    expect(isNegative(Number('not-a-number'))).toBe(false);
    expect(isNegative(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('returns false for non-number types', () => {
    expect(isNegative('123')).toBe(false);
    expect(isNegative('hello world')).toBe(false);
    expect(isNegative({})).toBe(false);
    expect(isNegative([])).toBe(false);
    expect(isNegative([1, 2, 3])).toBe(false);
    expect(isNegative(new Date())).toBe(false);
    expect(isNegative(null)).toBe(false);
    expect(isNegative(undefined)).toBe(false);
    expect(isNegative(() => 1)).toBe(false);
    expect(isNegative(true)).toBe(false);
    expect(isNegative(false)).toBe(false);
    expect(isNegative(Symbol('1'))).toBe(false);
  });
});
