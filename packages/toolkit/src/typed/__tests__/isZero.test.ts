// src/utils/vielzeug.util/typed/__tests__/isZero.test.ts
import { isZero } from '../isZero';

describe('isZero', () => {
  it('returns true for 0 and -0', () => {
    expect(isZero(0)).toBe(true);
    expect(isZero(-0)).toBe(true);
  });

  it('returns false for positive numbers', () => {
    expect(isZero(1)).toBe(false);
    expect(isZero(0.000001)).toBe(false);
    expect(isZero(Number.MAX_SAFE_INTEGER)).toBe(false);
    expect(isZero(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('returns false for negative numbers', () => {
    expect(isZero(-1)).toBe(false);
    expect(isZero(-0.000001)).toBe(false);
    expect(isZero(Number.MIN_SAFE_INTEGER)).toBe(false);
    expect(isZero(Number.NEGATIVE_INFINITY)).toBe(false);
  });

  it('returns false for NaN', () => {
    expect(isZero(Number.NaN)).toBe(false);
    expect(isZero(Number('not-a-number'))).toBe(false);
  });

  it('returns false for non-number types', () => {
    expect(isZero('0')).toBe(false);
    expect(isZero('zero')).toBe(false);
    expect(isZero({})).toBe(false);
    expect(isZero([])).toBe(false);
    expect(isZero([0])).toBe(false);
    expect(isZero(new Date())).toBe(false);
    expect(isZero(null)).toBe(false);
    expect(isZero(undefined)).toBe(false);
    expect(isZero(() => 0)).toBe(false);
    expect(isZero(true)).toBe(false);
    expect(isZero(false)).toBe(false);
    expect(isZero(Symbol('0'))).toBe(false);
  });
});
