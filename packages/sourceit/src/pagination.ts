import type { SourceMeta } from './types';

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

export const clampOffset = (offset: number, pages: number) => {
  return Math.max(0, Math.min(clampInt(offset, 0), Math.max(1, pages) - 1));
};

export const createMeta = (state: {
  errorMessage: string | null;
  isLoading: boolean;
  isPending: boolean;
  pageNumber: number;
  pageSize: number;
  totalItems: number;
}): SourceMeta => {
  const safeLimit = clampInt(state.pageSize, 1);
  const safeTotal = clampInt(state.totalItems, 0);
  const pages = pageCount(safeTotal, safeLimit);
  const page = clampPage(state.pageNumber, pages);
  const isEmpty = safeTotal === 0;
  const start = isEmpty ? 0 : (page - 1) * safeLimit + 1;
  const end = isEmpty ? 0 : Math.min(page * safeLimit, safeTotal);

  return {
    errorMessage: state.errorMessage,
    hasNoItems: isEmpty,
    isFirstPage: page <= 1,
    isLastPage: page >= pages,
    isLoading: state.isLoading,
    isPending: state.isPending,
    itemEndIndex: end,
    itemStartIndex: start,
    pageCount: pages,
    pageNumber: page,
    pageSize: safeLimit,
    totalItems: safeTotal,
  };
};
