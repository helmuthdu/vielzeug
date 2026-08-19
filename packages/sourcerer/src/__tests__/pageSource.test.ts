import { createPageSource } from '../pageSource';

describe('createPageSource', () => {
  it('loads numbered pages through atomic snapshots', async () => {
    const load = vi.fn(async ({ query }: { query: { page: number; pageSize: number; search: string } }) => ({
      data: [`${query.search}:${query.page}`],
      total: 5,
    }));
    const source = createPageSource({ autoStart: false, initialQuery: { pageSize: 2 }, load });

    await source.setQuery({ search: 'users' });
    await source.page.next();

    expect(load).toHaveBeenLastCalledWith({
      query: { page: 2, pageSize: 2, search: 'users' },
      signal: expect.any(AbortSignal),
    });
    expect(source.snapshot).toMatchObject({
      data: ['users:2'],
      isFetching: false,
      pagination: { count: 3, hasPrevious: true, index: 2, kind: 'page', total: 5 },
    });
  });

  it('preserves successful data and rejects current request failures', async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce({ data: ['cached'], total: 1 })
      .mockRejectedValueOnce(new Error('network down'));
    const source = createPageSource({ autoStart: false, load });

    await source.reload();
    await expect(source.reload()).rejects.toThrow('network down');

    expect(source.snapshot).toMatchObject({
      data: ['cached'],
      error: expect.objectContaining({ message: 'network down' }),
      isFetching: false,
    });
  });

  it('retains loaded state and exposes pending query during newer work', async () => {
    let resolve!: (result: { data: string[]; total: number }) => void;
    const source = createPageSource({
      autoStart: false,
      initialQuery: { pageSize: 1 },
      load: ({ query }) =>
        query.search
          ? new Promise<{ data: string[]; total: number }>((finish) => {
              resolve = finish;
            })
          : Promise.resolve({ data: ['loaded'], total: 3 }),
    });

    await source.page.go(2);

    const pending = source.setQuery({ search: 'next' });

    expect(source.snapshot).toMatchObject({
      data: ['loaded'],
      isFetching: true,
      pagination: { index: 2, kind: 'page' },
      pendingQuery: { page: 1, pageSize: 1, search: 'next' },
      query: { page: 2, pageSize: 1, search: '' },
    });

    resolve({ data: ['next'], total: 1 });
    await pending;

    expect(source.snapshot).toMatchObject({
      data: ['next'],
      query: { page: 1, search: 'next' },
    });
    expect(source.snapshot.pendingQuery).toBeUndefined();
  });

  it('settles superseded commands without applying stale results', async () => {
    let resolveFirst!: (result: { data: string[]; total: number }) => void;
    const load = vi.fn(({ query }: { query: { search: string } }) => {
      if (query.search === 'first') {
        return new Promise<{ data: string[]; total: number }>((resolve) => {
          resolveFirst = resolve;
        });
      }

      return Promise.resolve({ data: ['second'], total: 1 });
    });
    const source = createPageSource({ autoStart: false, load });

    const first = source.setQuery({ search: 'first' });

    await source.setQuery({ search: 'second' });
    resolveFirst({ data: ['first'], total: 1 });

    await expect(first).resolves.toBeUndefined();
    expect(source.snapshot.data).toEqual(['second']);
  });

  it('does not fetch for normalized no-op navigation', async () => {
    const load = vi.fn(async () => ({ data: ['one'], total: 1 }));
    const source = createPageSource({ autoStart: false, load });

    await source.reload();
    await source.page.go(99);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('records and reports auto-start failures', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const source = createPageSource({ load: async () => Promise.reject(new Error('unavailable')) });

    await vi.waitFor(() => expect(source.snapshot.error?.message).toBe('unavailable'));

    expect(warning).toHaveBeenCalledWith('[@vielzeug/sourcerer] Initial load failed. Inspect source.snapshot.error.');
    warning.mockRestore();
  });

  it('settles a disposed request without surfacing its loader rejection', async () => {
    let reject!: (reason: unknown) => void;
    const source = createPageSource({
      autoStart: false,
      load: () =>
        new Promise((_, rejectLoad: (reason: unknown) => void) => {
          reject = rejectLoad;
        }),
    });

    const pending = source.reload();

    source.dispose();
    reject(new Error('aborted transport'));

    await expect(pending).resolves.toBeUndefined();
  });

  it('preserves non-Error rejection cause on snapshot.error', async () => {
    const source = createPageSource({
      autoStart: false,
      load: async () => Promise.reject('network down'),
    });

    await expect(source.reload()).rejects.toThrow('network down');
    expect(source.snapshot.error?.message).toBe('network down');
    expect(source.snapshot.error?.cause).toBe('network down');
  });
});
