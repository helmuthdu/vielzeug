import { isEmpty } from '../isEmpty';

describe('isEmpty', () => {
  it('should return true for null and undefined', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
  });

  it('should return true for empty arrays and objects', () => {
    expect(isEmpty([])).toBe(true);
    expect(isEmpty({})).toBe(true);
  });

  it('should return false for non-empty arrays and objects', () => {
    expect(isEmpty([1, 2, 3])).toBe(false);
    expect(isEmpty({ a: 1, b: 2 })).toBe(false);
  });

  it('should return false for strings, numbers, and other primitives', () => {
    expect(isEmpty('')).toBe(true);
    expect(isEmpty('abc')).toBe(false);
    expect(isEmpty(0)).toBe(false);
    expect(isEmpty(123)).toBe(false);
    expect(isEmpty(true)).toBe(false);
  });
});
