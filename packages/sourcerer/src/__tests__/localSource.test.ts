import { encodeLocalQueryParams } from '../codecs';
import { createLocalSource } from '../localSource';

describe('createLocalSource', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('pagination behavior', () => {
    it('navigates with goTo, next, prev and boundary helpers', () => {
      const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

      expect(source.current).toEqual([1, 2]);

      source.goTo(3);
      expect(source.current).toEqual([5]);

      source.next();
      expect(source.current).toEqual([5]);

      source.prev();
      expect(source.current).toEqual([3, 4]);

      source.goTo(1);
      expect(source.current).toEqual([1, 2]);

      source.goToLast();
      expect(source.current).toEqual([5]);
    });

    it('clamps invalid page values in goTo', () => {
      const source = createLocalSource([1, 2, 3, 4], { limit: 2 });

      source.goTo(-99);
      expect(source.meta.pageNumber).toBe(1);

      source.goTo(999);
      expect(source.meta.pageNumber).toBe(2);
    });
  });

  describe('state updates', () => {
    it('applies update mutations atomically', () => {
      const source = createLocalSource([1, 2, 3, 4, 5, 6], { limit: 3 });

      source.batch((ctx) => {
        ctx.setData([6, 5, 4, 3, 2, 1]);
        ctx.setFilter((item) => item % 2 === 0);
        ctx.setSort((a, b) => a - b);
        ctx.setLimit(1);
        ctx.goTo(2);
      });

      expect(source.current).toEqual([4]);
      expect(source.meta.pageNumber).toBe(2);
      expect(source.meta.totalItems).toBe(3);
    });

    it('resets to initial config state', () => {
      const source = createLocalSource([1, 2, 3, 4], { filter: (x) => x > 1, limit: 2, sort: (a, b) => b - a });

      source.searchNow('3');
      source.goTo(2);
      source.reset();

      expect(source.toQuery()).toEqual({
        limit: 2,
        page: 1,
        search: '',
      });
      expect(source.current).toEqual([4, 3]);
    });
  });

  describe('search behavior', () => {
    it('debounces search and applies on flush', () => {
      const source = createLocalSource(['apple', 'banana', 'cherry']);

      source.search('ban');
      expect(source.meta.isSearchPending).toBe(true);
      expect(source.current).toEqual(['apple', 'banana', 'cherry']);

      source.commit();

      expect(source.meta.isSearchPending).toBe(false);
      expect(source.current).toEqual(['banana']);
    });

    it('uses only the latest debounced query', () => {
      const source = createLocalSource(['alpha', 'beta', 'gamma']);

      source.search('al');
      source.search('ga');

      vi.advanceTimersByTime(300);

      expect(source.current).toEqual(['gamma']);
      expect(source.meta.isSearchPending).toBe(false);
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

    it('replaces current and meta references after a state change', () => {
      const source = createLocalSource([1, 2, 3, 4], { limit: 2 });

      const currentBefore = source.current;
      const metaBefore = source.meta;

      source.goTo(2);

      const currentAfter = source.current;
      const metaAfter = source.meta;

      expect(currentAfter).not.toBe(currentBefore);
      expect(metaAfter).not.toBe(metaBefore);
      expect(currentAfter).toEqual([3, 4]);
      expect(metaAfter.pageNumber).toBe(2);
    });
  });

  describe('serialization and hydration', () => {
    it('roundtrips through query params', () => {
      const source = createLocalSource([1, 2, 3, 4, 5, 6], { limit: 2 });

      source.searchNow('2');

      const serialized = encodeLocalQueryParams(source.toQuery());

      const restored = createLocalSource([1, 2, 3, 4, 5, 6], { limit: 10 });

      restored.fromQueryParams(serialized);

      expect(restored.toQuery()).toEqual({
        limit: 2,
        page: 1,
        search: '2',
      });
    });

    it('ignores no-op hydrate updates', () => {
      const source = createLocalSource([1, 2, 3, 4], { limit: 2 });
      const listener = vi.fn();

      source.subscribe(listener);
      source.restore({ limit: 2, page: 1, search: '' });

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
