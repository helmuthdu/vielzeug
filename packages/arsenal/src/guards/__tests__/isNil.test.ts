import { isNil } from '../isNil';

describe('isNil', () => {
  it('should return true for null', () => {
    expect(isNil(null)).toBe(true);
  });

  it('should return true for undefined', () => {
    expect(isNil(undefined)).toBe(true);
  });

  it('should return false for false', () => {
    expect(isNil(false)).toBe(false);
  });

  it('should return false for 0', () => {
    expect(isNil(0)).toBe(false);
  });

  it('should return false for an empty string', () => {
    expect(isNil('')).toBe(false);
  });

  it('should return false for an object', () => {
    expect(isNil({})).toBe(false);
  });

  it('should return false for an array', () => {
    expect(isNil([])).toBe(false);
  });
});
