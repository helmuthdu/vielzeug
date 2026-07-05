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

    it('next, prev, and goToLast work when destructured off the source', async () => {
      const source = createLocalSource([1, 2, 3, 4], { limit: 2 });
      const { goToLast, next, prev } = source;

      await next();
      expect(source.meta.pageNumber).toBe(2);

      await prev();
      expect(source.meta.pageNumber).toBe(1);

      await goToLast();
      expect(source.meta.pageNumber).toBe(2);
    });

    it('patch({ limit }) changes page size and resets to page 1', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

      await source.goTo(2);
      await source.patch({ limit: 3 });

      expect(source.meta.pageNumber).toBe(1);
      expect(source.meta.totalItems).toBe(5);
    });

    it('patch() cancels a pending search debounce so it does not fire a stray recompute afterwards', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 10 });
      const listener = vi.fn();

      void source.search('2');
      source.subscribe(listener);

      await source.patch({ limit: 3 });
      listener.mockClear();

      vi.advanceTimersByTime(300);

      expect(listener).not.toHaveBeenCalled();
    });

    it('patch({ search }) with the same text as a pending debounce still flushes it', async () => {
      const source = createLocalSource(['apple', 'banana', 'cherry']);

      void source.search('ban');
      await source.patch({ search: 'ban' });

      expect(source.meta.isSearchPending).toBe(false);
      expect(source.current).toEqual(['banana']);
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

    it('patch({ filter }) replaces the active filter', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 10 });

      await source.patch({ filter: (x) => x % 2 === 0 });

      expect(source.current).toEqual([2, 4]);
    });

    it('patch({ filter: undefined }) clears the filter', async () => {
      const source = createLocalSource([1, 2, 3], {
        filter: (x) => x > 1,
        limit: 10,
      });

      await source.patch({ filter: undefined });

      expect(source.current).toEqual([1, 2, 3]);
    });

    it('patch({ sort }) replaces the active sort', async () => {
      const source = createLocalSource([3, 1, 2], { limit: 10 });

      await source.patch({ sort: (a, b) => a - b });

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

      expect(source.query).toEqual({ limit: 2, page: 1 });
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

    it('immediate:true still flushes a pending debounce for the same text', async () => {
      const source = createLocalSource(['apple', 'banana', 'cherry']);

      void source.search('ban');
      expect(source.meta.isSearchPending).toBe(true);

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
    it('roundtrips through encodeQuery + decodeQuery + patch()', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5, 6], { limit: 2 });

      await source.search('2', { immediate: true });

      const serialized = encodeQuery(source.query);
      const restored = createLocalSource([1, 2, 3, 4, 5, 6], { limit: 10 });
      const q = decodeQuery(serialized, { defaultLimit: 2 });

      await restored.patch(q);

      expect(restored.query).toEqual({ limit: 2, page: 1, search: '2' });
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

    it('query omits search key when no search is active', () => {
      const source = createLocalSource([1, 2, 3], { limit: 10 });

      expect(source.query).toEqual({ limit: 10, page: 1 });
      expect('search' in source.query).toBe(false);
    });

    it('query includes search when active', async () => {
      const source = createLocalSource([1, 2, 3], { limit: 10 });

      await source.search('hello', { immediate: true });

      expect(source.query).toEqual({ limit: 10, page: 1, search: 'hello' });
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
      expect(source.query.search).toBeUndefined();
      expect(source.current).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('async pipeline (filterAsync / sortAsync)', () => {
    it('runs the async pipeline on construction, without waiting for a mutating call', async () => {
      const sortAsync = vi.fn(async (items: readonly number[]) => [...items].sort((a, b) => a - b));
      const source = createLocalSource([5, 3, 1, 4, 2], { limit: 10, sortAsync });

      expect(source.meta.isLoading).toBe(true);

      await source.ready();

      expect(sortAsync).toHaveBeenCalledTimes(1);
      expect(source.current).toEqual([1, 2, 3, 4, 5]);
      expect(source.meta.isLoading).toBe(false);
    });

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

    it('surfaces a filterAsync rejection as meta.error instead of swallowing it', async () => {
      const filterAsync = vi.fn(async () => {
        throw new Error('worker crashed');
      });
      const source = createLocalSource([1, 2, 3], { filterAsync, limit: 10 });

      await source.ready().catch(() => {});

      expect(source.meta.error?.message).toBe('worker crashed');
      expect(source.meta.isLoading).toBe(false);
    });

    it('clears a previous filterAsync error once a later attempt succeeds', async () => {
      const filterAsync = vi
        .fn<(items: readonly number[]) => Promise<readonly number[]>>()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValue([1, 2, 3]);
      const source = createLocalSource([1, 2, 3], { filterAsync, limit: 10 });

      await source.ready().catch(() => {});
      expect(source.meta.error).not.toBeNull();

      await source.setData([1, 2, 3]);

      expect(source.meta.error).toBeNull();
      expect(source.current).toEqual([1, 2, 3]);
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

    it('applies filter and sort atomically via patch()', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 10 });

      await source.patch({ filter: (x: number) => x > 3, sort: (a: number, b: number) => b - a });

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

    it('[Symbol.dispose] works when destructured off the source', () => {
      const source = createLocalSource([1, 2, 3]);
      const dispose = source[Symbol.dispose];

      dispose();

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

describe('createLocalSource — patch() with filter and sort', () => {
  it('patch({ filter }) applies filter and resets to page 1', async () => {
    const source = createLocalSource([1, 2, 3, 4, 5], { limit: 10 });

    await source.goTo(1);
    await source.patch({ filter: (n) => n % 2 === 0 });

    expect(source.current).toEqual([2, 4]);
    expect(source.meta.pageNumber).toBe(1);
  });

  it('patch({ sort }) applies sort in one recompute', async () => {
    const source = createLocalSource([3, 1, 2], { limit: 10 });

    await source.patch({ sort: (a, b) => a - b });

    expect(source.current).toEqual([1, 2, 3]);
  });

  it('patch({ filter, sort, search }) applies all three atomically', async () => {
    const source = createLocalSource(['apple', 'apricot', 'banana', 'avocado'], { limit: 10 });
    const listener = vi.fn();

    source.subscribe(listener);
    await source.patch({
      filter: (s) => s.startsWith('a'),
      sort: (a, b) => a.localeCompare(b),
    });

    expect(source.current).toEqual(['apple', 'apricot', 'avocado']);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('patch({ filter: undefined }) clears the filter', async () => {
    const source = createLocalSource([1, 2, 3, 4, 5], {
      filter: (n) => n > 3,
      limit: 10,
    });

    expect(source.current).toEqual([4, 5]);

    await source.patch({ filter: undefined });

    expect(source.current).toEqual([1, 2, 3, 4, 5]);
  });

  it('patch({ sort: undefined }) clears the sort', async () => {
    const source = createLocalSource([3, 1, 2], {
      limit: 10,
      sort: (a, b) => a - b,
    });

    expect(source.current).toEqual([1, 2, 3]);

    await source.patch({ sort: undefined });

    expect(source.current).toEqual([3, 1, 2]);
  });

  it('patch({ filter }) always triggers recompute (even same reference)', async () => {
    const f = (n: number) => n > 0;
    const source = createLocalSource([1, 2, 3], { filter: f, limit: 10 });
    const listener = vi.fn();

    source.subscribe(listener);
    await source.patch({ filter: f });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
