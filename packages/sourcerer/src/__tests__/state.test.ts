import { sourceState } from '../state';
import { SourceError, SourceTimeoutError } from '../types';

const makeSource = (isLoading: boolean, error: SourceError | null, items: readonly number[]) => ({
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
    const err = new SourceError('Not found');
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
    const err = new SourceError('Previous error');
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

  it('SourceError carries message, cause, and context', () => {
    const cause = new TypeError('network');
    const err = new SourceError('Request failed', {
      cause,
      context: { kind: 'remote', limit: 10, page: 1 },
    });

    expect(err.message).toBe('Request failed');
    expect(err.cause).toBe(cause);
    expect(err.context).toEqual({ kind: 'remote', limit: 10, page: 1 });
    expect(err.name).toBe('SourceError');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SourceError);
  });

  it('SourceError defaults attempt to 0', () => {
    const err = new SourceError('fail');

    expect(err.attempt).toBe(0);
  });

  it('SourceError stores attempt number', () => {
    const err = new SourceError('fail', { attempt: 3 });

    expect(err.attempt).toBe(3);
  });

  it('SourceTimeoutError is instanceof Error and SourceTimeoutError', () => {
    const err = new SourceTimeoutError(500);

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SourceTimeoutError);
    expect(err.name).toBe('SourceTimeoutError');
    expect(err.message).toBe('Source.ready() timed out after 500ms');
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
