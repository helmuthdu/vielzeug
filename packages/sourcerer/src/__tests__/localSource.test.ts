import { decodeQuery, encodeQuery } from '../codecs';
import { createLocalSource } from '../localSource';

describe('createLocalSource', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('pagination behavior', () => {
    it('navigates with goTo, next, prev and boundary helpers', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

      expect(source.current).toEqual([1, 2]);

      await source.goTo(3);
      expect(source.current).toEqual([5]);

      await source.next();
      expect(source.current).toEqual([5]); // already at last page

      await source.prev();
      expect(source.current).toEqual([3, 4]);

      await source.goTo(1);
      expect(source.current).toEqual([1, 2]);

      await source.goToLast();
      expect(source.current).toEqual([5]);
    });

    it('clamps invalid page values in goTo', async () => {
      const source = createLocalSource([1, 2, 3, 4], { limit: 2 });

      await source.goTo(-99);
      expect(source.meta.pageNumber).toBe(1);

      await source.goTo(999);
      expect(source.meta.pageNumber).toBe(2);
    });
  });

  describe('update — atomic bulk mutations', () => {
    it('applies multiple fields atomically in a single update call', async () => {
      // Data: [1,2,3,4,5,6], filter evens → [2,4,6], sort asc → [2,4,6], limit 1, page 2 → [4]
      const source = createLocalSource([1, 2, 3, 4, 5, 6], {
        filter: (item: number) => item % 2 === 0,
        limit: 3,
        sort: (a: number, b: number) => a - b,
      });

      // Evens sorted asc: [2,4,6], limit 3, page 1 → [2,4,6]
      expect(source.current).toEqual([2, 4, 6]);

      // Reduce limit to 1, go to page 2 → [4]
      await source.update({ limit: 1, page: 2 });

      expect(source.current).toEqual([4]);
      expect(source.meta.pageNumber).toBe(2);
    });

    it('update resets page when limit changes', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5, 6], { limit: 2 });

      await source.goTo(3);
      await source.update({ limit: 6 });

      expect(source.meta.pageNumber).toBe(1);
      expect(source.current).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('update is a no-op when nothing changes', async () => {
      const source = createLocalSource([1, 2, 3], { limit: 10 });
      const listener = vi.fn();

      source.subscribe(listener);

      await source.update({ limit: 10, page: 1, search: '' });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('state updates', () => {
    it('setData replaces raw data and resets to first page', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5, 6], { limit: 3 });

      await source.goTo(2);
      await source.setData([6, 5, 4, 3, 2, 1]);

      expect(source.meta.pageNumber).toBe(1);
      expect(source.current).toEqual([6, 5, 4]);
    });

    it('resets to initial config state', async () => {
      const source = createLocalSource([1, 2, 3, 4], { filter: (x) => x > 1, limit: 2, sort: (a, b) => b - a });

      await source.searchNow('3');
      await source.goTo(2);
      await source.reset();

      expect(source.toQuery()).toEqual({ limit: 2, page: 1, search: '' });
      expect(source.current).toEqual([4, 3]);
    });
  });

  describe('search behavior', () => {
    it('debounces search and applies on commit', async () => {
      const source = createLocalSource(['apple', 'banana', 'cherry']);

      source.search('ban');
      expect(source.meta.isSearchPending).toBe(true);
      expect(source.current).toEqual(['apple', 'banana', 'cherry']);

      await source.commit();

      expect(source.meta.isSearchPending).toBe(false);
      expect(source.current).toEqual(['banana']);
    });

    it('uses only the latest debounced query', async () => {
      // Use a custom exact-match searchFn to avoid fuzzy false positives.
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

  describe('serialization and hydration', () => {
    it('roundtrips through encodeQuery + restore', async () => {
      const source = createLocalSource([1, 2, 3, 4, 5, 6], { limit: 2 });

      await source.searchNow('2');

      const serialized = encodeQuery(source.toQuery());
      const restored = createLocalSource([1, 2, 3, 4, 5, 6], { limit: 10 });

      await restored.restore(decodeQuery(serialized, { defaultLimit: 10 }));

      expect(restored.toQuery()).toEqual({ limit: 2, page: 1, search: '2' });
    });

    it('restore is a no-op when nothing changes', async () => {
      const source = createLocalSource([1, 2, 3, 4], { limit: 2 });
      const listener = vi.fn();

      source.subscribe(listener);
      await source.restore({ limit: 2, page: 1, search: '' });

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
    });

    it('itemStart and itemEnd are correct on first page', () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 3 });

      expect(source.meta.itemStart).toBe(1);
      expect(source.meta.itemEnd).toBe(3);
      expect(source.meta.totalItems).toBe(5);
      expect(source.meta.pageCount).toBe(2);
    });

    it('itemStart and itemEnd are zero for empty results', async () => {
      const source = createLocalSource([], { limit: 10 });

      expect(source.meta.itemStart).toBe(0);
      expect(source.meta.itemEnd).toBe(0);
    });
  });
});
