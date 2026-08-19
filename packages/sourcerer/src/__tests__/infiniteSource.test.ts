import { createInfiniteSource } from '../infiniteSource';

describe('createInfiniteSource', () => {
  it('loads first page then appends through loadMore', async () => {
    const load = vi.fn(async ({ query }: { query: { page: number } }) => ({
      data: query.page === 1 ? ['a', 'b'] : ['c'],
      total: 3,
    }));
    const source = createInfiniteSource({ autoStart: false, initialQuery: { pageSize: 2 }, load });

    await source.reload();
    await source.loadMore();

    expect(source.snapshot).toMatchObject({
      data: ['a', 'b', 'c'],
      isFetching: false,
      pagination: { hasMore: false, kind: 'infinite', loaded: 3, total: 3 },
    });
  });

  it('does not set pendingQuery during append fetches', async () => {
    let resolveLoad!: (result: { data: string[]; total: number }) => void;
    const source = createInfiniteSource({
      autoStart: false,
      initialQuery: { pageSize: 1 },
      load: () =>
        new Promise<{ data: string[]; total: number }>((finish) => {
          resolveLoad = finish;
        }),
    });

    const reloadPending = source.reload();
    resolveLoad({ data: ['first'], total: 2 });
    await reloadPending;

    const appendPending = source.loadMore();

    expect(source.snapshot.isFetching).toBe(true);
    expect(source.snapshot.pendingQuery).toBeUndefined();
    expect(source.snapshot.pagination).toMatchObject({ kind: 'infinite', loaded: 1 });

    resolveLoad({ data: ['next'], total: 2 });
    await appendPending;

    expect(source.snapshot.data).toEqual(['first', 'next']);
  });

  it('sets pendingQuery only when replacing the query', async () => {
    let resolve!: (result: { data: string[]; total: number }) => void;
    const source = createInfiniteSource({
      autoStart: false,
      load: ({ query }) =>
        query.search
          ? new Promise<{ data: string[]; total: number }>((finish) => {
              resolve = finish;
            })
          : Promise.resolve({ data: ['first'], total: 1 }),
    });

    await source.reload();

    const pending = source.setQuery({ search: 'new' });

    expect(source.snapshot).toMatchObject({
      data: ['first'],
      isFetching: true,
      pendingQuery: { pageSize: 20, search: 'new' },
      query: { pageSize: 20, search: '' },
    });

    resolve({ data: ['new'], total: 1 });
    await pending;

    expect(source.snapshot.pendingQuery).toBeUndefined();
    expect(source.snapshot.data).toEqual(['new']);
  });

  it('restarts accumulation when query changes', async () => {
    const source = createInfiniteSource({
      autoStart: false,
      load: async ({ query }) => ({ data: [`${query.search}:${query.page}`], total: 2 }),
    });

    await source.reload();
    await source.loadMore();
    await source.setQuery({ search: 'new' });

    expect(source.snapshot.data).toEqual(['new:1']);
    expect(source.snapshot.pagination.loaded).toBe(1);
  });

  it('exposes invalid loader totals as command failures', async () => {
    const source = createInfiniteSource({ autoStart: false, load: async () => ({ data: [], total: -1 }) });

    await expect(source.reload()).rejects.toThrow('Source loader total must be a non-negative integer');
    expect(source.snapshot.error?.message).toBe('Source loader total must be a non-negative integer');
  });
});
