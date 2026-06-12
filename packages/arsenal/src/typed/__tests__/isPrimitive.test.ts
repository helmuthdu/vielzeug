import { isPrimitive } from '../isPrimitive';

describe('isPrimitive', () => {
  it('should return true for string values', () => {
    expect(isPrimitive('hello')).toBe(true);
    expect(isPrimitive('')).toBe(true);
  });

  it('should return true for number values', () => {
    expect(isPrimitive(123)).toBe(true);
    expect(isPrimitive(0)).toBe(true);
    expect(isPrimitive(-456)).toBe(true);
    expect(isPrimitive(Number.NaN)).toBe(false); // NaN is not considered a primitive by the utility
  });

  it('should return true for boolean values', () => {
    expect(isPrimitive(true)).toBe(true);
    expect(isPrimitive(false)).toBe(true);
  });

  it('should return false for null and undefined', () => {
    expect(isPrimitive(null)).toBe(false);
    expect(isPrimitive(undefined)).toBe(false);
  });

  it('should return false for objects and arrays', () => {
    expect(isPrimitive({})).toBe(false);
    expect(isPrimitive([])).toBe(false);
    expect(isPrimitive(new Date())).toBe(false);
  });

  it('should return false for functions', () => {
    expect(isPrimitive(() => {})).toBe(false);
    expect(isPrimitive(() => {})).toBe(false);
  });

  it('should return false for symbols', () => {
    expect(isPrimitive(Symbol('test'))).toBe(false);
  });
});
