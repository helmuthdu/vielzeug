import { applyInfiniteQuery } from '../applyQuery';
import { createInfiniteSource } from '../infiniteSource';

describe('createInfiniteSource', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('autoFetch', () => {
    it('fetches first page automatically by default', async () => {
      const fetch = vi.fn(async () => ({ items: ['a', 'b'], total: 5 }));
      const source = createInfiniteSource({ fetch, limit: 2 });

      await source.ready();

      expect(source.current).toEqual(['a', 'b']);
      expect(source.meta.hasMore).toBe(true);
      expect(source.meta.totalItems).toBe(5);
    });

    it('does not auto-fetch when autoFetch is false', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createInfiniteSource({ autoFetch: false, fetch });

      await Promise.resolve();

      expect(fetch).not.toHaveBeenCalled();
      expect(source.current).toEqual([]);
    });
  });

  describe('loadMore', () => {
    it('appends items from subsequent pages', async () => {
      const pages = [['a', 'b'], ['c', 'd'], ['e']];
      const fetch = vi.fn(async ({ page }: { page: number }) => {
        const items = pages[page - 1] ?? [];

        return { items, total: 5 };
      });
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 2 });

      await source.reset();

      expect(source.current).toEqual(['a', 'b']);

      await source.loadMore();
      expect(source.current).toEqual(['a', 'b', 'c', 'd']);

      await source.loadMore();
      expect(source.current).toEqual(['a', 'b', 'c', 'd', 'e']);

      expect(source.meta.hasMore).toBe(false);
    });

    it('loadMore is a no-op when all items are loaded', async () => {
      const fetch = vi.fn(async () => ({ items: ['a', 'b'], total: 2 }));
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 10 });

      await source.reset();

      const callsBefore = fetch.mock.calls.length;

      await source.loadMore();

      expect(fetch.mock.calls.length).toBe(callsBefore);
    });

    it('isLoadingMore clears after reset() aborts an in-flight loadMore', async () => {
      let resolveLoadMore!: (v: { items: string[]; total: number }) => void;
      const fetch = vi
        .fn()
        .mockResolvedValueOnce({ items: ['a'], total: 3 })
        .mockImplementationOnce(
          () =>
            new Promise<{ items: string[]; total: number }>((r) => {
              resolveLoadMore = r;
            }),
        )
        .mockResolvedValueOnce({ items: ['reset-page-1'], total: 1 });
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 1 });

      await source.reset(); // page 1 loaded

      const loadMorePromise = source.loadMore(); // starts in-flight, aborted below

      expect(source.meta.isLoadingMore).toBe(true);

      // reset() aborts the loadMore in-flight
      const resetPromise = source.reset();

      // resolve the aborted loadMore after reset starts
      resolveLoadMore({ items: ['late-page-2'], total: 3 });

      await loadMorePromise;
      await resetPromise;

      // Both flags must be clear — no stuck spinner
      expect(source.meta.isLoading).toBe(false);
      expect(source.meta.isLoadingMore).toBe(false);
    });

    it('sets isLoadingMore true during loadMore and false after', async () => {
      let resolve!: (v: { items: string[]; total: number }) => void;
      const fetch = vi
        .fn()
        .mockResolvedValueOnce({ items: ['a'], total: 3 })
        .mockImplementationOnce(
          () =>
            new Promise((r) => {
              resolve = r;
            }),
        );
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 1 });

      await source.reset();

      expect(source.meta.isLoadingMore).toBe(false);
      expect(source.meta.isLoading).toBe(false);

      const p = source.loadMore();

      expect(source.meta.isLoadingMore).toBe(true);
      expect(source.meta.isLoading).toBe(false);

      resolve({ items: ['b'], total: 3 });
      await p;

      expect(source.meta.isLoadingMore).toBe(false);
    });

    it('sets isLoading true during initial fetch, not isLoadingMore', async () => {
      let resolve!: (v: { items: string[]; total: number }) => void;
      const fetch = vi.fn(
        () =>
          new Promise<{ items: string[]; total: number }>((r) => {
            resolve = r;
          }),
      );
      const source = createInfiniteSource({ autoFetch: false, fetch });

      const p = source.reset();

      expect(source.meta.isLoading).toBe(true);
      expect(source.meta.isLoadingMore).toBe(false);

      resolve({ items: ['a'], total: 1 });
      await p;

      expect(source.meta.isLoading).toBe(false);
      expect(source.meta.isLoadingMore).toBe(false);
    });
  });

  describe('loadMore concurrency', () => {
    it('ignores a second concurrent loadMore() call while one is in-flight', async () => {
      let resolvePage2!: (v: { items: string[]; total: number }) => void;
      const fetch = vi.fn((q: { page: number }) => {
        if (q.page === 1) return Promise.resolve({ items: ['a'], total: 3 });

        return new Promise<{ items: string[]; total: number }>((resolve) => {
          resolvePage2 = resolve;
        });
      });
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 1 });

      await source.reset();

      const p1 = source.loadMore();
      const p2 = source.loadMore();

      resolvePage2({ items: ['b'], total: 3 });
      await Promise.all([p1, p2]);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(source.current).toEqual(['a', 'b']);
    });
  });

  describe('loadedPages meta', () => {
    it('starts at 0 before any fetch', () => {
      const source = createInfiniteSource({ autoFetch: false, fetch: vi.fn() });

      expect(source.meta.loadedPages).toBe(0);
    });

    it('increments loadedPages with each loadMore()', async () => {
      const fetch = vi.fn(async ({ page }: { page: number }) => ({
        items: [`p${page}`],
        total: 5,
      }));
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 1 });

      await source.reset();
      expect(source.meta.loadedPages).toBe(1);

      await source.loadMore();
      expect(source.meta.loadedPages).toBe(2);

      await source.loadMore();
      expect(source.meta.loadedPages).toBe(3);
    });

    it('resets loadedPages to 0 after reset()', async () => {
      const fetch = vi.fn(async ({ page }: { page: number }) => ({
        items: [`p${page}`],
        total: 3,
      }));
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 1 });

      await source.reset();
      await source.loadMore();
      expect(source.meta.loadedPages).toBe(2);

      await source.reset();
      expect(source.meta.loadedPages).toBe(1);
    });

    it('resets loadedPages to 0 after search with immediate:true', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 3 }));
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 1 });

      await source.reset();
      await source.loadMore();
      expect(source.meta.loadedPages).toBe(2);

      await source.search('q', { immediate: true });
      expect(source.meta.loadedPages).toBe(1);
    });
  });

  describe('race safety (FetchManager)', () => {
    it('deduplicates concurrent reset() calls with identical query key', async () => {
      let resolveFetch!: (v: { items: string[]; total: number }) => void;
      const fetch = vi.fn(
        () =>
          new Promise<{ items: string[]; total: number }>((resolve) => {
            resolveFetch = resolve;
          }),
      );
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 10 });

      const p1 = source.reset();
      const p2 = source.reset();

      expect(fetch).toHaveBeenCalledTimes(1);

      resolveFetch({ items: ['result'], total: 10 });
      await Promise.all([p1, p2]);

      expect(source.current).toEqual(['result']);
    });

    it('ignores stale response when search(immediate) supersedes an in-flight reset()', async () => {
      let callCount = 0;
      const resolvers: Array<(v: { items: string[]; total: number }) => void> = [];
      const fetch = vi.fn(() => {
        callCount++;

        return new Promise<{ items: string[]; total: number }>((resolve) => {
          resolvers.push(resolve);
        });
      });
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 10 });

      const p1 = source.reset();
      const p2 = source.search('hello', { immediate: true });

      expect(callCount).toBe(2);

      resolvers[0]({ items: ['stale'], total: 10 });
      await p1;

      expect(source.current).not.toEqual(['stale']);

      resolvers[1]({ items: ['fresh'], total: 10 });
      await p2;

      expect(source.current).toEqual(['fresh']);
    });
  });

  describe('setLimit()', () => {
    it('changes page size and re-fetches from page 1', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 5 }));
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 2 });

      await source.reset();
      expect(fetch).toHaveBeenCalledTimes(1);

      await source.setLimit(5);

      expect(source.toQuery().limit).toBe(5);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('is a no-op when limit does not change', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 10 });

      await source.reset();

      const callsBefore = fetch.mock.calls.length;

      await source.setLimit(10);

      expect(fetch.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('reset', () => {
    it('clears accumulated items and refetches from page 1', async () => {
      const fetch = vi.fn(async ({ page }: { page: number }) => ({
        items: [`page-${page}`],
        total: 3,
      }));
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 1 });

      await source.reset();
      await source.loadMore();

      expect(source.current).toEqual(['page-1', 'page-2']);

      await source.reset();

      expect(source.current).toEqual(['page-1']);
    });

    it('current is [] immediately after reset() before fetch resolves', async () => {
      let resolve!: (v: { items: string[]; total: number }) => void;
      const fetch = vi
        .fn()
        .mockResolvedValueOnce({ items: ['first'], total: 5 })
        .mockImplementationOnce(
          () =>
            new Promise<{ items: string[]; total: number }>((r) => {
              resolve = r;
            }),
        );
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 1 });

      await source.reset();
      expect(source.current).toEqual(['first']);

      const resetPromise = source.reset();

      expect(source.current).toEqual([]);

      resolve({ items: ['second'], total: 5 });
      await resetPromise;

      expect(source.current).toEqual(['second']);
    });
  });

  describe('search', () => {
    it('debounces search and resets accumulator', async () => {
      const fetch = vi.fn(async ({ search }: { search?: string }) => ({
        items: search ? [`found-${search}`] : ['all'],
        total: 1,
      }));
      const source = createInfiniteSource({ autoFetch: false, debounceMs: 300, fetch });

      await source.reset();

      source.search('hello');
      expect(source.meta.isSearchPending).toBe(true);

      vi.advanceTimersByTime(300);
      await source.ready();

      expect(source.current).toEqual(['found-hello']);
    });

    it('search with immediate:true applies immediately and resets accumulator', async () => {
      const fetch = vi.fn(async ({ search }: { search?: string }) => ({
        items: [search ?? 'none'],
        total: 1,
      }));
      const source = createInfiniteSource({ autoFetch: false, fetch });

      await source.search('instant', { immediate: true });

      expect(source.current).toEqual(['instant']);
    });
  });

  describe('meta', () => {
    it('sets error on fetch failure', async () => {
      const source = createInfiniteSource({
        autoFetch: false,
        fetch: vi.fn(async () => {
          throw new Error('infinite-fail');
        }),
      });

      await source.reset();

      expect(source.meta.error?.message).toBe('infinite-fail');
      expect(source.meta.error?.name).toBe('SourceError');
    });

    it('clears error on successful fetch after failure', async () => {
      const fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({ items: ['ok'], total: 1 });
      const source = createInfiniteSource({ autoFetch: false, fetch });

      await source.reset();
      expect(source.meta.error).not.toBeNull();

      await source.reset();
      expect(source.meta.error).toBeNull();
    });
  });

  describe('search debounce', () => {
    it('resolves promise when debounced search is applied', async () => {
      const fetch = vi.fn(async ({ search }: { search?: string }) => ({
        items: search ? [search] : ['init'],
        total: 1,
      }));
      const source = createInfiniteSource({ autoFetch: false, debounceMs: 300, fetch });

      await source.reset();

      const searchDone = source.search('instant-query');

      expect(source.meta.isSearchPending).toBe(true);

      await vi.runAllTimersAsync();
      await searchDone;

      expect(source.meta.isSearchPending).toBe(false);
      expect(source.current).toEqual(['instant-query']);
    });
  });

  describe('retry', () => {
    it('retries on failure and resolves on success', async () => {
      const fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce({ items: ['retried'], total: 1 });
      const source = createInfiniteSource({
        autoFetch: false,
        fetch,
        retry: { attempts: 1, delay: () => 10 },
      });

      const p = source.reset();

      await vi.runAllTimersAsync();
      await p;

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(source.current).toEqual(['retried']);
      expect(source.meta.error).toBeNull();
    });
  });

  describe('setLimit and search', () => {
    it('setLimit is a no-op when limit does not change', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 10 });

      await source.setLimit(10);

      expect(fetch).not.toHaveBeenCalled();
    });

    it('setLimit resets and refetches when limit changes', async () => {
      const pages = [
        ['a', 'b'],
        ['c', 'd'],
      ];
      const fetch = vi.fn(async ({ page }: { page: number }) => ({
        items: pages[page - 1] ?? [],
        total: 4,
      }));
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 2 });

      await source.reset();
      await source.loadMore();
      expect(source.current).toEqual(['a', 'b', 'c', 'd']);

      await source.setLimit(2); // same — no-op
      expect(fetch).toHaveBeenCalledTimes(2);

      await source.setLimit(5); // changed
      expect(source.current).toEqual(['a', 'b']); // reset to page 1 result
      expect(source.meta.loadedPages).toBe(1);
    });

    it('search immediate resets and refetches', async () => {
      const fetch = vi.fn(async ({ search }: { search?: string }) => ({
        items: search ? ['filtered'] : ['all'],
        total: 1,
      }));
      const source = createInfiniteSource({ autoFetch: false, fetch });

      await source.reset();
      expect(source.current).toEqual(['all']);

      await source.search('x', { immediate: true });
      expect(source.current).toEqual(['filtered']);
    });
  });

  describe('current consistency', () => {
    it('current is stable reference between notifications', async () => {
      const fetch = vi.fn(async () => ({ items: ['a', 'b'], total: 5 }));
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 2 });

      await source.reset();

      const ref1 = source.current;

      // Access again without any change
      const ref2 = source.current;

      expect(ref1).toBe(ref2);
    });

    it('current updates after loadMore', async () => {
      const pages = [['a', 'b'], ['c']];
      const fetch = vi.fn(async ({ page }: { page: number }) => ({
        items: pages[page - 1] ?? [],
        total: 3,
      }));
      const source = createInfiniteSource({ autoFetch: false, fetch, limit: 2 });

      await source.reset();
      expect(source.current).toEqual(['a', 'b']);

      await source.loadMore();
      expect(source.current).toEqual(['a', 'b', 'c']);
    });
  });

  describe('dispose', () => {
    it('ready() rejects immediately with SourceDisposedError when already disposed', async () => {
      const { SourceDisposedError } = await import('../types');
      const fetch = vi.fn(async () => ({ items: [], total: 0 }));
      const source = createInfiniteSource({ autoFetch: false, fetch });

      source.dispose();

      await expect(source.ready()).rejects.toBeInstanceOf(SourceDisposedError);
    });

    it('double-dispose is idempotent (no throw)', () => {
      const fetch = vi.fn(async () => ({ items: [], total: 0 }));
      const source = createInfiniteSource({ autoFetch: false, fetch });

      source.dispose();

      expect(() => source.dispose()).not.toThrow();
    });

    it('disposed getter reflects lifecycle state', () => {
      const fetch = vi.fn(async () => ({ items: [], total: 0 }));
      const source = createInfiniteSource({ autoFetch: false, fetch });

      expect(source.disposed).toBe(false);

      source.dispose();

      expect(source.disposed).toBe(true);
    });

    it('disposalSignal aborts on dispose()', () => {
      const fetch = vi.fn(async () => ({ items: [], total: 0 }));
      const source = createInfiniteSource({ autoFetch: false, fetch });

      expect(source.disposalSignal.aborted).toBe(false);

      source.dispose();

      expect(source.disposalSignal.aborted).toBe(true);
    });

    it('stops notifying listeners after dispose', async () => {
      const fetch = vi.fn(async () => ({ items: ['x'], total: 1 }));
      const source = createInfiniteSource({ autoFetch: false, fetch });
      const listener = vi.fn();

      source.subscribe(listener);
      source.dispose();

      await source.reset();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('ready with timeout', () => {
    it('resolves immediately when already idle', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createInfiniteSource({ autoFetch: false, fetch });

      await expect(source.ready(1000)).resolves.toBeUndefined();
    });

    it('resolves after fetch completes within timeout', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createInfiniteSource({ autoFetch: false, fetch });

      const p = source.ready(5000);

      void source.reset();

      await vi.runAllTimersAsync();
      await expect(p).resolves.toBeUndefined();
    });
  });
});

describe('applyInfiniteQuery', () => {
  it('applies limit to infinite source', async () => {
    const fetch = vi.fn(async () => ({ items: ['a', 'b', 'c'], total: 3 }));
    const source = createInfiniteSource({ autoFetch: false, fetch, limit: 5 });

    await applyInfiniteQuery(source, { limit: 3 });

    expect(source.toQuery().limit).toBe(3);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('applies search to infinite source', async () => {
    const fetch = vi.fn(async ({ search }: { search?: string }) => ({
      items: search ? [`found-${search}`] : ['all'],
      total: 1,
    }));
    const source = createInfiniteSource({ autoFetch: false, fetch });

    await applyInfiniteQuery(source, { search: 'x' });

    expect(source.toQuery().search).toBe('x');
    expect(source.current).toEqual(['found-x']);
  });

  it('no-op when patch is empty', async () => {
    const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
    const source = createInfiniteSource({ autoFetch: false, fetch, limit: 10 });

    await applyInfiniteQuery(source, {});

    expect(fetch).not.toHaveBeenCalled();
  });
});
