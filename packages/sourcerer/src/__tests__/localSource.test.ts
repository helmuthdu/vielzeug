import { createLocalSource } from '../localSource';

describe('createLocalSource', () => {
  it('publishes atomic paginated snapshots', () => {
    const source = createLocalSource(['Ada', 'Grace', 'Linus'], {
      initialQuery: { pageSize: 2 },
      match: (value, search) => value.toLowerCase().includes(search.toLowerCase()),
    });

    expect(source.snapshot).toEqual({
      data: ['Ada', 'Grace'],
      error: null,
      isFetching: false,
      pagination: {
        count: 2,
        hasNext: true,
        hasPrevious: false,
        index: 1,
        kind: 'page',
        size: 2,
        total: 3,
      },
      query: { page: 1, pageSize: 2, search: '' },
    });
  });

  it('does not notify for no-op query updates', () => {
    const source = createLocalSource([1, 2], { initialQuery: { pageSize: 2 } });
    const listener = vi.fn();

    source.subscribe(listener);

    source.setQuery({ page: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('resets pagination for search and reports whether data changed', () => {
    const source = createLocalSource(['Ada', 'Grace', 'Linus'], {
      initialQuery: { pageSize: 1 },
      match: (value, search) => value.toLowerCase().includes(search.toLowerCase()),
    });
    const listener = vi.fn();

    source.subscribe(listener);

    source.page.next();
    expect(listener).toHaveBeenCalledTimes(1);
    source.setQuery({ search: 'ada' });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(source.snapshot.data).toEqual(['Ada']);
    expect(source.snapshot.pagination.index).toBe(1);
  });

  it('ignores undefined patch fields and rejects invalid query values', () => {
    const source = createLocalSource([1]);
    const listener = vi.fn();

    source.subscribe(listener);

    source.setQuery({ pageSize: undefined, search: undefined });
    expect(listener).not.toHaveBeenCalled();
    expect(() => source.setQuery({ pageSize: 0 })).toThrow('pageSize must be a positive integer');
  });
});
