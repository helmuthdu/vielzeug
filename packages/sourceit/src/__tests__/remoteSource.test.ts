import { createRemoteSource } from '../remoteSource';

describe('createRemoteSource', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetch lifecycle', () => {
    it('fetches on refresh and exposes metadata', async () => {
      const fetch = vi.fn(async ({ page }: { page: number }) => ({
        items: [`item-${page}`],
        total: 4,
      }));

      const source = createRemoteSource({ fetch, limit: 2 });

      source.refresh();
      await source.ready();

      expect(source.current).toEqual(['item-1']);
      expect(source.meta.pageCount).toBe(2);
      expect(source.meta.isLoading).toBe(false);
    });

    it('sets error and clears items when request fails', async () => {
      const source = createRemoteSource({
        fetch: vi.fn(async () => {
          throw new Error('boom');
        }),
      });

      source.refresh();
      await source.ready();

      expect(source.meta.errorMessage).toBe('boom');
      expect(source.current).toEqual([]);
    });

    it('clears previous error on successful retry', async () => {
      const fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({ items: ['ok'], total: 1 });
      const source = createRemoteSource({ fetch });

      source.refresh();
      await source.ready();
      expect(source.meta.errorMessage).toBe('boom');

      source.refresh();
      await source.ready();

      expect(source.meta.errorMessage).toBeNull();
      expect(source.current).toEqual(['ok']);
    });
  });

  describe('query updates and navigation', () => {
    it('applies update atomically and performs one fetch', async () => {
      const fetch = vi.fn(async ({ limit, page, search }: { limit: number; page: number; search?: string }) => ({
        items: [`${limit}-${page}-${search ?? ''}`],
        total: 50,
      }));
      const source = createRemoteSource({ fetch, limit: 10 });

      source.update((ctx) => {
        ctx.setLimit(5);
        ctx.search('x');
        ctx.goTo(3);
      });
      await source.ready();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(source.snapshot().limit).toBe(5);
      expect(source.snapshot().page).toBe(3);
      expect(source.current).toEqual(['5-3-x']);
    });

    it('goToLast navigates using current total pages', async () => {
      const fetch = vi.fn(async ({ limit, page }: { limit: number; page: number }) => ({
        items: [`p${page}`],
        total: 9,
      }));
      const source = createRemoteSource({ fetch, limit: 4 });

      source.refresh();
      await source.ready();

      source.goToLast();
      await source.ready();

      expect(source.meta.pageNumber).toBe(3);
      expect(source.current).toEqual(['p3']);
    });
  });

  describe('search timing', () => {
    it('debounces search and applies on flush', async () => {
      const fetch = vi.fn(async ({ search }: { search?: string }) => ({
        items: search ? [search] : ['init'],
        total: 1,
      }));
      const source = createRemoteSource({ debounceMs: 300, fetch });

      source.refresh();
      await source.ready();

      source.search('alpha');
      expect(source.meta.isPending).toBe(true);

      source.flush();
      await source.ready();

      expect(source.meta.isPending).toBe(false);
      expect(source.current).toEqual(['alpha']);
    });

    it('uses latest value for debounced search', async () => {
      const fetch = vi.fn(async ({ search }: { search?: string }) => ({
        items: [search ?? 'init'],
        total: 1,
      }));
      const source = createRemoteSource({ debounceMs: 300, fetch });

      source.search('first');
      source.search('second');

      vi.advanceTimersByTime(300);
      await source.ready();

      expect(source.current).toEqual(['second']);
    });
  });

  describe('serialization and hydration', () => {
    it('roundtrips snapshot through query params', async () => {
      const fetch = vi.fn(async () => ({ items: ['ok'], total: 20 }));
      const source = createRemoteSource({
        fetch,
        initialFilter: { active: true },
        initialSort: { by: 'name' },
        limit: 2,
      });

      source.refresh();
      await source.ready();
      source.goTo(2);
      await source.ready();

      const params = source.toQueryParams();
      const restored = createRemoteSource({ fetch, limit: 10 });

      restored.fromQueryParams(params);
      await restored.ready();

      expect(restored.snapshot()).toEqual({
        filter: { active: true },
        limit: 2,
        page: 2,
        search: '',
        sort: { by: 'name' },
      });
    });

    it('does not fetch on no-op hydrate', async () => {
      const fetch = vi.fn(async () => ({ items: ['ok'], total: 1 }));
      const source = createRemoteSource({ fetch, limit: 2 });

      source.hydrate({ limit: 2, page: 1, search: '' });
      await Promise.resolve();

      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('concurrency', () => {
    it('deduplicates in-flight requests for identical query key', async () => {
      const fetch = vi.fn(async ({ page }: { page: number }) => ({ items: [page], total: 10 }));
      const source = createRemoteSource({ fetch, limit: 2 });

      source.goTo(2);
      source.goTo(2);
      await source.ready();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(source.current).toEqual([2]);
    });
  });
});
