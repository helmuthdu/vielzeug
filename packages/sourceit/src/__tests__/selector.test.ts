import type { BaseSource } from '../types';

import { subscribeSelector } from '../selector';

describe('subscribeSelector', () => {
  const createFakeSource = () => {
    const listeners = new Set<() => void>();
    let page = 1;

    const source: BaseSource<number> = {
      get current() {
        return [page];
      },
      get meta() {
        return {
          errorMessage: null,
          hasNoItems: false,
          isFirstPage: page === 1,
          isLastPage: false,
          isLoading: false,
          isPending: false,
          itemEndIndex: page,
          itemStartIndex: page,
          pageCount: 10,
          pageNumber: page,
          pageSize: 1,
          totalItems: 10,
        };
      },
      subscribe(listener) {
        listeners.add(listener);

        return () => listeners.delete(listener);
      },
    };

    return {
      emit() {
        for (const listener of listeners) {
          listener();
        }
      },
      setPage(next: number) {
        page = next;
      },
      source,
    };
  };

  it('notifies when selected value changes', () => {
    const fixture = createFakeSource();
    const listener = vi.fn();

    subscribeSelector(fixture.source, (source) => source.meta.pageNumber, listener);

    fixture.setPage(2);
    fixture.emit();

    expect(listener).toHaveBeenCalledWith(2, 1);
  });

  it('does not notify when selected value is equal', () => {
    const fixture = createFakeSource();
    const listener = vi.fn();

    subscribeSelector(fixture.source, (source) => source.meta.pageNumber, listener);

    fixture.setPage(1);
    fixture.emit();

    expect(listener).not.toHaveBeenCalled();
  });

  it('stops notifying after unsubscribe', () => {
    const fixture = createFakeSource();
    const listener = vi.fn();

    const unsubscribe = subscribeSelector(fixture.source, (source) => source.meta.pageNumber, listener);

    unsubscribe();
    fixture.setPage(3);
    fixture.emit();

    expect(listener).not.toHaveBeenCalled();
  });
});
