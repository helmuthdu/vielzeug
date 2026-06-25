import type { SourcererError } from '../types';

import { clampPage, createMeta, itemRange, pageCount } from '../pagination';

describe('pagination helpers', () => {
  it('computes page counts with safe minimums', () => {
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(11, 10)).toBe(2);
    expect(pageCount(11, 0)).toBe(11);
  });

  it('clamps page to valid range', () => {
    expect(clampPage(-10, 3)).toBe(1);
    expect(clampPage(99, 3)).toBe(3);
  });

  it('creates correct meta values for empty result sets', () => {
    const meta = createMeta({
      error: null,
      isLoading: false,
      isSearchPending: false,
      pageNumber: 1,
      pageSize: 10,
      totalItems: 0,
    });

    expect(meta).toEqual({
      error: null,
      isLoading: false,
      isSearchPending: false,
      pageCount: 1,
      pageNumber: 1,
      pageSize: 10,
      totalItems: 0,
    });

    // Removed fields no longer in SourceMeta.
    expect('hasNoItems' in meta).toBe(false);
    expect('isFirstPage' in meta).toBe(false);
    expect('isLastPage' in meta).toBe(false);
    expect('itemStart' in meta).toBe(false);
    expect('itemEnd' in meta).toBe(false);
    expect('errorMessage' in meta).toBe(false);
  });

  it('creates correct meta values for non-empty result sets', () => {
    const meta = createMeta({
      error: null,
      isLoading: true,
      isSearchPending: true,
      pageNumber: 2,
      pageSize: 4,
      totalItems: 9,
    });

    expect(meta).toEqual({
      error: null,
      isLoading: true,
      isSearchPending: true,
      pageCount: 3,
      pageNumber: 2,
      pageSize: 4,
      totalItems: 9,
    });
  });

  it('stores a SourcererError reference in meta.error', () => {
    const err = { message: 'oops', name: 'SourcererError' } as unknown as SourcererError;
    const meta = createMeta({
      error: err,
      isLoading: false,
      isSearchPending: false,
      pageNumber: 1,
      pageSize: 10,
      totalItems: 0,
    });

    expect(meta.error).toBe(err);
  });

  describe('itemRange', () => {
    it('returns zeros for empty result sets', () => {
      expect(itemRange({ pageNumber: 1, pageSize: 10, totalItems: 0 })).toEqual({ end: 0, start: 0 });
    });

    it('returns correct range for first page', () => {
      expect(itemRange({ pageNumber: 1, pageSize: 3, totalItems: 5 })).toEqual({ end: 3, start: 1 });
    });

    it('returns correct range for middle page', () => {
      expect(itemRange({ pageNumber: 2, pageSize: 4, totalItems: 9 })).toEqual({ end: 8, start: 5 });
    });

    it('caps end at totalItems on last page', () => {
      expect(itemRange({ pageNumber: 3, pageSize: 4, totalItems: 9 })).toEqual({ end: 9, start: 9 });
    });
  });
});
