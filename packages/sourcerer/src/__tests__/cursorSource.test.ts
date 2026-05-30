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

    it('searchNow applies immediately', async () => {
      const fetch = vi.fn(async ({ search }: { search?: string }) => ({
        items: [search ?? 'default'],
        total: 1,
      }));
      const source = createCursorSource({ autoFetch: false, fetch });

      await source.searchNow('quick');

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

      expect(source.meta.errorMessage).toBe('cursor-fail');
      expect(source.current).toEqual([]);
    });
  });

  describe('flush', () => {
    it('immediately applies pending debounced search', async () => {
      const fetch = vi.fn(async ({ search }: { cursor?: string; search?: string }) => ({
        cursor: null,
        items: search ? [search] : ['init'],
      }));
      const source = createCursorSource({ autoFetch: false, debounceMs: 300, fetch });

      await source.refresh();

      source.search('fast');
      expect(source.meta.isSearchPending).toBe(true);

      await source.flush();

      expect(source.meta.isSearchPending).toBe(false);
      expect(source.current).toEqual(['fast']);
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
      expect(source.meta.errorMessage).toBeNull();
    });
  });

  describe('dispose', () => {
    it('stops notifying listeners after dispose', async () => {
      const fetch = vi.fn(async () => ({ cursor: null, items: ['x'] }));
      const source = createCursorSource({ autoFetch: false, fetch });
      const listener = vi.fn();

      source.subscribe(listener);
      source.dispose();

      await source.refresh();

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
