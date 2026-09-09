import { createCursorSource } from '../cursorSource';

describe('createCursorSource', () => {
  it('uses returned cursors for direct navigation', async () => {
    const load = vi.fn(async ({ after }: { after?: string }) =>
      after === 'next'
        ? { items: ['second'], previousCursor: 'previous', totalItems: 2 }
        : { items: ['first'], nextCursor: 'next', totalItems: 2 },
    );
    const source = createCursorSource({ load });

    await source.reload();
    await source.next();
    await source.previous();

    expect(source.state.items).toEqual(['first']);
    expect(source.state.pagination).toMatchObject({ nextCursor: 'next', pageSize: 20 });
  });

  it('resets cursors when params or page size changes', async () => {
    const load = vi.fn(async ({ params }: { params: string }) => ({ items: [params], nextCursor: 'next' }));
    const source = createCursorSource<string, string>({ load, pageSize: 10, params: '' });
    await source.reload();
    await source.next();

    await source.setParams('needle');
    await source.setPageSize(20);

    expect(load).toHaveBeenLastCalledWith({
      pageSize: 20,
      params: 'needle',
      signal: expect.any(AbortSignal),
    });
    expect(source.state.items).toEqual(['needle']);
  });

  it('retains committed cursors while replacement params are pending', async () => {
    let resolve!: (result: { items: string[] }) => void;
    const source = createCursorSource<string, string>({
      load: ({ params }) =>
        params
          ? new Promise<{ items: string[] }>((finish) => (resolve = finish))
          : Promise.resolve({ items: ['first'], nextCursor: 'next' }),
      params: '',
    });
    await source.reload();

    const pending = source.setParams('needle');

    expect(source.state).toMatchObject({
      items: ['first'],
      pagination: { nextCursor: 'next' },
      params: '',
      pendingParams: 'needle',
    });
    resolve({ items: ['needle'] });
    await pending;
    expect(source.state.pendingParams).toBeUndefined();
  });

  it('rejects conflicting initial cursor directions', () => {
    expect(() =>
      createCursorSource({
        after: 'after',
        before: 'before',
        load: async () => ({ items: [] }),
      }),
    ).toThrow('cannot start with both after and before');
  });

  it('is inert and rejects commands after disposal', async () => {
    const load = vi.fn(async () => ({ items: [] }));
    const source = createCursorSource({ load });

    expect(load).not.toHaveBeenCalled();
    source.dispose();

    await expect(source.next()).rejects.toThrow('disposed');
    await expect(source.reload()).rejects.toThrow('disposed');
  });
});
