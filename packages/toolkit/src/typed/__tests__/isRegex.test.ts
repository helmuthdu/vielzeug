import { isRegex } from '../isRegex';

describe('isRegex', () => {
  it('returns true for a RegExp literal', () => {
    expect(isRegex(/abc/)).toBe(true);
  });

  it('returns true for a RegExp object', () => {
    expect(isRegex(/abc/)).toBe(true);
  });

  it('returns false for a string', () => {
    expect(isRegex('abc')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isRegex(123)).toBe(false);
  });

  it('returns false for an object', () => {
    expect(isRegex({})).toBe(false);
  });

  it('returns false for an array', () => {
    expect(isRegex([])).toBe(false);
  });

  it('returns false for null', () => {
    expect(isRegex(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isRegex(undefined)).toBe(false);
  });

  it('returns false for a function', () => {
    expect(isRegex(() => /abc/)).toBe(false);
  });

  it('returns false for a boolean', () => {
    expect(isRegex(true)).toBe(false);
    expect(isRegex(false)).toBe(false);
  });
});
