import { isBoolean } from '../isBoolean';

describe('isBoolean', () => {
  it('returns true for true', () => {
    expect(isBoolean(true)).toBe(true);
  });

  it('returns true for false', () => {
    expect(isBoolean(false)).toBe(true);
  });

  it('returns false for numbers', () => {
    expect(isBoolean(123)).toBe(false);
    expect(isBoolean(0)).toBe(false);
    expect(isBoolean(Number.NaN)).toBe(false);
  });

  it('returns false for strings', () => {
    expect(isBoolean('hello world')).toBe(false);
    expect(isBoolean('true')).toBe(false);
    expect(isBoolean('false')).toBe(false);
    expect(isBoolean('')).toBe(false);
  });

  it('returns false for objects', () => {
    expect(isBoolean({})).toBe(false);
    expect(isBoolean([])).toBe(false);
    expect(isBoolean(new Date())).toBe(false);
  });

  it('returns false for null and undefined', () => {
    expect(isBoolean(null)).toBe(false);
    expect(isBoolean(undefined)).toBe(false);
  });

  it('returns false for functions', () => {
    expect(isBoolean(() => {})).toBe(false);
  });

  it('returns false for symbols', () => {
    expect(isBoolean(Symbol('bool'))).toBe(false);
  });
});
