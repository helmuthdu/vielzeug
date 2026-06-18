import { isArray } from '../isArray';
import { isNumber } from '../isNumber';
import { isString } from '../isString';

describe('isArray', () => {
  it('returns true for arrays', () => {
    expect(isArray([])).toBe(true);
    expect(isArray([1, 2, 3])).toBe(true);
    expect(isArray(['a', 'b'])).toBe(true);
  });

  it('returns false for non-arrays', () => {
    expect(isArray('hello')).toBe(false);
    expect(isArray(123)).toBe(false);
    expect(isArray(null)).toBe(false);
    expect(isArray(undefined)).toBe(false);
    expect(isArray({})).toBe(false);
    expect(isArray(new Set([1, 2]))).toBe(false);
  });

  it('returns true when all items pass the itemGuard', () => {
    expect(isArray([1, 2, 3], isNumber)).toBe(true);
    expect(isArray(['a', 'b'], isString)).toBe(true);
  });

  it('returns false when any item fails the itemGuard', () => {
    expect(isArray([1, 'x', 3], isNumber)).toBe(false);
    expect(isArray([1, 2, 3], isString)).toBe(false);
  });

  it('returns true for an empty array with any itemGuard (vacuous truth)', () => {
    expect(isArray([], isNumber)).toBe(true);
    expect(isArray([], isString)).toBe(true);
  });

  it('narrows the type correctly', () => {
    const val: unknown = [1, 2, 3];

    if (isArray(val, isNumber)) {
      const sum: number = val.reduce((a, b) => a + b, 0);

      expect(sum).toBe(6);
    }
  });
});
