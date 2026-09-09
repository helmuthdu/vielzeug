import { createInfiniteSource } from '../infiniteSource';

describe('createInfiniteSource', () => {
  it('loads the first page then appends more items', async () => {
    const load = vi.fn(async ({ page }: { page: number }) => ({
      items: page === 1 ? ['a', 'b'] : ['c'],
      totalItems: 3,
    }));
    const source = createInfiniteSource({ load, pageSize: 2 });

    await source.reload();
    await source.loadMore();

    expect(source.state).toMatchObject({
      items: ['a', 'b', 'c'],
      loading: false,
      pagination: { hasMore: false, loadedItems: 3, pageSize: 2, totalItems: 3 },
    });
  });

  it('does not expose pending params while appending', async () => {
    let resolve!: (result: { items: string[]; totalItems: number }) => void;
    const source = createInfiniteSource({
      load: () => new Promise((finish) => (resolve = finish)),
      pageSize: 1,
    });
    const first = source.reload();
    resolve({ items: ['first'], totalItems: 2 });
    await first;

    const more = source.loadMore();

    expect(source.state.loading).toBe(true);
    expect(source.state.pendingParams).toBeUndefined();
    resolve({ items: ['second'], totalItems: 2 });
    await more;
    expect(source.state.items).toEqual(['first', 'second']);
  });

  it('restarts accumulation when params change', async () => {
    const source = createInfiniteSource<string, string>({
      load: async ({ page, params }: { page: number; params: string }) => ({
        items: [`${params}:${page}`],
        totalItems: 2,
      }),
      params: '',
    });

    await source.reload();
    await source.loadMore();
    await source.setParams('new');

    expect(source.state.items).toEqual(['new:1']);
    expect(source.state.params).toBe('new');
    expect(source.state.pagination.loadedItems).toBe(1);
  });

  it('does not load more after the collection is exhausted', async () => {
    const load = vi.fn(async () => ({ items: [], totalItems: 0 }));
    const source = createInfiniteSource({ load });

    await source.reload();
    await source.loadMore();

    expect(load).toHaveBeenCalledOnce();
  });

  it('does not let a stale append advance replacement pagination', async () => {
    const pending: Array<{
      page: number;
      params: string;
      resolve: (result: { items: string[]; totalItems: number }) => void;
    }> = [];
    const source = createInfiniteSource<string, string>({
      load: ({ page, params }) => new Promise((resolve) => pending.push({ page, params, resolve })),
      params: 'old',
    });
    const initial = source.reload();
    pending.shift()?.resolve({ items: ['old-1'], totalItems: 10 });
    await initial;

    const staleAppend = source.loadMore();
    const replacement = source.setParams('new');
    await staleAppend;
    pending.find(({ params }) => params === 'new')?.resolve({ items: ['new-1'], totalItems: 10 });
    await replacement;

    const next = source.loadMore();
    expect(pending.at(-1)).toMatchObject({ page: 2, params: 'new' });
    pending.at(-1)?.resolve({ items: ['new-2'], totalItems: 10 });
    await next;
  });

  it('rejects invalid totals and commands after disposal', async () => {
    const source = createInfiniteSource({ load: async () => ({ items: [], totalItems: -1 }) });

    await expect(source.reload()).rejects.toThrow('totalItems must be a non-negative integer');
    source.dispose();
    await expect(source.loadMore()).rejects.toThrow('disposed');
  });
});
