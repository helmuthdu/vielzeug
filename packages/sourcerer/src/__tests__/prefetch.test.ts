import { prefetchSource } from '../prefetch';
import { createRemoteSource } from '../remoteSource';

describe('prefetchSource', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a snapshot after fetching', async () => {
    const fetch = vi.fn(async () => ({ items: ['a', 'b', 'c'], total: 3 }));
    const snapshot = await prefetchSource({ fetch, limit: 10 });

    expect(snapshot.items).toEqual(['a', 'b', 'c']);
    expect(snapshot.total).toBe(3);
    expect(snapshot.page).toBe(1);
  });

  it('snapshot omits search when empty', async () => {
    const fetch = vi.fn(async () => ({ items: ['x'], total: 1 }));
    const snapshot = await prefetchSource({ fetch });

    expect(snapshot.search).toBeUndefined();
  });

  it('snapshot includes search when set via snapshot', async () => {
    const fetch = vi.fn(async () => ({ items: ['alice'], total: 1 }));
    const snapshot = await prefetchSource({ fetch, snapshot: { items: [], search: 'alice', total: 0 } });

    expect(snapshot.search).toBe('alice');
  });

  it('snapshot can hydrate a new client-side source', async () => {
    const fetch = vi.fn(async () => ({ items: ['hydrated'], total: 1 }));
    const snapshot = await prefetchSource({ fetch, limit: 5 });

    const clientSource = createRemoteSource({ autoFetch: false, fetch, limit: 5, snapshot });

    expect(clientSource.current).toEqual(['hydrated']);
    expect(clientSource.meta.totalItems).toBe(1);
    expect(clientSource.meta.isLoading).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('snapshot is JSON-serializable', async () => {
    const fetch = vi.fn(async () => ({
      items: [{ id: 1, name: 'Alice' }],
      total: 1,
    }));
    const snapshot = await prefetchSource({ fetch });

    const serialized = JSON.stringify(snapshot);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.items).toEqual([{ id: 1, name: 'Alice' }]);
    expect(deserialized.total).toBe(1);
  });

  it('throws a SourceError when the fetch fails', async () => {
    const fetch = vi.fn(async () => {
      throw new Error('network down');
    });

    await expect(prefetchSource({ fetch })).rejects.toThrow('network down');
  });
});

describe('prefetchSource with keepSource: true', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns both snapshot and live source', async () => {
    const fetch = vi.fn(async () => ({ items: ['a', 'b'], total: 2 }));
    const { snapshot, source } = await prefetchSource({ fetch, limit: 10 }, { keepSource: true });

    expect(snapshot.items).toEqual(['a', 'b']);
    expect(snapshot.total).toBe(2);
    expect(source.current).toEqual(['a', 'b']);

    source.dispose();
  });

  it('returned source is live and not disposed', async () => {
    const fetch = vi.fn(async () => ({ items: ['x'], total: 1 }));
    const { source } = await prefetchSource({ fetch }, { keepSource: true });

    fetch.mockResolvedValueOnce({ items: ['y'], total: 1 });
    await source.refresh();

    expect(source.current).toEqual(['y']);
    source.dispose();
  });

  it('caller must dispose the source manually', async () => {
    const fetch = vi.fn(async () => ({ items: [], total: 0 }));
    const { source } = await prefetchSource({ fetch }, { keepSource: true });

    expect(() => source.dispose()).not.toThrow();
  });

  it('throws a SourceError and disposes source when the fetch fails', async () => {
    const fetch = vi.fn(async () => {
      throw new Error('upstream error');
    });

    await expect(prefetchSource({ fetch }, { keepSource: true })).rejects.toThrow('upstream error');
  });
});
