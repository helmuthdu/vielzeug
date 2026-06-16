import { isAbortError } from '../isAbortError';

describe('isAbortError', () => {
  it('returns true for an Error with name AbortError', () => {
    const err = new Error('aborted');

    err.name = 'AbortError';
    expect(isAbortError(err)).toBe(true);
  });

  it('returns true for an AbortError thrown by AbortSignal.throwIfAborted', () => {
    const ac = new AbortController();

    ac.abort();

    let caught: unknown;

    try {
      ac.signal.throwIfAborted();
    } catch (e) {
      caught = e;
    }

    expect(isAbortError(caught)).toBe(true);
  });

  it('returns false for a plain Error', () => {
    expect(isAbortError(new Error('oops'))).toBe(false);
  });

  it('returns false for a non-Error value', () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError('AbortError')).toBe(false);
    expect(isAbortError(42)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
  });

  it('returns false for a TypeError (different name)', () => {
    expect(isAbortError(new TypeError('nope'))).toBe(false);
  });
});
