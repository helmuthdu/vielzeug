import { sourceState } from '../state';
import { SourceDisposedError, SourcererError, SourceTimeoutError } from '../types';

const makeSource = (isLoading: boolean, error: SourcererError | null, items: readonly number[]) => ({
  current: items,
  meta: { error, isLoading },
});

describe('sourceState', () => {
  it('returns loading state when isLoading is true', () => {
    const source = makeSource(true, null, []);
    const state = sourceState(source);

    expect(state).toEqual({ status: 'loading' });
  });

  it('returns error state when error is set', () => {
    const err = new SourcererError('Not found');
    const source = makeSource(false, err, []);
    const state = sourceState(source);

    expect(state.status).toBe('error');

    if (state.status === 'error') {
      expect(state.error).toBe(err);
      expect(state.error.message).toBe('Not found');
    }
  });

  it('returns success state with items when not loading and no error', () => {
    const source = makeSource(false, null, [1, 2, 3]);
    const state = sourceState(source);

    expect(state).toEqual({ items: [1, 2, 3], status: 'success' });
  });

  it('returns success state with empty items when no error', () => {
    const source = makeSource(false, null, []);
    const state = sourceState(source);

    expect(state).toEqual({ items: [], status: 'success' });
  });

  it('loading takes priority over error', () => {
    const err = new SourcererError('Previous error');
    const source = makeSource(true, err, []);
    const state = sourceState(source);

    expect(state.status).toBe('loading');
  });

  it('narrows items type in data branch', () => {
    const source = makeSource(false, null, [10, 20]);
    const state = sourceState(source);

    if (state.status === 'success') {
      expect(state.items[0]).toBe(10);
    }
  });

  it('SourcererError carries message, cause, and context', () => {
    const cause = new TypeError('network');
    const err = new SourcererError('Request failed', {
      cause,
      context: { kind: 'remote', limit: 10, page: 1 },
    });

    expect(err.message).toBe('Request failed');
    expect(err.cause).toBe(cause);
    expect(err.context).toEqual({ kind: 'remote', limit: 10, page: 1 });
    expect(err.name).toBe('SourcererError');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SourcererError);
  });

  it('SourcererError defaults attempt to 0', () => {
    const err = new SourcererError('fail');

    expect(err.attempt).toBe(0);
  });

  it('SourcererError stores attempt number', () => {
    const err = new SourcererError('fail', { attempt: 3 });

    expect(err.attempt).toBe(3);
  });

  it('SourceTimeoutError is instanceof Error and SourceTimeoutError', () => {
    const err = new SourceTimeoutError(500);

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SourceTimeoutError);
    expect(err.name).toBe('SourceTimeoutError');
    expect(err.message).toBe('Source.ready() timed out after 500ms');
  });

  it('SourceDisposedError is instanceof Error and SourcererError with the expected message', () => {
    const err = new SourceDisposedError();

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SourcererError);
    expect(err).toBeInstanceOf(SourceDisposedError);
    expect(err.name).toBe('SourceDisposedError');
    expect(err.message).toBe('Source disposed while waiting for ready()');
  });

  it('SourcererError.is() narrows SourcererError and its subclasses, rejects everything else', () => {
    expect(SourcererError.is(new SourcererError('fail'))).toBe(true);
    expect(SourcererError.is(new SourceTimeoutError(100))).toBe(true);
    expect(SourcererError.is(new SourceDisposedError())).toBe(true);
    expect(SourcererError.is(new Error('plain'))).toBe(false);
    expect(SourcererError.is('not an error')).toBe(false);
    expect(SourcererError.is(null)).toBe(false);
    expect(SourcererError.is(undefined)).toBe(false);
  });

  it('returns loading when isSearchPending is true (even if isLoading is false)', () => {
    const source = { current: [1, 2], meta: { error: null, isLoading: false, isSearchPending: true } };
    const state = sourceState(source);

    expect(state.status).toBe('loading');
  });

  it('returns success when isSearchPending is false', () => {
    const source = { current: [1, 2], meta: { error: null, isLoading: false, isSearchPending: false } };
    const state = sourceState(source);

    expect(state).toEqual({ items: [1, 2], status: 'success' });
  });

  it('returns success when isSearchPending is absent', () => {
    const source = { current: [1], meta: { error: null, isLoading: false } };
    const state = sourceState(source);

    expect(state.status).toBe('success');
  });
});
