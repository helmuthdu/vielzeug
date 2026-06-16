import { applyLocalQuery } from '../applyQuery';
import { decodeQuery, encodeQuery } from '../codecs';
import { createLocalSource } from '../localSource';
import { itemRange } from '../pagination';
import { SourceDisposedError, SourceTimeoutError } from '../types';

describe('createLocalSource', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('pagination', () => {
    it('paginates data correctly', () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

      expect(source.current).toEqual([1, 2]);
      expect(source.meta.pageCount).toBe(3);
      expect(source.meta.totalItems).toBe(5);
    });

    it('goTo navigates to specified page', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

      await source.goTo(2);

      expect(source.current).toEqual([3, 4]);
      expect(source.meta.pageNumber).toBe(2);
    });

    it('goToLast navigates to the last page', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

      await source.goToLast();

      expect(source.meta.pageNumber).toBe(3);
      expect(source.current).toEqual([5]);
    });

    it('next and prev navigate between pages', async () => {
      const source = createLocalSource([1, 2, 3, 4], { limit: 2 });

      await source.next();
      expect(source.meta.pageNumber).toBe(2);

      await source.prev();
      expect(source.meta.pageNumber).toBe(1);
    });

    it('goTo is a no-op at same page', async () => {
      const source = createLocalSource([1, 2, 3], { limit: 2 });
      const listener = vi.fn();

      source.subscribe(listener);
      await source.goTo(1);

      expect(listener).not.toHaveBeenCalled();
    });

    it('setLimit changes page size and resets to page 1', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

      await source.goTo(2);
      await source.setLimit(3);

      expect(source.meta.pageNumber).toBe(1);
      expect(source.meta.totalItems).toBe(5);
    });
  });

  describe('setData', () => {
    it('replaces the data set', async () => {
      const source = createLocalSource([1, 2, 3], { limit: 10 });

      await source.setData([10, 20, 30, 40]);

      expect(source.current).toEqual([10, 20, 30, 40]);
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
      const source = createLocalSource([1, 2, 3, 4], {
        filter: (x) => x > 1,
        limit: 2,
        sort: (a, b) => b - a,
      });

      await source.search('3', { immediate: true });
      await source.goTo(2);
      await source.reset();

      expect(source.toQuery()).toEqual({ limit: 2, page: 1 });
      expect(source.current).toEqual([4, 3]);
    });
  });

  describe('search behavior (sync)', () => {
    it('debounces search and resolves promise when applied', async () => {
      const source = createLocalSource(['apple', 'banana', 'cherry']);

      const searchDone = source.search('ban');

      expect(source.meta.isSearchPending).toBe(true);
      expect(source.current).toEqual(['apple', 'banana', 'cherry']);

      vi.advanceTimersByTime(300);
      await searchDone;

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

    it('search with immediate:true applies without debounce', async () => {
      const source = createLocalSource(['apple', 'banana', 'cherry']);

      await source.search('ban', { immediate: true });

      expect(source.meta.isSearchPending).toBe(false);
      expect(source.current).toEqual(['banana']);
    });
  });

  describe('stable references (sync)', () => {
    it('returns equal current and meta values between reads', () => {
      const source = createLocalSource([1, 2, 3, 4], { limit: 2 });

      expect(source.current).toEqual(source.current);
      expect(source.meta).toStrictEqual(source.meta);
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

  describe('serialization (codec round-trip)', () => {
    it('roundtrips through encodeQuery + applyLocalQuery', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5, 6], { limit: 2 });

      await source.search('2', { immediate: true });

      const serialized = encodeQuery(source.toQuery());
      const restored = createLocalSource([1, 2, 3, 4, 5, 6], { limit: 10 });
      const q = decodeQuery(serialized, { defaultLimit: 10 });

      if (q.limit !== undefined) await restored.setLimit(q.limit);

      if (q.search !== undefined) await restored.search(q.search, { immediate: true });

      expect(restored.toQuery()).toEqual({ limit: 2, page: 1, search: '2' });
    });
  });

  describe('meta fields', () => {
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

      await source.search('hello', { immediate: true });

      expect(source.toQuery()).toEqual({ limit: 10, page: 1, search: 'hello' });
    });
  });

  describe('ready() — sync path', () => {
    it('resolves immediately — sync source is always idle', async () => {
      const source = createLocalSource([1, 2, 3]);

      await expect(source.ready()).resolves.toBeUndefined();
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

  describe('async pipeline (filterAsync / sortAsync)', () => {
    it('filterAsync applies asynchronous filter and sets isLoading', async () => {
      const filterAsync = vi.fn(async (items: readonly number[]) => items.filter((x) => x > 2));
      const source = createLocalSource([1, 2, 3, 4, 5], { filterAsync, limit: 10 });

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

    it('resolves ready() after async filterAsync completes', async () => {
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

    it('rejects ready() with SourceTimeoutError on timeout', async () => {
      const source = createLocalSource([1, 2, 3], {
        filterAsync: () => new Promise(() => {}),
      });

      void source.setData([1, 2, 3]);

      const p = source.ready(100).catch((e: unknown) => e);

      await vi.advanceTimersByTimeAsync(101);

      const result = await p;

      expect(result).toBeInstanceOf(SourceTimeoutError);

      source.dispose();
    });

    it('applies filter and sort from applyLocalQuery equivalent', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 10 });

      await source.setFilter((x: number) => x > 3);
      await source.setSort((a: number, b: number) => b - a);

      expect(source.current).toEqual([5, 4]);
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

    it('double-dispose is idempotent', () => {
      const source = createLocalSource([1, 2, 3]);

      source.dispose();

      expect(() => source.dispose()).not.toThrow();
    });

    it('disposed getter reflects lifecycle state', () => {
      const source = createLocalSource([1, 2, 3]);

      expect(source.disposed).toBe(false);

      source.dispose();

      expect(source.disposed).toBe(true);
    });

    it('disposalSignal aborts on dispose()', () => {
      const source = createLocalSource([1, 2, 3]);

      expect(source.disposalSignal.aborted).toBe(false);

      source.dispose();

      expect(source.disposalSignal.aborted).toBe(true);
    });

    it('[Symbol.dispose] delegates to dispose()', () => {
      const source = createLocalSource([1, 2, 3]);

      source[Symbol.dispose]();

      expect(source.disposed).toBe(true);
    });

    it('ready() rejects immediately with SourceDisposedError when already disposed', async () => {
      const source = createLocalSource([1, 2, 3], {
        filterAsync: async (items) => items,
      });

      source.dispose();

      await expect(source.ready()).rejects.toBeInstanceOf(SourceDisposedError);
    });

    it('rejects ready() when source is disposed while waiting', async () => {
      let resolveFilter!: (v: readonly number[]) => void;
      const source = createLocalSource([1, 2, 3], {
        filterAsync: () =>
          new Promise<readonly number[]>((r) => {
            resolveFilter = r;
          }),
      });

      void source.setData([1, 2, 3]);

      const readyP = source.ready();

      source.dispose();
      resolveFilter([]);

      await expect(readyP).rejects.toBeInstanceOf(SourceDisposedError);
    });

    it('dispose() aborts a pending async filter and does not notify after disposal', async () => {
      let resolveFilter!: (items: readonly number[]) => void;
      const filterAsync = vi.fn(
        (_items: readonly number[], _signal: AbortSignal) =>
          new Promise<readonly number[]>((resolve) => {
            resolveFilter = resolve;
          }),
      );
      const source = createLocalSource([1, 2, 3], { filterAsync, limit: 10 });
      const listener = vi.fn();

      source.subscribe(listener);

      void source.setData([1, 2, 3]);

      listener.mockClear();

      source.dispose();

      resolveFilter([1]);

      await Promise.resolve();

      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe('applyLocalQuery', () => {
  it('applies limit, search, and page in order — page reflects new limit context', async () => {
    const source = createLocalSource(
      Array.from({ length: 30 }, (_, i) => i + 1),
      { limit: 10 },
    );

    await applyLocalQuery(source, { limit: 5, page: 3, search: '' });

    const q = source.toQuery();

    expect(q.limit).toBe(5);
    expect(q.page).toBe(3);
  });

  it('no-op when patch is empty and force is not set', async () => {
    const source = createLocalSource([1, 2, 3], { limit: 10 });
    const listener = vi.fn();

    source.subscribe(listener);

    await applyLocalQuery(source, {});

    expect(listener).not.toHaveBeenCalled();
  });

  it('applies only limit when only limit is in patch', async () => {
    const source = createLocalSource([1, 2, 3, 4, 5], { limit: 10 });

    await applyLocalQuery(source, { limit: 2 });

    expect(source.toQuery().limit).toBe(2);
    expect(source.meta.pageCount).toBe(3);
  });
});
