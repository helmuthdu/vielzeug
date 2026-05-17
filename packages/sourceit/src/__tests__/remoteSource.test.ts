import { encodeRemoteQueryParams } from '../codecs';
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

      await source.refresh();

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

      await source.refresh();

      expect(source.meta.errorMessage).toBe('boom');
      expect(source.current).toEqual([]);
    });

    it('clears previous error on successful retry', async () => {
      const fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({ items: ['ok'], total: 1 });
      const source = createRemoteSource({ fetch });

      await source.refresh();
      expect(source.meta.errorMessage).toBe('boom');

      await source.refresh();

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

      await source.batch((ctx) => {
        ctx.setLimit(5);
        ctx.search('x');
        ctx.goTo(3);
      });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(source.toQuery().limit).toBe(5);
      expect(source.toQuery().page).toBe(3);
      expect(source.current).toEqual(['5-3-x']);
    });

    it('goToLast navigates using current total pages', async () => {
      const fetch = vi.fn(async ({ limit, page }: { limit: number; page: number }) => ({
        items: [`p${page}`],
        total: 9,
      }));
      const source = createRemoteSource({ fetch, limit: 4 });

      await source.refresh();

      await source.goToLast();

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

      await source.refresh();

      source.search('alpha');
      expect(source.meta.isSearchPending).toBe(true);

      await source.commit();

      expect(source.meta.isSearchPending).toBe(false);
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

  describe('stable references', () => {
    it('returns stable meta reference between reads', () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createRemoteSource({ fetch });

      const beforeA = source.meta;
      const beforeB = source.meta;

      expect(beforeA).toBe(beforeB);
    });

    it('replaces meta reference after fetch updates', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createRemoteSource({ fetch });

      const before = source.meta;

      await source.refresh();

      const afterA = source.meta;
      const afterB = source.meta;

      expect(afterA).toBe(afterB);
      expect(afterA).not.toBe(before);
      expect(afterA.totalItems).toBe(1);
    });

    it('returns stable current reference between reads', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createRemoteSource({ fetch });

      await source.refresh();

      const currentA = source.current;
      const currentB = source.current;

      expect(currentA).toBe(currentB);
    });
  });

  describe('serialization and hydration', () => {
    it('roundtrips snapshot through query params', async () => {
      const fetch = vi.fn(async () => ({ items: ['ok'], total: 20 }));
      const source = createRemoteSource({
        fetch,
        filter: { active: true },
        limit: 2,
        sort: { by: 'name' },
      });

      await source.refresh();
      await source.goTo(2);

      const params = encodeRemoteQueryParams(source.toQuery());
      const restored = createRemoteSource({ fetch, limit: 10 });

      await restored.fromQueryParams(params);

      expect(restored.toQuery()).toEqual({
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

      await source.restore({ limit: 2, page: 1, search: '' });
      await Promise.resolve();

      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('concurrency', () => {
    it('deduplicates in-flight requests for identical query key', async () => {
      let resolveFetch!: (value: { items: readonly number[]; total: number }) => void;
      const fetch = vi.fn(async ({ page }: { page: number }) => {
        return new Promise<{ items: readonly number[]; total: number }>((resolve) => {
          resolveFetch = resolve;
        }).then(() => ({ items: [page], total: 10 }));
      });
      const source = createRemoteSource({ fetch, limit: 2 });

      source.goTo(2);
      source.goTo(2);

      expect(fetch).toHaveBeenCalledTimes(1);

      resolveFetch({ items: [2], total: 10 });
      await source.ready();

      expect(source.current).toEqual([2]);
    });

    it('ignores stale responses from superseded requests', async () => {
      let callCount = 0;
      const resolvers: Array<(v: { items: string[]; total: number }) => void> = [];
      const fetch = vi.fn(() => {
        callCount++;

        return new Promise<{ items: string[]; total: number }>((resolve) => {
          resolvers.push(resolve);
        });
      });
      const source = createRemoteSource({ fetch, limit: 10 });

      // Fire two navigations without awaiting — page 3 supersedes page 2.
      const p2 = source.goTo(2);
      const p3 = source.goTo(3);

      expect(callCount).toBe(2);

      // Resolve the stale page-2 response first.
      resolvers[0]({ items: ['stale-page2'], total: 30 });
      await p2;

      // Stale result must not overwrite state.
      expect(source.current).not.toEqual(['stale-page2']);
      expect(source.meta.isLoading).toBe(true); // page-3 request still in flight

      // Resolve the current page-3 response.
      resolvers[1]({ items: ['current-page3'], total: 30 });
      await p3;

      expect(source.current).toEqual(['current-page3']);
      expect(source.meta.pageNumber).toBe(3);
      expect(source.meta.isLoading).toBe(false);
    });

    it('keeps isLoading true until all pending requests settle', async () => {
      let resolveLatest!: (v: { items: string[]; total: number }) => void;
      let callCount = 0;
      const fetch = vi.fn(({ page }: { page: number }) => {
        callCount++;

        if (page === 3) {
          return new Promise<{ items: string[]; total: number }>((resolve) => {
            resolveLatest = resolve;
          });
        }

        return Promise.resolve({ items: [`p${page}`], total: 30 });
      });
      const source = createRemoteSource({ fetch, limit: 10 });

      source.goTo(2); // resolves immediately (sync microtask)
      source.goTo(3); // suspends

      expect(source.meta.isLoading).toBe(true);

      resolveLatest({ items: ['page3'], total: 30 });
      await source.ready();

      expect(source.meta.isLoading).toBe(false);
      expect(source.current).toEqual(['page3']);
    });
  });

  describe('boundary conditions', () => {
    it('prev does not fetch when already at first page', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 10 }));
      const source = createRemoteSource({ fetch, limit: 5 });

      await source.refresh();
      expect(source.meta.pageNumber).toBe(1);

      const callsBefore = fetch.mock.calls.length;

      await source.prev();

      expect(fetch.mock.calls.length).toBe(callsBefore);
      expect(source.meta.pageNumber).toBe(1);
    });

    it('next does not fetch when already at last page', async () => {
      const fetch = vi.fn(async () => ({ items: ['a', 'b'], total: 2 }));
      const source = createRemoteSource({ fetch, limit: 5 });

      await source.refresh();
      expect(source.meta.isLastPage).toBe(true);

      const callsBefore = fetch.mock.calls.length;

      await source.next();

      expect(fetch.mock.calls.length).toBe(callsBefore);
    });

    it('fromQueryParams without filter/sort preserves configured defaults', async () => {
      const fetch = vi.fn(async () => ({ items: [], total: 0 }));
      const source = createRemoteSource({
        fetch,
        filter: { active: true },
        limit: 5,
        sort: { by: 'name' },
      });

      // Params that carry no filter or sort.
      await source.fromQueryParams({ limit: '5', page: '2' });

      expect(source.toQuery().filter).toEqual({ active: true });
      expect(source.toQuery().sort).toEqual({ by: 'name' });
    });
  });
});
