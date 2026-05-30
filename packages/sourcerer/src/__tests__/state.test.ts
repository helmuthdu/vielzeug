import { sourceState } from '../state';

const makeSource = (isLoading: boolean, errorMessage: string | null, items: readonly number[]) => ({
  current: items,
  meta: { errorMessage, isLoading },
});

describe('sourceState', () => {
  it('returns loading state when isLoading is true', () => {
    const source = makeSource(true, null, []);
    const state = sourceState(source);

    expect(state).toEqual({ status: 'loading' });
  });

  it('returns error state when errorMessage is set', () => {
    const source = makeSource(false, 'Not found', []);
    const state = sourceState(source);

    expect(state).toEqual({ message: 'Not found', status: 'error' });
  });

  it('returns data state with items when not loading and no error', () => {
    const source = makeSource(false, null, [1, 2, 3]);
    const state = sourceState(source);

    expect(state).toEqual({ items: [1, 2, 3], status: 'data' });
  });

  it('returns data state with empty items when no error', () => {
    const source = makeSource(false, null, []);
    const state = sourceState(source);

    expect(state).toEqual({ items: [], status: 'data' });
  });

  it('loading takes priority over error', () => {
    // Edge case: both isLoading and errorMessage set (e.g. retrying after an error)
    const source = makeSource(true, 'Previous error', []);
    const state = sourceState(source);

    expect(state.status).toBe('loading');
  });

  it('narrows items type in data branch', () => {
    const source = makeSource(false, null, [10, 20]);
    const state = sourceState(source);

    if (state.status === 'data') {
      // TypeScript narrowing — items should be accessible
      expect(state.items[0]).toBe(10);
    }
  });
});
