import { applyCursorQuery } from '../applyQuery';
import { createCursorSource } from '../cursorSource';

describe('createCursorSource', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const makeFetch = (pages: readonly (readonly string[])[], total = 0) => {
    const nextCursors: string[] = [];
    const prevCursors: string[] = [];

    pages.forEach((_, i) => {
      if (i < pages.length - 1) nextCursors[i] = `cursor-next-${i}`;

      if (i > 0) prevCursors[i] = `cursor-prev-${i}`;
    });

    return vi.fn(
      async ({ after }: { after?: string; before?: string; limit: number; search?: string }, _signal: AbortSignal) => {
        const pageIdx = after ? parseInt(after.split('-')[2]) + 1 : 0;
        const safeIdx = Math.min(Math.max(0, pageIdx), pages.length - 1);

        return {
          items: [...pages[safeIdx]],
          nextCursor: nextCursors[safeIdx],
          prevCursor: prevCursors[safeIdx],
          total: total || pages.flat().length,
        };
      },
    );
  };

  describe('autoFetch', () => {
    it('fetches automatically by default', async () => {
      const fetch = makeFetch([
        ['a', 'b'],
        ['c', 'd'],
      ]);
      const source = createCursorSource({ fetch });

      await source.ready();

      expect(source.current).toEqual(['a', 'b']);
      expect(source.meta.hasNextPage).toBe(true);
      expect(source.meta.hasPrevPage).toBe(false);
    });

    it('does not auto-fetch when autoFetch is false', async () => {
      const fetch = makeFetch([['a']]);
      const source = createCursorSource({ autoFetch: false, fetch });

      await Promise.resolve();

      expect(fetch).not.toHaveBeenCalled();
      expect(source.current).toEqual([]);
    });
  });

  describe('navigation', () => {
    it('advances to next page', async () => {
      const fetch = makeFetch([
        ['a', 'b'],
        ['c', 'd'],
      ]);
      const source = createCursorSource({ autoFetch: false, fetch });

      await source.refresh();
      await source.next();

      expect(source.current).toEqual(['c', 'd']);
      expect(source.meta.hasPrevPage).toBe(true);
    });

    it('next is a no-op when no next cursor', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], nextCursor: undefined, total: 1 }));
      const source = createCursorSource({ autoFetch: false, fetch });

      await source.refresh();

      const callsBefore = fetch.mock.calls.length;

      await source.next();

      expect(fetch.mock.calls.length).toBe(callsBefore);
    });

    it('prev is a no-op when no prev cursor', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createCursorSource({ autoFetch: false, fetch });

      await source.refresh();

      const callsBefore = fetch.mock.calls.length;

      await source.prev();

      expect(fetch.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('reset', () => {
    it('clears cursors and refetches from the start', async () => {
      const fetch = makeFetch([
        ['a', 'b'],
        ['c', 'd'],
      ]);
      const source = createCursorSource({ autoFetch: false, fetch });

      await source.refresh();
      await source.next();
      expect(source.current).toEqual(['c', 'd']);

      await source.reset();
      expect(source.current).toEqual(['a', 'b']);
      expect(source.meta.hasPrevPage).toBe(false);
    });
  });

  describe('search', () => {
    it('debounces search and resets cursors', async () => {
      const fetch = vi.fn(async ({ search }: { search?: string }) => ({
        items: search ? [`found-${search}`] : ['all'],
        total: 1,
      }));
      const source = createCursorSource({ autoFetch: false, debounceMs: 300, fetch });

      await source.refresh();

      source.search('query');
      expect(source.meta.isSearchPending).toBe(true);

      vi.advanceTimersByTime(300);
      await source.ready();

      expect(source.current).toEqual(['found-query']);
      expect(source.meta.isSearchPending).toBe(false);
    });

    it('search with immediate:true applies immediately', async () => {
      const fetch = vi.fn(async ({ search }: { search?: string }) => ({
        items: [search ?? 'default'],
        total: 1,
      }));
      const source = createCursorSource({ autoFetch: false, fetch });

      await source.search('quick', { immediate: true });

      expect(source.current).toEqual(['quick']);
    });
  });

  describe('meta', () => {
    it('reflects correct error message on failure', async () => {
      const source = createCursorSource({
        autoFetch: false,
        fetch: vi.fn(async () => {
          throw new Error('cursor-fail');
        }),
      });

      await source.refresh();

      expect(source.meta.error?.message).toBe('cursor-fail');
      expect(source.current).toEqual([]);
    });
  });

  describe('search debounce', () => {
    it('resolves promise when debounced search is applied', async () => {
      const fetch = vi.fn(async ({ search }: { cursor?: string; search?: string }) => ({
        cursor: null,
        items: search ? [search] : ['init'],
      }));
      const source = createCursorSource({ autoFetch: false, debounceMs: 300, fetch });

      await source.refresh();

      const searchDone = source.search('fast');

      expect(source.meta.isSearchPending).toBe(true);

      await vi.runAllTimersAsync();
      await searchDone;

      expect(source.meta.isSearchPending).toBe(false);
      expect(source.current).toEqual(['fast']);
    });
  });

  describe('setLimit()', () => {
    it('changes page size and re-fetches, resetting cursors', async () => {
      const fetch = vi.fn(async () => ({ items: ['a', 'b'], nextCursor: 'n1', total: 10 }));
      const source = createCursorSource({ autoFetch: false, fetch, limit: 5 });

      await source.refresh();
      expect(fetch).toHaveBeenCalledTimes(1);

      await source.setLimit(10);

      expect(source.toQuery().limit).toBe(10);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('is a no-op when limit does not change', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createCursorSource({ autoFetch: false, fetch, limit: 10 });

      await source.refresh();

      const callsBefore = fetch.mock.calls.length;

      await source.setLimit(10);

      expect(fetch.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('setLimit / search via applyCursorQuery', () => {
    it('setLimit fetches with new limit', async () => {
      const fetch = vi.fn(async () => ({ items: ['a', 'b', 'c'], nextCursor: 'n1', total: 6 }));
      const source = createCursorSource({ autoFetch: false, fetch, limit: 2 });

      await source.setLimit(3);

      expect(source.toQuery().limit).toBe(3);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('search immediate resets cursors and fetches', async () => {
      const fetch = vi.fn(async ({ search }: { search?: string }) => ({
        items: search ? [`found-${search}`] : ['all'],
        nextCursor: undefined,
        total: 1,
      }));
      const source = createCursorSource({ autoFetch: false, fetch, limit: 10 });

      await source.search('hello', { immediate: true });

      expect(source.toQuery().search).toBe('hello');
      expect(source.current).toEqual(['found-hello']);
    });

    it('setLimit is a no-op when limit does not change', async () => {
      const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
      const source = createCursorSource({ autoFetch: false, fetch, limit: 10 });

      await source.setLimit(10);

      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('retry', () => {
    it('retries on failure and resolves on success', async () => {
      const fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce({ cursor: null, items: ['retried'] });
      const source = createCursorSource({
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
  });

  describe('prev()', () => {
    it('navigates to previous page using prevCursor', async () => {
      const fetch = vi.fn(makeFetch([['page1'], ['page2']], 2));
      const source = createCursorSource({ autoFetch: false, fetch, limit: 1 });

      await source.refresh();
      expect(source.current).toEqual(['page1']);

      await source.next();
      expect(source.current).toEqual(['page2']);
      expect(source.meta.hasPrevPage).toBe(true);

      await source.prev();
      expect(source.current).toEqual(['page1']);
    });
  });

  describe('refreshInterval', () => {
    it('fires doUpdate() when interval elapses and source is not disposed', async () => {
      const fetch = vi.fn(async () => ({ items: ['x'], total: 1 }));
      const source = createCursorSource({ autoFetch: false, fetch, refreshInterval: 500 });

      await source.refresh();
      expect(fetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(501);

      expect(fetch.mock.calls.length).toBeGreaterThan(1);

      source.dispose();
    });
  });

  describe('dispose', () => {
    it('ready() rejects immediately with SourceDisposedError when already disposed', async () => {
      const { SourceDisposedError } = await import('../types');
      const fetch = vi.fn(async () => ({ items: [], total: 0 }));
      const source = createCursorSource({ autoFetch: false, fetch });

      source.dispose();

      await expect(source.ready()).rejects.toBeInstanceOf(SourceDisposedError);
    });

    it('double-dispose is idempotent (no throw)', () => {
      const fetch = vi.fn(async () => ({ items: [], total: 0 }));
      const source = createCursorSource({ autoFetch: false, fetch });

      source.dispose();

      expect(() => source.dispose()).not.toThrow();
    });

    it('disposed getter reflects lifecycle state', () => {
      const fetch = vi.fn(async () => ({ items: [], total: 0 }));
      const source = createCursorSource({ autoFetch: false, fetch });

      expect(source.disposed).toBe(false);

      source.dispose();

      expect(source.disposed).toBe(true);
    });

    it('disposalSignal aborts on dispose()', () => {
      const fetch = vi.fn(async () => ({ items: [], total: 0 }));
      const source = createCursorSource({ autoFetch: false, fetch });

      expect(source.disposalSignal.aborted).toBe(false);

      source.dispose();

      expect(source.disposalSignal.aborted).toBe(true);
    });

    it('stops notifying listeners after dispose', async () => {
      const fetch = vi.fn(async () => ({ cursor: null, items: ['x'] }));
      const source = createCursorSource({ autoFetch: false, fetch });
      const listener = vi.fn();

      source.subscribe(listener);
      source.dispose();

      await source.refresh();

      expect(listener).not.toHaveBeenCalled();
    });

    it('clears refreshInterval timer on dispose', async () => {
      const fetch = vi.fn(async () => ({ items: ['x'], total: 1 }));
      const source = createCursorSource({ autoFetch: false, fetch, refreshInterval: 500 });

      await source.refresh();

      source.dispose();

      const callsBefore = fetch.mock.calls.length;

      await vi.advanceTimersByTimeAsync(2000);

      expect(fetch.mock.calls.length).toBe(callsBefore);
    });
  });
});

describe('applyCursorQuery', () => {
  it('applies limit to cursor source', async () => {
    const fetch = vi.fn(async () => ({ items: ['a', 'b', 'c'], nextCursor: 'n1', total: 3 }));
    const source = createCursorSource({ autoFetch: false, fetch, limit: 5 });

    await applyCursorQuery(source, { limit: 3 });

    expect(source.toQuery().limit).toBe(3);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('applies search to cursor source', async () => {
    const fetch = vi.fn(async ({ search }: { search?: string }) => ({
      items: search ? [`found-${search}`] : ['all'],
      nextCursor: undefined,
      total: 1,
    }));
    const source = createCursorSource({ autoFetch: false, fetch, limit: 10 });

    await applyCursorQuery(source, { search: 'hello' });

    expect(source.toQuery().search).toBe('hello');
    expect(source.current).toEqual(['found-hello']);
  });

  it('no-op when patch is empty', async () => {
    const fetch = vi.fn(async () => ({ items: ['a'], total: 1 }));
    const source = createCursorSource({ autoFetch: false, fetch, limit: 10 });

    await applyCursorQuery(source, {});

    expect(fetch).not.toHaveBeenCalled();
  });
});
