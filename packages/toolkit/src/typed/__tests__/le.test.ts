import { le } from '../le';

describe('le', () => {
  it('returns true when the first number is less than the second', () => {
    expect(le(3, 5)).toBe(true);
    expect(le(-100, 100)).toBe(true);
    expect(le(0, 0.1)).toBe(true);
  });

  it('returns true when the first number is equal to the second', () => {
    expect(le(5, 5)).toBe(true);
    expect(le(0, 0)).toBe(true);
    expect(le(-10, -10)).toBe(true);
  });

  it('returns false when the first number is greater than the second', () => {
    expect(le(5, 3)).toBe(false);
    expect(le(100, -100)).toBe(false);
    expect(le(1, 0)).toBe(false);
  });

  it('returns false if either argument is not a number', () => {
    expect(le('5', 3)).toBe(false);
    expect(le(5, '3')).toBe(false);
    expect(le('5', '3')).toBe(false);
    expect(le({}, 1)).toBe(false);
    expect(le(1, {})).toBe(false);
    expect(le([], 1)).toBe(false);
    expect(le(1, [])).toBe(false);
    expect(le(null, 1)).toBe(false);
    expect(le(1, null)).toBe(false);
    expect(le(undefined, 1)).toBe(false);
    expect(le(1, undefined)).toBe(false);
    expect(le(true, 1)).toBe(false);
    expect(le(1, false)).toBe(false);
    expect(le(() => 1, 1)).toBe(false);
    expect(le(1, () => 1)).toBe(false);
  });

  it('handles special number values', () => {
    expect(le(Number.NaN, 1)).toBe(false);
    expect(le(1, Number.NaN)).toBe(false);
    expect(le(Number.NaN, Number.NaN)).toBe(false);
    expect(le(Number.POSITIVE_INFINITY, 1)).toBe(false);
    expect(le(1, Number.POSITIVE_INFINITY)).toBe(true);
    expect(le(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)).toBe(true);
    expect(le(Number.NEGATIVE_INFINITY, 1)).toBe(true);
    expect(le(1, Number.NEGATIVE_INFINITY)).toBe(false);
    expect(le(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)).toBe(true);
  });
});
