import type { SourceError, SourceMeta } from './types';

const clampInt = (value: number, minimum: number) => {
  const parsed = Math.trunc(value);

  if (!Number.isFinite(parsed)) {
    return minimum;
  }

  return Math.max(minimum, parsed);
};

export const pageCount = (total: number, limit: number) => {
  const safeTotal = clampInt(total, 0);
  const safeLimit = clampInt(limit, 1);

  return Math.max(1, Math.ceil(safeTotal / safeLimit));
};

export const clampPage = (page: number, pages: number) => {
  return Math.max(1, Math.min(clampInt(page, 1), Math.max(1, pages)));
};

export const createMeta = (state: {
  error: SourceError | null;
  isLoading: boolean;
  isSearchPending: boolean;
  pageNumber: number;
  pageSize: number;
  totalItems: number;
}): SourceMeta => {
  const safeLimit = clampInt(state.pageSize, 1);
  const safeTotal = clampInt(state.totalItems, 0);
  const pages = pageCount(safeTotal, safeLimit);
  const page = clampPage(state.pageNumber, pages);

  return {
    error: state.error,
    isLoading: state.isLoading,
    isSearchPending: state.isSearchPending,
    pageCount: pages,
    pageNumber: page,
    pageSize: safeLimit,
    totalItems: safeTotal,
  };
};

/**
 * Computes the 1-based display range of items on the current page.
 * Returns `{ start: 0, end: 0 }` when there are no items.
 *
 * @example
 * ```ts
 * const { start, end } = itemRange(source.meta);
 * // "Showing 11–20 of 50"
 * console.log(`Showing ${start}–${end} of ${source.meta.totalItems}`);
 * ```
 */
export function itemRange(meta: Readonly<{ pageNumber: number; pageSize: number; totalItems: number }>): {
  end: number;
  start: number;
} {
  if (meta.totalItems === 0) return { end: 0, start: 0 };

  const start = (meta.pageNumber - 1) * meta.pageSize + 1;

  return {
    end: Math.min(meta.pageNumber * meta.pageSize, meta.totalItems),
    start,
  };
}
