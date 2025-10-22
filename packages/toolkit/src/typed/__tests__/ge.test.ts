import { ge } from '../ge';

describe('ge', () => {
  it('returns true when the first number is greater than the second', () => {
    expect(ge(5, 3)).toBe(true);
    expect(ge(100, -100)).toBe(true);
  });

  it('returns true when the first number is equal to the second', () => {
    expect(ge(5, 5)).toBe(true);
    expect(ge(0, 0)).toBe(true);
    expect(ge(-10, -10)).toBe(true);
  });

  it('returns false when the first number is less than the second', () => {
    expect(ge(3, 5)).toBe(false);
    expect(ge(-100, 100)).toBe(false);
  });

  it('returns false if either argument is not a number', () => {
    expect(ge('5', 3)).toBe(false);
    expect(ge(5, '3')).toBe(false);
    expect(ge('5', '3')).toBe(false);
    expect(ge({}, 1)).toBe(false);
    expect(ge(1, {})).toBe(false);
    expect(ge([], 1)).toBe(false);
    expect(ge(1, [])).toBe(false);
    expect(ge(null, 1)).toBe(false);
    expect(ge(1, null)).toBe(false);
    expect(ge(undefined, 1)).toBe(false);
    expect(ge(1, undefined)).toBe(false);
    expect(ge(true, 1)).toBe(false);
    expect(ge(1, false)).toBe(false);
    expect(ge(() => 1, 1)).toBe(false);
    expect(ge(1, () => 1)).toBe(false);
  });

  it('handles special number values', () => {
    expect(ge(Number.NaN, 1)).toBe(false);
    expect(ge(1, Number.NaN)).toBe(false);
    expect(ge(Number.NaN, Number.NaN)).toBe(false);
    expect(ge(Number.POSITIVE_INFINITY, 1)).toBe(true);
    expect(ge(1, Number.POSITIVE_INFINITY)).toBe(false);
    expect(ge(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)).toBe(true);
    expect(ge(Number.NEGATIVE_INFINITY, 1)).toBe(false);
    expect(ge(1, Number.NEGATIVE_INFINITY)).toBe(true);
    expect(ge(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)).toBe(true);
  });
});
