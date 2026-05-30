import { clampPage, createMeta, pageCount } from '../pagination';

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
      errorMessage: null,
      isLoading: false,
      isSearchPending: false,
      pageNumber: 1,
      pageSize: 10,
      totalItems: 0,
    });

    expect(meta).toEqual({
      errorMessage: null,
      isLoading: false,
      isSearchPending: false,
      itemEnd: 0,
      itemStart: 0,
      pageCount: 1,
      pageNumber: 1,
      pageSize: 10,
      totalItems: 0,
    });

    // Removed fields no longer in SourceMeta.
    expect('hasNoItems' in meta).toBe(false);
    expect('isFirstPage' in meta).toBe(false);
    expect('isLastPage' in meta).toBe(false);
  });

  it('creates correct meta values for non-empty result sets', () => {
    const meta = createMeta({
      errorMessage: null,
      isLoading: true,
      isSearchPending: true,
      pageNumber: 2,
      pageSize: 4,
      totalItems: 9,
    });

    expect(meta).toEqual({
      errorMessage: null,
      isLoading: true,
      isSearchPending: true,
      itemEnd: 8,
      itemStart: 5,
      pageCount: 3,
      pageNumber: 2,
      pageSize: 4,
      totalItems: 9,
    });
  });
});
