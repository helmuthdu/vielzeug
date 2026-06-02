import { isNumber } from '../isNumber';

describe('isNumber', () => {
  it('should return true for valid numbers', () => {
    expect(isNumber(123)).toBe(true);
    expect(isNumber(-123)).toBe(true);
    expect(isNumber(0)).toBe(true);
    expect(isNumber(3.14)).toBe(true);
    expect(isNumber(Number.MAX_VALUE)).toBe(true);
  });

  it('should return false for non-number values', () => {
    expect(isNumber('123')).toBe(false);
    expect(isNumber(null)).toBe(false);
    expect(isNumber(undefined)).toBe(false);
    expect(isNumber({})).toBe(false);
    expect(isNumber([])).toBe(false);
    expect(isNumber(true)).toBe(false);
    expect(isNumber(Number.NaN)).toBe(false); // NaN is not considered a valid number
  });
});
