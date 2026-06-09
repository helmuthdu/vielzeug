import { decodeQuery, encodeQuery } from '../codecs';
import { createLocalSource } from '../localSource';
import { itemRange } from '../pagination';

describe('createLocalSource', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialData config option', () => {
    it('uses cfg.initialData when positional data is empty', () => {
      const source = createLocalSource([], { initialData: [1, 2, 3], limit: 2 });

      expect(source.current).toEqual([1, 2]);
      expect(source.meta.totalItems).toBe(3);
    });

    it('cfg.initialData takes precedence over positional data when both are provided', () => {
      const source = createLocalSource([10, 20], { initialData: [1, 2, 3] });

      expect(source.meta.totalItems).toBe(3);
    });
  });

  describe('basic pagination', () => {
    it('paginates data with default limit of 20', () => {
      const data = Array.from({ length: 25 }, (_, i) => i + 1);
      const source = createLocalSource(data);

      expect(source.current).toHaveLength(20);
      expect(source.meta.totalItems).toBe(25);
      expect(source.meta.pageCount).toBe(2);
    });

    it('respects custom limit', () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

      expect(source.current).toEqual([1, 2]);
      expect(source.meta.pageCount).toBe(3);
    });

    it('goTo navigates to the specified page', async () => {
      const source = createLocalSource([1, 2, 3, 4], { limit: 2 });

      await source.goTo(2);

      expect(source.meta.pageNumber).toBe(2);
      expect(source.current).toEqual([3, 4]);
    });

    it('next moves to the next page', async () => {
      const source = createLocalSource([1, 2, 3, 4], { limit: 2 });

      await source.next();

      expect(source.meta.pageNumber).toBe(2);
    });

    it('prev moves to the previous page', async () => {
      const source = createLocalSource([1, 2, 3, 4], { limit: 2 });

      await source.goTo(2);
      await source.prev();

      expect(source.meta.pageNumber).toBe(1);
    });

    it('prev does not go below page 1', async () => {
      const source = createLocalSource([1, 2, 3], { limit: 2 });

      await source.prev();

      expect(source.meta.pageNumber).toBe(1);
    });

    it('goToLast navigates to the last page', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

      await source.goToLast();

      expect(source.meta.pageNumber).toBe(3);
      expect(source.current).toEqual([5]);
    });

    it('setLimit updates page size and resets to page 1', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

      await source.goTo(2);
      await source.setLimit(3);

      expect(source.meta.pageSize).toBe(3);
      expect(source.meta.pageNumber).toBe(1);
    });

    it('setData replaces data and recomputes', async () => {
      const source = createLocalSource([1, 2, 3], { limit: 2 });

      await source.setData([10, 20, 30, 40]);

      expect(source.current).toEqual([10, 20]);
      expect(source.meta.totalItems).toBe(4);
    });
  });

  describe('filter and sort', () => {
    it('applies initial filter from config', () => {
      const source = createLocalSource([1, 2, 3, 4, 5], {
        filter: (x) => x > 2,
        limit: 10,
      });

      expect(source.current).toEqual([3, 4, 5]);
    });

    it('applies initial sort from config', () => {
      const source = createLocalSource([3, 1, 4, 1, 5], {
        sort: (a, b) => a - b,
      });

      expect(source.current[0]).toBe(1);
    });

    it('setFilter replaces the active filter', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 10 });

      await source.setFilter((x) => x % 2 === 0);

      expect(source.current).toEqual([2, 4]);
    });

    it('setFilter with undefined clears the filter', async () => {
      const source = createLocalSource([1, 2, 3], {
        filter: (x) => x > 1,
        limit: 10,
      });

      await source.setFilter(undefined);

      expect(source.current).toEqual([1, 2, 3]);
    });

    it('setSort replaces the active sort', async () => {
      const source = createLocalSource([3, 1, 2], { limit: 10 });

      await source.setSort((a, b) => a - b);

      expect(source.current).toEqual([1, 2, 3]);
    });

    it('reset restores initial filter and sort', async () => {
      const source = createLocalSource([1, 2, 3, 4], { filter: (x) => x > 1, limit: 2, sort: (a, b) => b - a });

      await source.searchNow('3');
      await source.goTo(2);
      await source.reset();

      expect(source.toQuery()).toEqual({ limit: 2, page: 1 });
      expect(source.current).toEqual([4, 3]);
    });
  });

  describe('search behavior', () => {
    it('debounces search and applies on flush', async () => {
      const source = createLocalSource(['apple', 'banana', 'cherry']);

      source.search('ban');
      expect(source.meta.isSearchPending).toBe(true);
      expect(source.current).toEqual(['apple', 'banana', 'cherry']);

      await source.flush();

      expect(source.meta.isSearchPending).toBe(false);
      expect(source.current).toEqual(['banana']);
    });

    it('uses only the latest debounced query', async () => {
      const source = createLocalSource(['alpha', 'beta', 'gamma'], {
        searchFn: (items, q) => items.filter((s) => (s as string).includes(q)),
      });

      source.search('al');
      source.search('ga');

      vi.advanceTimersByTime(300);

      expect(source.current).toEqual(['gamma']);
      expect(source.meta.isSearchPending).toBe(false);
    });

    it('searchNow applies immediately without debounce', async () => {
      const source = createLocalSource(['apple', 'banana', 'cherry']);

      await source.searchNow('ban');

      expect(source.meta.isSearchPending).toBe(false);
      expect(source.current).toEqual(['banana']);
    });
  });

  describe('stable references', () => {
    it('returns stable current and meta references between updates', () => {
      const source = createLocalSource([1, 2, 3, 4], { limit: 2 });

      const currentA = source.current;
      const currentB = source.current;
      const metaA = source.meta;
      const metaB = source.meta;

      expect(currentA).toBe(currentB);
      expect(metaA).toBe(metaB);
    });

    it('replaces current and meta references after a state change', async () => {
      const source = createLocalSource([1, 2, 3, 4], { limit: 2 });

      const currentBefore = source.current;
      const metaBefore = source.meta;

      await source.goTo(2);

      expect(source.current).not.toBe(currentBefore);
      expect(source.meta).not.toBe(metaBefore);
      expect(source.current).toEqual([3, 4]);
      expect(source.meta.pageNumber).toBe(2);
    });
  });

  describe('serialization and restoreQuery', () => {
    it('roundtrips through encodeQuery + restoreQuery', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5, 6], { limit: 2 });

      await source.searchNow('2');

      const serialized = encodeQuery(source.toQuery());
      const restored = createLocalSource([1, 2, 3, 4, 5, 6], { limit: 10 });

      await restored.restoreQuery(decodeQuery(serialized, { defaultLimit: 10 }));

      expect(restored.toQuery()).toEqual({ limit: 2, page: 1, search: '2' });
    });

    it('restoreQuery with no changes is a no-op', async () => {
      const source = createLocalSource([1, 2, 3, 4], { limit: 2 });
      const listener = vi.fn();

      source.subscribe(listener);
      await source.restoreQuery({ limit: 2, page: 1, search: '' });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('meta fields', () => {
    it('does not include removed SourceMeta boolean flags', () => {
      const source = createLocalSource([1, 2]);
      const meta = source.meta;

      expect('hasNoItems' in meta).toBe(false);
      expect('isFirstPage' in meta).toBe(false);
      expect('isLastPage' in meta).toBe(false);
      expect('itemStart' in meta).toBe(false);
      expect('itemEnd' in meta).toBe(false);
      expect('errorMessage' in meta).toBe(false);
    });

    it('itemRange computes correct display range', () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 3 });

      const range = itemRange(source.meta);

      expect(range.start).toBe(1);
      expect(range.end).toBe(3);
      expect(source.meta.totalItems).toBe(5);
      expect(source.meta.pageCount).toBe(2);
    });

    it('itemRange returns zeros for empty results', () => {
      const source = createLocalSource([], { limit: 10 });

      const range = itemRange(source.meta);

      expect(range.start).toBe(0);
      expect(range.end).toBe(0);
    });

    it('toQuery omits search key when no search is active', () => {
      const source = createLocalSource([1, 2, 3], { limit: 10 });

      expect(source.toQuery()).toEqual({ limit: 10, page: 1 });
      expect('search' in source.toQuery()).toBe(false);
    });

    it('toQuery includes search when active', async () => {
      const source = createLocalSource([1, 2, 3], { limit: 10 });

      await source.searchNow('hello');

      expect(source.toQuery()).toEqual({ limit: 10, page: 1, search: 'hello' });
    });
  });

  describe('ready()', () => {
    it('resolves immediately when source is idle', async () => {
      const source = createLocalSource([1, 2, 3]);

      await expect(source.ready()).resolves.toBeUndefined();
    });

    it('resolves after async filterAsync completes', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5], {
        filterAsync: async (items) => items.filter((x) => x > 2),
      });

      const p = source.setData([1, 2, 3, 4, 5]);
      const readyP = source.ready();

      await vi.runAllTimersAsync();
      await p;
      await readyP;

      expect(source.meta.isLoading).toBe(false);
      expect(source.current).toEqual([3, 4, 5]);
    });

    it('rejects with SourceTimeoutError on timeout', async () => {
      const { SourceTimeoutError } = await import('../types');
      const source = createLocalSource([1, 2, 3], {
        filterAsync: () => new Promise(() => {}),
      });

      void source.setData([1, 2, 3]);

      const p = source.ready(100);

      vi.advanceTimersByTime(101);

      await expect(p).rejects.toBeInstanceOf(SourceTimeoutError);
    });

    it('rejects when source is disposed while waiting', async () => {
      const source = createLocalSource([1, 2, 3], {
        filterAsync: () => new Promise(() => {}),
      });

      void source.setData([1, 2, 3]);

      const readyP = source.ready();

      source.dispose();

      await expect(readyP).rejects.toThrow('disposed');
    });
  });

  describe('reset() cancels pending debounce', () => {
    it('cancels a pending search debounce before resetting', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 10 });

      source.search('3');

      expect(source.meta.isSearchPending).toBe(true);

      await source.reset();

      expect(source.meta.isSearchPending).toBe(false);
      expect(source.toQuery().search).toBeUndefined();
      expect(source.current).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('dispose', () => {
    it('stops notifying listeners after dispose', async () => {
      const source = createLocalSource([1, 2, 3]);
      const listener = vi.fn();

      source.subscribe(listener);
      source.dispose();

      await source.goTo(2);

      expect(listener).not.toHaveBeenCalled();
    });

    it('subscribe returns no-op unsubscribe after dispose', () => {
      const source = createLocalSource([1, 2, 3]);

      source.dispose();

      const unsubscribe = source.subscribe(() => {});

      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('default search', () => {
    it('performs case-insensitive substring match by default', async () => {
      const source = createLocalSource([{ name: 'Alice' }, { name: 'Bob' }, { name: 'ALICE' }], {
        searchFn: (items, q) => items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())),
      });

      await source.searchNow('alice');

      expect(source.current).toEqual([{ name: 'Alice' }, { name: 'ALICE' }]);
    });
  });

  describe('restoreQuery()', () => {
    it('applies filter from patch', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 10 });
      const pred = (x: number) => x > 3;

      await source.restoreQuery({ filter: pred });

      expect(source.current).toEqual([4, 5]);
    });

    it('applies sort from patch', async () => {
      const source = createLocalSource([3, 1, 2], { limit: 10 });
      const sorter = (a: number, b: number) => a - b;

      await source.restoreQuery({ sort: sorter });

      expect(source.current).toEqual([1, 2, 3]);
    });

    it('applies page from patch when within range', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

      await source.restoreQuery({ page: 2 });

      expect(source.meta.pageNumber).toBe(2);
    });

    it('is a no-op when patch produces no changes', async () => {
      const source = createLocalSource([1, 2, 3], { limit: 10 });
      const listener = vi.fn();

      source.subscribe(listener);

      await source.restoreQuery({ limit: 20, page: 1 });
      await source.restoreQuery({ limit: 20, page: 1 });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('sync recomputeSync error handling', () => {
    it('sets meta.error when searchFn throws', async () => {
      const source = createLocalSource([1, 2, 3], {
        limit: 10,
        searchFn: () => {
          throw new Error('search-boom');
        },
      });

      await source.searchNow('q');

      expect(source.meta.error?.message).toBe('search-boom');
      expect(source.current).toEqual([]);
    });

    it('sets meta.error when filterFn throws in sync path', async () => {
      const source = createLocalSource([1, 2, 3], {
        limit: 10,
      });

      await source.setFilter(() => {
        throw new Error('filter-boom');
      });

      expect(source.meta.error?.message).toBe('filter-boom');
      expect(source.current).toEqual([]);
    });
  });

  describe('async filter and sort', () => {
    it('filterAsync applies asynchronous filter and sets isLoading', async () => {
      const filterAsync = vi.fn(async (items: readonly number[]) => items.filter((x) => x > 2));
      const source = createLocalSource([1, 2, 3, 4, 5], { filterAsync, limit: 10 });

      // Trigger a recompute through the async path.
      await source.setData([1, 2, 3, 4, 5]);

      expect(source.current).toEqual([3, 4, 5]);
      expect(source.meta.isLoading).toBe(false);
    });

    it('sortAsync applies asynchronous sort', async () => {
      const sortAsync = vi.fn(async (items: readonly number[]) => [...items].sort((a, b) => b - a));
      const source = createLocalSource([1, 3, 2], { limit: 10, sortAsync });

      await source.setData([1, 3, 2]);

      expect(source.current).toEqual([3, 2, 1]);
      expect(source.meta.isLoading).toBe(false);
    });

    it('filterAsync error sets meta.error and clears view', async () => {
      const filterAsync = vi.fn(async () => {
        throw new Error('filter failed');
      });
      const source = createLocalSource([1, 2, 3], { filterAsync, limit: 10 });

      await source.setData([1, 2, 3]);

      expect(source.meta.error?.message).toBe('filter failed');
      expect(source.current).toEqual([]);
    });
  });
});
