import { abortError } from '../abortError';

describe('abortError', () => {
  it('returns a DOMException when called with no argument', () => {
    const err = abortError();

    expect(err).toBeInstanceOf(DOMException);
    expect((err as DOMException).name).toBe('AbortError');
  });

  it('returns an AbortError DOMException when signal is aborted without a custom reason', () => {
    const ac = new AbortController();

    ac.abort();

    const err = abortError(ac.signal);

    expect((err as DOMException).name).toBe('AbortError');
  });

  it('returns the signal reason when present', () => {
    const ac = new AbortController();
    const reason = new TypeError('custom abort reason');

    ac.abort(reason);
    expect(abortError(ac.signal)).toBe(reason);
  });

  it('returns the reason even when it is a plain string', () => {
    const ac = new AbortController();

    ac.abort('cancelled');
    expect(abortError(ac.signal)).toBe('cancelled');
  });
});
