import { createLocalSource } from '../localSource';

describe('createLocalSource', () => {
  it('publishes paginated collection state', () => {
    const source = createLocalSource(['Ada', 'Grace', 'Linus'], { pageSize: 2 });

    expect(source.state).toEqual({
      error: null,
      items: ['Ada', 'Grace'],
      loading: false,
      pagination: {
        hasNext: true,
        hasPrevious: false,
        page: 1,
        pageCount: 2,
        pageSize: 2,
        totalItems: 3,
      },
      params: undefined,
    });
  });

  it('filters with typed params and resets pagination when params change', () => {
    const source = createLocalSource<string, string>(['Ada', 'Grace', 'Linus'], {
      filter: (item, search: string) => item.toLowerCase().includes(search.toLowerCase()),
      pageSize: 1,
      params: '',
    });

    source.next();
    source.setParams('ada');

    expect(source.state.items).toEqual(['Ada']);
    expect(source.state.params).toBe('ada');
    expect(source.state.pagination.page).toBe(1);
  });

  it('supports direct navigation and page-size changes', () => {
    const source = createLocalSource([1, 2, 3, 4], { pageSize: 1 });

    source.goTo(3);
    expect(source.state.items).toEqual([3]);
    source.previous();
    expect(source.state.items).toEqual([2]);
    source.last();
    expect(source.state.items).toEqual([4]);
    source.first();
    source.setPageSize(2);

    expect(source.state.items).toEqual([1, 2]);
    expect(source.state.pagination.page).toBe(1);
  });

  it('does not notify when replacement items produce the same state', () => {
    const source = createLocalSource([1, 2]);
    const listener = vi.fn();
    source.subscribe(listener);

    source.setItems([1, 2]);
    source.setParams(undefined);

    expect(listener).not.toHaveBeenCalled();
  });

  it('clamps the current page after replacing items', () => {
    const source = createLocalSource([1, 2, 3], { pageSize: 1 });
    source.last();

    source.setItems([1]);

    expect(source.state.pagination.page).toBe(1);
    expect(source.state.items).toEqual([1]);
  });

  it('rejects invalid input and mutations after disposal', () => {
    const source = createLocalSource([1]);

    expect(() => source.setPageSize(0)).toThrow('pageSize must be a positive integer');
    source.dispose();
    expect(() => source.setItems([2])).toThrow('disposed');
    expect(() => source.next()).toThrow('disposed');
  });
});
