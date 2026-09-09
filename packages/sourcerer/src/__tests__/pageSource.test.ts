import { createPageSource } from '../pageSource';

describe('createPageSource', () => {
  it('is inert until a load command runs', async () => {
    const load = vi.fn(async () => ({ items: ['one'], totalItems: 1 }));
    const source = createPageSource({ load });

    expect(load).not.toHaveBeenCalled();
    expect(source.state).toMatchObject({ items: [], loading: false, params: undefined });

    await source.first();
    expect(load).toHaveBeenCalledOnce();
  });

  it('loads pages with consumer-owned params', async () => {
    const load = vi.fn(async ({ page, params }: { page: number; params: { search: string } }) => ({
      items: [`${params.search}:${page}`],
      totalItems: 5,
    }));
    const source = createPageSource<string, { search: string }>({ load, pageSize: 2, params: { search: '' } });

    await source.reload();
    await source.setParams({ search: 'users' });
    await source.next();

    expect(load).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 2,
      params: { search: 'users' },
      signal: expect.any(AbortSignal),
    });
    expect(source.state).toMatchObject({
      items: ['users:2'],
      loading: false,
      pagination: { hasPrevious: true, page: 2, pageCount: 3, totalItems: 5 },
      params: { search: 'users' },
    });
  });

  it('retains committed state and exposes pending params during replacement', async () => {
    let resolve!: (result: { items: string[]; totalItems: number }) => void;
    const source = createPageSource<string, string>({
      load: ({ params }) =>
        params
          ? new Promise<{ items: string[]; totalItems: number }>((finish) => (resolve = finish))
          : Promise.resolve({ items: ['loaded'], totalItems: 1 }),
      params: '',
    });
    await source.reload();

    const pending = source.setParams('next');

    expect(source.state).toMatchObject({
      items: ['loaded'],
      loading: true,
      params: '',
      pendingParams: 'next',
    });
    resolve({ items: ['next'], totalItems: 1 });
    await pending;

    expect(source.state).toMatchObject({ items: ['next'], loading: false, params: 'next' });
    expect(source.state.pendingParams).toBeUndefined();
  });

  it('settles superseded work without committing stale results', async () => {
    const pending = new Map<string, (result: { items: string[]; totalItems: number }) => void>();
    const source = createPageSource<string, string>({
      load: ({ params }) => new Promise((resolve) => pending.set(params, resolve)),
      params: 'initial',
    });

    const first = source.setParams('first');
    const second = source.setParams('second');
    await first;
    pending.get('first')?.({ items: ['stale'], totalItems: 1 });
    pending.get('second')?.({ items: ['current'], totalItems: 1 });
    await second;

    expect(source.state.items).toEqual(['current']);
    expect(source.state.params).toBe('second');
  });

  it('preserves committed items when the current request fails', async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce({ items: ['cached'], totalItems: 1 })
      .mockRejectedValueOnce('offline');
    const source = createPageSource({ load });
    await source.reload();

    await expect(source.reload()).rejects.toThrow('offline');

    expect(source.state.items).toEqual(['cached']);
    expect(source.state.error).toMatchObject({ cause: 'offline', message: 'offline' });
    expect(source.state.loading).toBe(false);
  });

  it('supports direct page navigation and clamps known bounds', async () => {
    const load = vi.fn(async ({ page }: { page: number }) => ({ items: [page], totalItems: 5 }));
    const source = createPageSource({ load, pageSize: 2 });

    await source.goTo(3);
    await source.next();
    expect(load).toHaveBeenCalledOnce();
    await source.previous();
    await source.first();
    await source.last();

    expect(source.state.pagination.page).toBe(3);
  });

  it('resets to page one when page size changes', async () => {
    const source = createPageSource({
      load: async ({ page }) => ({ items: [page], totalItems: 10 }),
      pageSize: 2,
    });
    await source.goTo(3);

    await source.setPageSize(5);

    expect(source.state.pagination).toMatchObject({ page: 1, pageCount: 2, pageSize: 5 });
  });

  it('copies loader items before publishing state', async () => {
    const items = ['one'];
    const source = createPageSource({ load: async () => ({ items, totalItems: 1 }) });

    await source.reload();
    items.push('two');

    expect(source.state.items).toEqual(['one']);
  });

  it('settles active work on disposal and rejects later commands', async () => {
    const source = createPageSource({ load: () => new Promise(() => undefined) });
    const pending = source.reload();

    source.dispose();

    await expect(pending).resolves.toBeUndefined();
    await expect(source.reload()).rejects.toThrow('disposed');
    await expect(source.next()).rejects.toThrow('disposed');
  });

  it('rejects invalid pagination and loader totals', async () => {
    expect(() => createPageSource({ load: async () => ({ items: [], totalItems: 0 }), pageSize: 0 })).toThrow(
      'pageSize must be a positive integer',
    );
    const source = createPageSource({ load: async () => ({ items: [], totalItems: -1 }) });

    await expect(source.reload()).rejects.toThrow('totalItems must be a non-negative integer');
    expect(source.state.error?.message).toBe('totalItems must be a non-negative integer');
  });
});
