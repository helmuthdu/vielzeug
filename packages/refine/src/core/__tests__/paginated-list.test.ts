import { signal } from '@vielzeug/ripple';
import { describe, expect, it } from 'vitest';

import { createPaginatedList } from '../paginated-list';

describe('createPaginatedList()', () => {
  describe('initial state', () => {
    it('starts on page 0 with the first page of items', () => {
      const paged = createPaginatedList({ getItems: () => ['a', 'b', 'c', 'd', 'e'], pageSize: 2 });

      expect(paged.pageIndex.value).toBe(0);
      expect(paged.pageItems.value).toEqual(['a', 'b']);
      expect(paged.pageCount.value).toBe(3);
    });

    it('defaults pageSize to 10', () => {
      const items = Array.from({ length: 25 }, (_, i) => i);
      const paged = createPaginatedList({ getItems: () => items });

      expect(paged.pageCount.value).toBe(3);
      expect(paged.pageItems.value).toHaveLength(10);
    });

    it('reports hasNext and hasPrev as signals', () => {
      const paged = createPaginatedList({ getItems: () => [1, 2, 3], pageSize: 1 });

      expect(paged.hasNext.value).toBe(true);
      expect(paged.hasPrev.value).toBe(false);
    });

    it('has a single page when items fit in one page', () => {
      const paged = createPaginatedList({ getItems: () => [1, 2], pageSize: 10 });

      expect(paged.pageCount.value).toBe(1);
      expect(paged.hasNext.value).toBe(false);
      expect(paged.hasPrev.value).toBe(false);
    });

    it('handles an empty items array with pageCount of 0', () => {
      const paged = createPaginatedList({ getItems: () => [] });

      expect(paged.pageCount.value).toBe(0);
      expect(paged.pageIndex.value).toBe(-1);
      expect(paged.pageItems.value).toEqual([]);
      expect(paged.hasNext.value).toBe(false);
      expect(paged.hasPrev.value).toBe(false);
    });
  });

  describe('next() / prev()', () => {
    it('next() advances the page', () => {
      const paged = createPaginatedList({ getItems: () => [1, 2, 3, 4], pageSize: 2 });

      paged.next();

      expect(paged.pageIndex.value).toBe(1);
      expect(paged.pageItems.value).toEqual([3, 4]);
      expect(paged.hasPrev.value).toBe(true);
      expect(paged.hasNext.value).toBe(false);
    });

    it('next() is a no-op on the last page', () => {
      const paged = createPaginatedList({ getItems: () => [1, 2], pageSize: 2 });

      paged.next();
      paged.next();

      expect(paged.pageIndex.value).toBe(0);
    });

    it('prev() moves back a page', () => {
      const paged = createPaginatedList({ getItems: () => [1, 2, 3, 4], pageSize: 2 });

      paged.next();
      paged.prev();

      expect(paged.pageIndex.value).toBe(0);
      expect(paged.pageItems.value).toEqual([1, 2]);
    });

    it('prev() is a no-op on the first page', () => {
      const paged = createPaginatedList({ getItems: () => [1, 2, 3], pageSize: 2 });

      paged.prev();

      expect(paged.pageIndex.value).toBe(0);
    });
  });

  describe('goTo()', () => {
    it('navigates to an absolute page index', () => {
      const paged = createPaginatedList({ getItems: () => [1, 2, 3, 4, 5, 6], pageSize: 2 });

      paged.goTo(2);

      expect(paged.pageIndex.value).toBe(2);
      expect(paged.pageItems.value).toEqual([5, 6]);
    });

    it('clamps negative indices to 0', () => {
      const paged = createPaginatedList({ getItems: () => [1, 2, 3], pageSize: 1 });

      paged.goTo(-5);

      expect(paged.pageIndex.value).toBe(0);
    });

    it('clamps out-of-range indices to the last page via safePage', () => {
      const paged = createPaginatedList({ getItems: () => [1, 2, 3], pageSize: 1 });

      paged.goTo(99);

      // pageIndex raw may be 99 but the exposed pageIndex signal is safePage,
      // which clamps to pageCount - 1 = 2.
      expect(paged.pageIndex.value).toBe(2);
    });
  });

  describe('reset()', () => {
    it('returns to page 0', () => {
      const paged = createPaginatedList({ getItems: () => [1, 2, 3, 4, 5], pageSize: 2 });

      paged.goTo(2);
      paged.reset();

      expect(paged.pageIndex.value).toBe(0);
    });
  });

  describe('reactive pageSize', () => {
    it('responds to a signal-based pageSize', () => {
      const size = signal(2);
      const paged = createPaginatedList({ getItems: () => [1, 2, 3, 4, 5, 6], pageSize: size });

      expect(paged.pageCount.value).toBe(3);

      size.value = 3;

      expect(paged.pageCount.value).toBe(2);
    });
  });

  describe('filter-shrink scenario', () => {
    it('clamps pageIndex when pageCount shrinks after navigation', () => {
      const items = signal([1, 2, 3, 4, 5, 6]);
      const paged = createPaginatedList({ getItems: () => items.value, pageSize: 2 });

      paged.goTo(2); // page 2 of 3

      expect(paged.pageIndex.value).toBe(2);
      expect(paged.pageItems.value).toEqual([5, 6]);

      // Filter down to only 3 items → only 2 pages
      items.value = [1, 2, 3];

      // safePage must clamp: was page 2, now last page is 1
      expect(paged.pageIndex.value).toBe(1);
      expect(paged.pageItems.value).toEqual([3]);
      expect(paged.hasNext.value).toBe(false);
    });

    it('hasNext and hasPrev update reactively on filter change', () => {
      const items = signal([1, 2, 3, 4]);
      const paged = createPaginatedList({ getItems: () => items.value, pageSize: 2 });

      paged.next();
      expect(paged.hasPrev.value).toBe(true);
      expect(paged.hasNext.value).toBe(false);

      // Shrink to 1 item
      items.value = [1];

      expect(paged.pageIndex.value).toBe(0);
      expect(paged.hasPrev.value).toBe(false);
      expect(paged.hasNext.value).toBe(false);
    });
  });

  describe('goTo() non-finite guard', () => {
    it('ignores NaN and preserves current page', () => {
      const paged = createPaginatedList({ getItems: () => [1, 2, 3, 4], pageSize: 2 });

      paged.goTo(1);
      expect(paged.pageIndex.value).toBe(1);

      paged.goTo(NaN);
      expect(paged.pageIndex.value).toBe(1);
    });

    it('ignores Infinity and preserves current page', () => {
      const paged = createPaginatedList({ getItems: () => [1, 2, 3, 4], pageSize: 2 });

      paged.goTo(Infinity);

      expect(Number.isFinite(paged.pageIndex.value)).toBe(true);
      expect(paged.pageIndex.value).toBe(0);
    });
  });

  describe('pageIndex is the clamped safePage signal', () => {
    it('pageIndex reflects safePage, not the raw internal write', () => {
      const paged = createPaginatedList({ getItems: () => [1, 2, 3], pageSize: 1 });

      // Navigating past the end with goTo should still present a valid page
      paged.goTo(100);

      expect(paged.pageIndex.value).toBe(2);
      expect(paged.pageItems.value).toEqual([3]);
    });
  });
});
