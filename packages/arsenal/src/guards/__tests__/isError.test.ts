import { isError } from '../isError';

describe('isError', () => {
  it('returns true for Error instance', () => {
    expect(isError(new Error('oops'))).toBe(true);
  });

  it('returns true for Error subclasses', () => {
    expect(isError(new TypeError('bad'))).toBe(true);
    expect(isError(new RangeError('range'))).toBe(true);
  });

  it('returns false for non-Error values', () => {
    expect(isError(null)).toBe(false);
    expect(isError(undefined)).toBe(false);
    expect(isError('oops')).toBe(false);
    expect(isError({ message: 'oops' })).toBe(false);
    expect(isError(42)).toBe(false);
  });
});
