import { isDefined } from '../isDefined';

describe('isDefined', () => {
  it('returns true for a number', () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined(123)).toBe(true);
    expect(isDefined(-1)).toBe(true);
    expect(isDefined(Number.NaN)).toBe(true);
    expect(isDefined(Number.POSITIVE_INFINITY)).toBe(true);
  });

  it('returns true for a string', () => {
    expect(isDefined('')).toBe(true);
    expect(isDefined('abc')).toBe(true);
  });

  it('returns true for a boolean', () => {
    expect(isDefined(true)).toBe(true);
    expect(isDefined(false)).toBe(true);
  });

  it('returns true for an object', () => {
    expect(isDefined({})).toBe(true);
    expect(isDefined({ a: 1 })).toBe(true);
  });

  it('returns true for an array', () => {
    expect(isDefined([])).toBe(true);
    expect(isDefined([1, 2, 3])).toBe(true);
  });

  it('returns true for a function', () => {
    expect(isDefined(() => {})).toBe(true);
    expect(isDefined(() => {})).toBe(true);
  });

  it('returns true for null', () => {
    expect(isDefined(null)).toBe(true);
  });

  it('returns false for undefined', () => {
    expect(isDefined(undefined)).toBe(false);
  });
});
