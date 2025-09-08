import { gt } from '../gt';

describe('gt', () => {
  it('returns true when the first number is greater than the second', () => {
    expect(gt(5, 3)).toBe(true);
    expect(gt(100, -100)).toBe(true);
    expect(gt(0.1, 0)).toBe(true);
  });

  it('returns false when the first number is equal to the second', () => {
    expect(gt(5, 5)).toBe(false);
    expect(gt(0, 0)).toBe(false);
    expect(gt(-10, -10)).toBe(false);
  });

  it('returns false when the first number is less than the second', () => {
    expect(gt(3, 5)).toBe(false);
    expect(gt(-100, 100)).toBe(false);
    expect(gt(-1, 0)).toBe(false);
  });

  it('returns false if either argument is not a number', () => {
    expect(gt('5', 3)).toBe(false);
    expect(gt(5, '3')).toBe(false);
    expect(gt('5', '3')).toBe(false);
    expect(gt({}, 1)).toBe(false);
    expect(gt(1, {})).toBe(false);
    expect(gt([], 1)).toBe(false);
    expect(gt(1, [])).toBe(false);
    expect(gt(null, 1)).toBe(false);
    expect(gt(1, null)).toBe(false);
    expect(gt(undefined, 1)).toBe(false);
    expect(gt(1, undefined)).toBe(false);
    expect(gt(true, 1)).toBe(false);
    expect(gt(1, false)).toBe(false);
    expect(gt(() => 1, 1)).toBe(false);
    expect(gt(1, () => 1)).toBe(false);
  });

  it('handles special number values', () => {
    expect(gt(Number.NaN, 1)).toBe(false);
    expect(gt(1, Number.NaN)).toBe(false);
    expect(gt(Number.NaN, Number.NaN)).toBe(false);
    expect(gt(Number.POSITIVE_INFINITY, 1)).toBe(true);
    expect(gt(1, Number.POSITIVE_INFINITY)).toBe(false);
    expect(gt(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)).toBe(false);
    expect(gt(Number.NEGATIVE_INFINITY, 1)).toBe(false);
    expect(gt(1, Number.NEGATIVE_INFINITY)).toBe(true);
    expect(gt(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)).toBe(false);
  });
});
