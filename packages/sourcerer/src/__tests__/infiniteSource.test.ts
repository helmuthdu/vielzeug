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

      expect(source.all).toEqual(['a', 'b']);
      expect(source.meta.hasMore).toBe(true);
      expect(source.meta.totalItems).toBe(5);
    });

    it('does not auto-fetch when autoFetch is false', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createInfiniteSource({ autoFetch: false, fetch });

      await Promise.resolve();

      expect(fetch).not.toHaveBeenCalled();
      expect(source.all).toEqual([]);
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

      expect(source.all).toEqual(['a', 'b']);

      await source.loadMore();
      expect(source.all).toEqual(['a', 'b', 'c', 'd']);

      await source.loadMore();
      expect(source.all).toEqual(['a', 'b', 'c', 'd', 'e']);

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

      expect(source.all).toEqual(['page-1', 'page-2']);

      await source.reset();

      expect(source.all).toEqual(['page-1']);
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

      expect(source.all).toEqual(['found-hello']);
    });

    it('searchNow applies immediately and resets accumulator', async () => {
      const fetch = vi.fn(async ({ search }: { search?: string }) => ({
        items: [search ?? 'none'],
        total: 1,
      }));
      const source = createInfiniteSource({ autoFetch: false, fetch });

      await source.searchNow('instant');

      expect(source.all).toEqual(['instant']);
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

      expect(source.meta.errorMessage).toBe('infinite-fail');
    });
  });
});
