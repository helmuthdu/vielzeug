import { createCursorSource } from '../cursorSource';

describe('createCursorSource', () => {
  it('uses returned cursors for sequential navigation', async () => {
    const load = vi.fn(async ({ query }: { query: { after?: string } }) => {
      if (query.after === 'next') return { data: ['second'], previousCursor: 'previous', total: 2 };

      return { data: ['first'], nextCursor: 'next', total: 2 };
    });
    const source = createCursorSource({ autoStart: false, load });

    await source.reload();
    await source.page.next();
    await source.page.previous();

    expect(source.snapshot.data).toEqual(['first']);
    expect(source.snapshot.pagination).toMatchObject({ hasNext: true, kind: 'cursor' });
  });

  it('retains loaded cursors while a search query is pending', async () => {
    let resolve!: (result: { data: string[]; nextCursor?: string }) => void;
    const source = createCursorSource({
      autoStart: false,
      load: ({ query }) =>
        query.search
          ? new Promise<{ data: string[]; nextCursor?: string }>((finish) => {
              resolve = finish;
            })
          : Promise.resolve({ data: ['first'], nextCursor: 'next' }),
    });

    await source.reload();

    const pending = source.setQuery({ search: 'needle' });

    expect(source.snapshot).toMatchObject({
      data: ['first'],
      pagination: { kind: 'cursor', nextCursor: 'next' },
      pendingQuery: { pageSize: 20, search: 'needle' },
      query: { pageSize: 20, search: '' },
    });

    resolve({ data: ['needle'] });
    await pending;
    expect(source.snapshot.pendingQuery).toBeUndefined();
  });

  it('ignores undefined patch fields', async () => {
    const load = vi.fn(async () => ({ data: [] }));
    const source = createCursorSource({ autoStart: false, load });

    await source.reload();
    await source.setQuery({ pageSize: undefined, search: undefined });

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('rejects conflicting cursor directions', () => {
    expect(() =>
      createCursorSource({
        autoStart: false,
        initialQuery: { after: 'after', before: 'before' },
        load: async () => ({ data: [] }),
      }),
    ).toThrow('Cursor query cannot include both after and before');
  });
});
