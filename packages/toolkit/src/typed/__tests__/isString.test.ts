import { isString } from '../isString';

describe('isString', () => {
  it('should return true for a string', () => {
    expect(isString('Hello World')).toBe(true);
    expect(isString('')).toBe(true);
  });

  it('should return false for non-string values', () => {
    expect(isString(123)).toBe(false);
    expect(isString(true)).toBe(false);
    expect(isString(null)).toBe(false);
    expect(isString(undefined)).toBe(false);
    expect(isString({})).toBe(false);
    expect(isString([])).toBe(false);
    expect(isString(Symbol('test'))).toBe(false);
  });

  it('should return false for objects with a toString method', () => {
    const objWithToString = { toString: () => 'I am a string' };
    expect(isString(objWithToString)).toBe(false);
  });
});
