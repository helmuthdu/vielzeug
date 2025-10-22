import { isPositive } from '../isPositive';

describe('isPositive', () => {
  it('returns true for positive integers', () => {
    expect(isPositive(1)).toBe(true);
    expect(isPositive(123)).toBe(true);
    expect(isPositive(0.1)).toBe(true);
    expect(isPositive(Number.MAX_SAFE_INTEGER)).toBe(true);
  });

  it('returns false for zero', () => {
    expect(isPositive(0)).toBe(false);
    expect(isPositive(-0)).toBe(false);
  });

  it('returns false for negative numbers', () => {
    expect(isPositive(-1)).toBe(false);
    expect(isPositive(-123)).toBe(false);
    expect(isPositive(-0.1)).toBe(false);
    expect(isPositive(Number.MIN_SAFE_INTEGER)).toBe(false);
  });

  it('returns false for NaN', () => {
    expect(isPositive(Number.NaN)).toBe(false);
    expect(isPositive(Number('not-a-number'))).toBe(false);
  });

  it('returns false for non-number types', () => {
    expect(isPositive('123')).toBe(false);
    expect(isPositive('hello world')).toBe(false);
    expect(isPositive({})).toBe(false);
    expect(isPositive([])).toBe(false);
    expect(isPositive([1, 2, 3])).toBe(false);
    expect(isPositive(new Date())).toBe(false);
    expect(isPositive(null)).toBe(false);
    expect(isPositive(undefined)).toBe(false);
    expect(isPositive(() => 1)).toBe(false);
    expect(isPositive(true)).toBe(false);
    expect(isPositive(false)).toBe(false);
    expect(isPositive(Symbol('1'))).toBe(false);
  });
});
