import { decodeQuery, encodeQuery } from '../codecs';
import { createRemoteSource } from '../remoteSource';

describe('createRemoteSource', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('autoFetch', () => {
    it('fetches automatically on creation by default', async () => {
      const fetch = vi.fn(async () => ({ items: ['auto'], total: 1 }));
      const source = createRemoteSource({ fetch });

      await source.ready();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(source.current).toEqual(['auto']);
    });

    it('does not auto-fetch when autoFetch is false', async () => {
      const fetch = vi.fn(async () => ({ items: ['nope'], total: 1 }));
      const source = createRemoteSource({ autoFetch: false, fetch });

      await Promise.resolve();

      expect(fetch).not.toHaveBeenCalled();
      expect(source.current).toEqual([]);
    });
  });

  describe('fetch lifecycle', () => {
    it('exposes metadata after fetch', async () => {
      const fetch = vi.fn(async ({ page }: { page: number }) => ({
        items: [`item-${page}`],
        total: 4,
      }));

      const source = createRemoteSource({ autoFetch: false, fetch, limit: 2 });

      await source.refresh();

      expect(source.current).toEqual(['item-1']);
      expect(source.meta.pageCount).toBe(2);
      expect(source.meta.isLoading).toBe(false);
    });

    it('sets error and clears items when request fails', async () => {
      const source = createRemoteSource({
        autoFetch: false,
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
      const source = createRemoteSource({ autoFetch: false, fetch });

      await source.refresh();
      expect(source.meta.errorMessage).toBe('boom');

      await source.refresh();
      expect(source.meta.errorMessage).toBeNull();
      expect(source.current).toEqual(['ok']);
    });

    it('passes AbortSignal to fetch function', async () => {
      let receivedSignal: AbortSignal | undefined;
      const source = createRemoteSource({
        autoFetch: false,
        fetch: vi.fn(async (_, signal: AbortSignal) => {
          receivedSignal = signal;

          return { items: ['a'], total: 1 };
        }),
      });

      await source.refresh();

      expect(receivedSignal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('query updates and navigation', () => {
    it('update applies multiple fields and performs one fetch', async () => {
      const fetch = vi.fn(async ({ limit, page, search }: { limit: number; page: number; search?: string }) => ({
        items: [`${limit}-${page}-${search ?? ''}`],
        total: 50,
      }));
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 10 });

      await source.update({ limit: 5, page: 3, search: 'x' });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(source.toQuery().limit).toBe(5);
      expect(source.toQuery().page).toBe(3);
      expect(source.current).toEqual(['5-3-x']);
    });

    it('update resets page to 1 when limit changes', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 20 }));
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 5 });

      await source.goTo(3);
      await source.update({ limit: 10 });

      expect(source.toQuery().page).toBe(1);
    });

    it('update is a no-op when nothing changes', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 10 });

      await source.refresh();

      const callsBefore = fetch.mock.calls.length;

      await source.update({ limit: 10, page: 1, search: '' });

      expect(fetch.mock.calls.length).toBe(callsBefore);
    });

    it('goToLast navigates using current total pages', async () => {
      const fetch = vi.fn(async ({ page }: { page: number }) => ({ items: [`p${page}`], total: 9 }));
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 4 });

      await source.refresh();
      await source.goToLast();

      expect(source.meta.pageNumber).toBe(3);
      expect(source.current).toEqual(['p3']);
    });
  });

  describe('search timing', () => {
    it('debounces search and applies on commit', async () => {
      const fetch = vi.fn(async ({ search }: { search?: string }) => ({
        items: search ? [search] : ['init'],
        total: 1,
      }));
      const source = createRemoteSource({ autoFetch: false, debounceMs: 300, fetch });

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
      const source = createRemoteSource({ autoFetch: false, debounceMs: 300, fetch });

      source.search('first');
      source.search('second');

      vi.advanceTimersByTime(300);
      await source.ready();

      expect(source.current).toEqual(['second']);
    });
  });

  describe('optimistic updates', () => {
    it('applies optimistic state immediately', async () => {
      const fetch = vi.fn(async () => ({ items: ['a', 'b', 'c'], total: 3 }));
      const source = createRemoteSource({ autoFetch: false, fetch });

      await source.refresh();
      expect(source.current).toEqual(['a', 'b', 'c']);

      const rollback = source.optimisticUpdate((current) => [...current, 'd'], { total: 4 });

      expect(source.current).toEqual(['a', 'b', 'c', 'd']);
      expect(source.meta.totalItems).toBe(4);

      // Manual rollback clears optimistic state.
      rollback();

      expect(source.current).toEqual(['a', 'b', 'c']);
      expect(source.meta.totalItems).toBe(3);
    });

    it('clears optimistic state after successful fetch', async () => {
      const fetch = vi.fn(async () => ({ items: ['a', 'b'], total: 2 }));
      const source = createRemoteSource({ autoFetch: false, fetch });

      await source.refresh();

      source.optimisticUpdate((current) => [...current, 'optimistic'], { total: 3 });
      expect(source.current).toContain('optimistic');

      await source.refresh();

      // Optimistic cleared after real fetch settles.
      expect(source.current).toEqual(['a', 'b']);
    });

    it('rollback is a no-op after the fetch already cleared optimistic state', async () => {
      const fetch = vi.fn(async () => ({ items: ['server-a'], total: 1 }));
      const source = createRemoteSource({ autoFetch: false, fetch });

      await source.refresh();
      expect(source.current).toEqual(['server-a']);

      const rollback = source.optimisticUpdate(() => ['optimistic'], { total: 1 });

      // Fetch settles — overwrites optimistic with real server data, deactivates rollback.
      await source.refresh();
      expect(source.current).toEqual(['server-a']);

      // Calling rollback after fetch must not corrupt state.
      rollback();
      expect(source.current).toEqual(['server-a']);
    });

    it('restores pre-optimistic state (not empty) when fetch fails', async () => {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce({ items: ['a', 'b'], total: 2 })
        .mockRejectedValueOnce(new Error('network error'));
      const source = createRemoteSource({ autoFetch: false, fetch });

      await source.refresh();
      expect(source.current).toEqual(['a', 'b']);

      source.optimisticUpdate((current) => [...current, 'c'], { total: 3 });
      expect(source.current).toEqual(['a', 'b', 'c']);

      // Fetch fails — should restore to ['a', 'b'], not []
      await source.refresh();

      expect(source.meta.errorMessage).toBe('network error');
      expect(source.current).toEqual(['a', 'b']);
    });
  });

  describe('stable references', () => {
    it('returns stable meta reference between reads', () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createRemoteSource({ autoFetch: false, fetch });

      expect(source.meta).toBe(source.meta);
    });

    it('replaces meta and current references after fetch', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createRemoteSource({ autoFetch: false, fetch });

      const metaBefore = source.meta;
      const currentBefore = source.current;

      await source.refresh();

      expect(source.meta).not.toBe(metaBefore);
      expect(source.current).not.toBe(currentBefore);
      expect(source.meta.totalItems).toBe(1);
    });
  });

  describe('serialization and hydration', () => {
    it('roundtrips snapshot through encodeQuery + restore', async () => {
      const fetch = vi.fn(async () => ({ items: ['ok'], total: 20 }));
      const source = createRemoteSource({
        autoFetch: false,
        fetch,
        filter: { active: true },
        limit: 2,
        sort: { by: 'name' },
      });

      await source.refresh();
      await source.goTo(2);

      const params = encodeQuery(source.toQuery());
      const restored = createRemoteSource({ autoFetch: false, fetch, limit: 10 });

      await restored.restore(decodeQuery(params, { defaultLimit: 10 }));

      expect(restored.toQuery()).toEqual({
        filter: { active: true },
        limit: 2,
        page: 2,
        search: '',
        sort: { by: 'name' },
      });
    });

    it('restore does not fetch on no-op', async () => {
      const fetch = vi.fn(async () => ({ items: ['ok'], total: 1 }));
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 2 });

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
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 2 });

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
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 10 });

      const p2 = source.goTo(2);
      const p3 = source.goTo(3);

      expect(callCount).toBe(2);

      resolvers[0]({ items: ['stale-page2'], total: 30 });
      await p2;

      expect(source.current).not.toEqual(['stale-page2']);

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
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 10 });

      source.goTo(2);
      source.goTo(3);

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
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 5 });

      await source.refresh();
      expect(source.meta.pageNumber).toBe(1);

      const callsBefore = fetch.mock.calls.length;

      await source.prev();

      expect(fetch.mock.calls.length).toBe(callsBefore);
      expect(source.meta.pageNumber).toBe(1);
    });

    it('next does not fetch when already at last page', async () => {
      const fetch = vi.fn(async () => ({ items: ['a', 'b'], total: 2 }));
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 5 });

      await source.refresh();
      expect(source.meta.pageCount).toBe(1);

      const callsBefore = fetch.mock.calls.length;

      await source.next();

      expect(fetch.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('custom queryKey', () => {
    it('uses custom queryKey for deduplication', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      let keyCallCount = 0;
      const source = createRemoteSource({
        autoFetch: false,
        fetch,
        queryKey: (q) => {
          keyCallCount++;

          return `p${q.page}-l${q.limit}`;
        },
      });

      source.goTo(2);
      source.goTo(2);

      // queryKey called twice, but fetch only once (deduplication still works).
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(keyCallCount).toBeGreaterThan(0);
    });
  });

  describe('meta fields', () => {
    it('does not include removed SourceMeta boolean flags', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 5 }));
      const source = createRemoteSource({ autoFetch: false, fetch });

      await source.refresh();

      const meta = source.meta;

      expect('hasNoItems' in meta).toBe(false);
      expect('isFirstPage' in meta).toBe(false);
      expect('isLastPage' in meta).toBe(false);
    });
  });
});
