import { applyCursorQuery, applyInfiniteQuery, applyLocalQuery, applyQuery, applyRemoteQuery } from '../applyQuery';
import { createCursorSource } from '../cursorSource';
import { createInfiniteSource } from '../infiniteSource';
import { createLocalSource } from '../localSource';
import { createRemoteSource } from '../remoteSource';

describe('applyQuery', () => {
  it('delegates to source.patch() with the given changes', async () => {
    const patch = vi.fn().mockResolvedValue(undefined);
    const source = { patch };

    await applyQuery(source, { limit: 10, page: 2 });

    expect(patch).toHaveBeenCalledWith({ limit: 10, page: 2 });
  });

  it('returns the promise from source.patch()', async () => {
    const expected = Promise.resolve();
    const source = { patch: vi.fn().mockReturnValue(expected) };

    expect(applyQuery(source, {})).toBe(expected);
  });
});

describe('applyLocalQuery', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.restoreAllMocks());

  it('applies limit change', async () => {
    const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

    await applyLocalQuery(source, { limit: 5 });

    expect(source.meta.pageSize).toBe(5);
    expect(source.current).toEqual([1, 2, 3, 4, 5]);
  });

  it('applies search change with immediate flush', async () => {
    const source = createLocalSource(['apple', 'banana', 'apricot'], { limit: 10 });

    await applyLocalQuery(source, { page: 1, search: 'ap' });

    expect(source.current).toEqual(['apple', 'apricot']);
  });

  it('applies page change', async () => {
    const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

    await applyLocalQuery(source, { page: 2 });

    expect(source.meta.pageNumber).toBe(2);
    expect(source.current).toEqual([3, 4]);
  });

  it('applies limit + search atomically in one recompute', async () => {
    const source = createLocalSource(['apple', 'banana', 'apricot'], { limit: 1 });
    const listener = vi.fn();

    source.subscribe(listener);
    await applyLocalQuery(source, { limit: 10, search: 'ap' });

    expect(source.meta.pageSize).toBe(10);
    expect(source.current).toEqual(['apple', 'apricot']);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('no-ops when changes produce same state', async () => {
    const source = createLocalSource([1, 2], { limit: 10 });
    const listener = vi.fn();

    source.subscribe(listener);
    await applyLocalQuery(source, { limit: 10 });

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('applyRemoteQuery', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.restoreAllMocks());

  it('applies limit + page change', async () => {
    const fetch = vi.fn(async () => ({ items: ['a', 'b'], total: 10 }));
    const source = createRemoteSource({ autoFetch: false, fetch, limit: 5 });

    await applyRemoteQuery(source, { limit: 10, page: 2 });

    expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, page: 2 }), expect.any(AbortSignal));
  });

  it('applies filter change', async () => {
    const fetch = vi.fn(async () => ({ items: [], total: 0 }));
    const source = createRemoteSource<string, { role: string }>({ autoFetch: false, fetch });

    await applyRemoteQuery(source, { filter: { role: 'admin' } });

    expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ filter: { role: 'admin' } }), expect.any(AbortSignal));
  });

  it('applies sort change', async () => {
    const fetch = vi.fn(async () => ({ items: [], total: 0 }));
    const source = createRemoteSource<string, unknown, string>({ autoFetch: false, fetch });

    await applyRemoteQuery(source, { sort: 'name_asc' });

    expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ sort: 'name_asc' }), expect.any(AbortSignal));
  });

  it('applies filter + sort + search atomically in one fetch', async () => {
    const fetch = vi.fn(async () => ({ items: [], total: 0 }));
    const source = createRemoteSource<string, { role: string }, string>({ autoFetch: false, fetch });

    await applyRemoteQuery(source, { filter: { role: 'admin' }, search: 'ada', sort: 'name' });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ filter: { role: 'admin' }, search: 'ada', sort: 'name' }),
      expect.any(AbortSignal),
    );
  });
});

describe('applyCursorQuery', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.restoreAllMocks());

  it('applies limit change and resets cursor', async () => {
    const fetch = vi.fn(async () => ({ items: ['a'], nextCursor: 'c1', total: 1 }));
    const source = createCursorSource({ autoFetch: false, fetch, limit: 5 });

    await applyCursorQuery(source, { limit: 10 });

    expect(source.meta.pageSize).toBe(10);
    expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }), expect.any(AbortSignal));
  });

  it('applies search change', async () => {
    const fetch = vi.fn(async () => ({ items: [], total: 0 }));
    const source = createCursorSource({ autoFetch: false, fetch });

    await applyCursorQuery(source, { search: 'hello' });

    expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ search: 'hello' }), expect.any(AbortSignal));
  });

  it('no-ops when no changes', async () => {
    const fetch = vi.fn(async () => ({ items: [], total: 0 }));
    const source = createCursorSource({ autoFetch: false, fetch, limit: 10 });

    await applyCursorQuery(source, { limit: 10 });

    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('applyInfiniteQuery', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.restoreAllMocks());

  it('applies limit change', async () => {
    const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
    const source = createInfiniteSource({ autoFetch: false, fetch, limit: 5 });

    await applyInfiniteQuery(source, { limit: 10 });

    expect(source.meta.pageSize).toBe(10);
    expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }), expect.any(AbortSignal));
  });

  it('applies search change and resets accumulated pages', async () => {
    const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
    const source = createInfiniteSource({ autoFetch: false, fetch });

    await applyInfiniteQuery(source, { search: 'query' });

    expect(source.meta.loadedPages).toBe(1);
    expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ page: 1, search: 'query' }), expect.any(AbortSignal));
  });

  it('no-ops when no changes', async () => {
    const fetch = vi.fn(async () => ({ items: [], total: 0 }));
    const source = createInfiniteSource({ autoFetch: false, fetch, limit: 20 });

    await applyInfiniteQuery(source, { limit: 20 });

    expect(fetch).not.toHaveBeenCalled();
  });
});
