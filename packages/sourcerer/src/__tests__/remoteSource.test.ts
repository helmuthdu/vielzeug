import { decodeQuery, encodeQuery } from '../codecs';
import { itemRange } from '../pagination';
import { createRemoteSource } from '../remoteSource';
import { SourceTimeoutError } from '../types';

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

      expect(source.meta.error?.message).toBe('boom');
      expect(source.meta.error?.name).toBe('SourceError');
      expect(source.current).toEqual([]);
    });

    it('clears previous error on successful retry', async () => {
      const fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({ items: ['ok'], total: 1 });
      const source = createRemoteSource({ autoFetch: false, fetch });

      await source.refresh();
      expect(source.meta.error?.message).toBe('boom');

      await source.refresh();
      expect(source.meta.error).toBeNull();
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
    it('restoreQuery applies multiple fields and performs one fetch', async () => {
      const fetch = vi.fn(async ({ limit, page, search }: { limit: number; page: number; search?: string }) => ({
        items: [`${limit}-${page}-${search ?? ''}`],
        total: 50,
      }));
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 10 });

      await source.restoreQuery({ limit: 5, page: 3, search: 'x' });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(source.toQuery().limit).toBe(5);
      expect(source.toQuery().page).toBe(3);
      expect(source.current).toEqual(['5-3-x']);
    });

    it('restoreQuery preserves page when limit changes (no implicit reset)', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 20 }));
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 5 });

      await source.goTo(3);
      await source.restoreQuery({ limit: 10 });

      expect(source.toQuery().page).toBe(2);
    });

    it('restoreQuery is a no-op when nothing changes', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 10 });

      await source.refresh();

      const callsBefore = fetch.mock.calls.length;

      // Empty search and current page — should be a no-op.
      await source.restoreQuery({ limit: 10, page: 1, search: '' });

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
    it('debounces search and applies on flush', async () => {
      const fetch = vi.fn(async ({ search }: { search?: string }) => ({
        items: search ? [search] : ['init'],
        total: 1,
      }));
      const source = createRemoteSource({ autoFetch: false, debounceMs: 300, fetch });

      await source.refresh();

      source.search('alpha');
      expect(source.meta.isSearchPending).toBe(true);

      await source.flush();

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

      expect(source.current).toEqual(['a', 'b']);
    });

    it('rollback is a no-op after the fetch already cleared optimistic state', async () => {
      const fetch = vi.fn(async () => ({ items: ['server-a'], total: 1 }));
      const source = createRemoteSource({ autoFetch: false, fetch });

      await source.refresh();
      expect(source.current).toEqual(['server-a']);

      const rollback = source.optimisticUpdate(() => ['optimistic'], { total: 1 });

      await source.refresh();
      expect(source.current).toEqual(['server-a']);

      rollback();
      expect(source.current).toEqual(['server-a']);
    });

    it('throws when a concurrent optimistic update is already active', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createRemoteSource({ autoFetch: false, fetch });

      await source.refresh();

      source.optimisticUpdate((items) => [...items, 'b']);

      expect(() => source.optimisticUpdate((items) => [...items, 'c'])).toThrow(
        'An optimistic update is already active',
      );
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

      await source.refresh();

      expect(source.meta.error?.message).toBe('network error');
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
    it('roundtrips snapshot through encodeQuery + hydrate', async () => {
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

      await restored.restoreQuery(decodeQuery(params, { defaultLimit: 10 }));

      expect(restored.toQuery()).toEqual({
        filter: { active: true },
        limit: 2,
        page: 2,
        sort: { by: 'name' },
      });
    });

    it('restoreQuery with no changes does not fetch', async () => {
      const fetch = vi.fn(async () => ({ items: ['ok'], total: 1 }));
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 2 });

      await source.restoreQuery({ limit: 2, page: 1, search: '' });
      await Promise.resolve();

      expect(fetch).not.toHaveBeenCalled();
    });

    it('snapshot initialises source with pre-loaded data', async () => {
      const fetch = vi.fn(async () => ({ items: ['server-item'], total: 1 }));
      const snapshot = { items: ['prefetched'], total: 1 };
      const source = createRemoteSource({ autoFetch: false, fetch, snapshot });

      expect(source.current).toEqual(['prefetched']);
      expect(source.meta.totalItems).toBe(1);
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

  describe('reset()', () => {
    it('restores filter and sort to config defaults on reset()', async () => {
      const fetch = vi.fn(async ({ filter, sort }: { filter?: unknown; sort?: unknown }) => ({
        items: [JSON.stringify({ filter, sort })],
        total: 1,
      }));
      const source = createRemoteSource({
        autoFetch: false,
        fetch,
        filter: { active: true },
        sort: { by: 'name' },
      });

      await source.setFilter({ active: false });
      await source.setSort({ by: 'age' });
      await source.reset();

      expect(source.toQuery()).toMatchObject({ filter: { active: true }, sort: { by: 'name' } });
    });

    it('reset() resets search and page to defaults', async () => {
      const fetch = vi.fn(async () => ({ items: Array.from({ length: 10 }, (_, i) => i), total: 30 }));
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 10 });

      await source.refresh();
      await source.goTo(3);
      await source.searchNow('hello');
      await source.reset();

      expect(source.toQuery()).toMatchObject({ page: 1 });
      expect(source.toQuery().search).toBeUndefined();
    });
  });

  describe('goTo() clamping', () => {
    it('clamps goTo() to valid page range after data is loaded', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 30 }));
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 10 });

      await source.refresh();

      await source.goTo(999);

      expect(source.toQuery().page).toBe(3);
    });

    it('clamps goTo() to page 1 minimum', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 30 }));
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 10 });

      await source.refresh();
      await source.goTo(-5);

      expect(source.toQuery().page).toBe(1);
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
      expect('itemStart' in meta).toBe(false);
      expect('itemEnd' in meta).toBe(false);
      expect('errorMessage' in meta).toBe(false);
    });

    it('itemRange computes correct display range', async () => {
      const fetch = vi.fn(async () => ({ items: Array.from({ length: 5 }, (_, i) => i + 1), total: 5 }));
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 3 });

      await source.refresh();

      const range = itemRange(source.meta);

      expect(range.start).toBe(1);
      expect(range.end).toBe(3);
      expect(source.meta.totalItems).toBe(5);
    });
  });

  describe('retry', () => {
    it('retries on failure and resolves on success', async () => {
      const fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce({ items: ['retried'], total: 1 });
      const source = createRemoteSource({
        autoFetch: false,
        fetch,
        retry: { attempts: 1, delay: () => 10 },
      });

      const p = source.refresh();

      await vi.runAllTimersAsync();
      await p;

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(source.current).toEqual(['retried']);
      expect(source.meta.error).toBeNull();
    });

    it('reports error after all retries exhausted', async () => {
      const fetch = vi.fn().mockRejectedValue(new Error('permanent failure'));
      const source = createRemoteSource({
        autoFetch: false,
        fetch,
        retry: { attempts: 2, delay: () => 10 },
      });

      const p = source.refresh();

      await vi.runAllTimersAsync();
      await p;

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(source.meta.error?.message).toBe('permanent failure');
    });
  });

  describe('staleTime', () => {
    it('skips fetch when data is within staleTime', async () => {
      const fetch = vi.fn(async () => ({ items: ['fresh'], total: 1 }));
      const source = createRemoteSource({ autoFetch: false, fetch, staleTime: 5000 });

      await source.refresh();
      expect(fetch).toHaveBeenCalledTimes(1);

      await source.refresh();
      expect(fetch).toHaveBeenCalledTimes(1); // skipped — still fresh

      expect(source.current).toEqual(['fresh']);
    });

    it('re-fetches after staleTime expires', async () => {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce({ items: ['v1'], total: 1 })
        .mockResolvedValueOnce({ items: ['v2'], total: 1 });
      const source = createRemoteSource({ autoFetch: false, fetch, staleTime: 1000 });

      await source.refresh();
      expect(source.current).toEqual(['v1']);

      vi.advanceTimersByTime(1001);

      await source.refresh();
      expect(source.current).toEqual(['v2']);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('always fetches when staleTime is 0 (default)', async () => {
      const fetch = vi.fn(async () => ({ items: ['x'], total: 1 }));
      const source = createRemoteSource({ autoFetch: false, fetch });

      await source.refresh();
      await source.refresh();

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('always fetches when the query key changes, even within staleTime', async () => {
      const fetch = vi.fn(async ({ page }: { page: number }) => ({
        items: [`page-${page}`],
        total: 20,
      }));
      const source = createRemoteSource({ autoFetch: false, fetch, limit: 5, staleTime: 60_000 });

      await source.refresh(); // page 1 — fetches and caches key
      expect(fetch).toHaveBeenCalledTimes(1);

      await source.goTo(2); // different query key — must fetch despite fresh cache
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(source.current).toEqual(['page-2']);

      await source.refresh(); // same query key (page 2) within staleTime — skipped
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('ready with timeout', () => {
    it('resolves when source becomes idle within timeout', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createRemoteSource({ autoFetch: false, fetch });

      const p = source.ready(5000);

      void source.refresh();

      await vi.runAllTimersAsync();
      await expect(p).resolves.toBeUndefined();
    });

    it('rejects when timeout expires before idle', async () => {
      let resolveHang!: () => void;
      const fetch = vi.fn(
        () =>
          new Promise<{ items: string[]; total: number }>((resolve) => {
            resolveHang = () => resolve({ items: [], total: 0 });
          }),
      );
      const source = createRemoteSource({ autoFetch: false, fetch });

      void source.refresh();

      const p = source.ready(100);

      vi.advanceTimersByTime(101);
      await expect(p).rejects.toBeInstanceOf(SourceTimeoutError);

      resolveHang();
    });
  });

  describe('optimisticUpdate()', () => {
    it('applies optimistic update immediately and rollback restores state', async () => {
      const fetch = vi.fn(async () => ({ items: ['a', 'b'], total: 2 }));
      const source = createRemoteSource({ autoFetch: false, fetch });

      await source.refresh();

      const rollback = source.optimisticUpdate((items) => [...items, 'c'], { total: 3 });

      expect(source.current).toEqual(['a', 'b', 'c']);
      expect(source.meta.totalItems).toBe(3);

      rollback();

      expect(source.current).toEqual(['a', 'b']);
      expect(source.meta.totalItems).toBe(2);
    });

    it('throws when a second optimistic update is started while one is active', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createRemoteSource({ autoFetch: false, fetch });

      await source.refresh();
      source.optimisticUpdate((items) => [...items, 'b']);

      expect(() => source.optimisticUpdate((items) => [...items, 'c'])).toThrow('already active');
    });
  });

  describe('refreshInterval', () => {
    it('re-fetches at the configured interval', async () => {
      const fetch = vi.fn(async () => ({ items: ['x'], total: 1 }));
      const source = createRemoteSource({ autoFetch: false, fetch, refreshInterval: 1000 });

      await source.refresh();
      expect(fetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1001);

      expect(fetch.mock.calls.length).toBeGreaterThan(1);

      source.dispose();
    });

    it('stops re-fetching after dispose()', async () => {
      const fetch = vi.fn(async () => ({ items: ['x'], total: 1 }));
      const source = createRemoteSource({ autoFetch: false, fetch, refreshInterval: 500 });

      await source.refresh();

      source.dispose();

      const callsBefore = fetch.mock.calls.length;

      vi.advanceTimersByTime(2000);
      await vi.runAllTimersAsync();

      expect(fetch.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('dispose', () => {
    it('stops notifying listeners and aborts inflight requests', async () => {
      let capturedSignal: AbortSignal | undefined;
      const fetch = vi.fn(async (_q: unknown, signal: AbortSignal) => {
        capturedSignal = signal;
        await new Promise<void>((resolve) => setTimeout(resolve, 100));

        return { items: ['x'], total: 1 };
      });
      const source = createRemoteSource({ autoFetch: false, fetch });
      const listener = vi.fn();

      source.subscribe(listener);
      source.refresh();

      source.dispose();
      listener.mockClear();

      expect(capturedSignal?.aborted).toBe(true);

      await vi.runAllTimersAsync();

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
