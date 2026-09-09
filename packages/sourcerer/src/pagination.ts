import { SourcererConfigurationError } from './errors';
import type { PagePagination } from './types';

export function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1)
    throw new SourcererConfigurationError(`${name} must be a positive integer`);

  return value;
}

export function totalItems(value: number): number {
  if (!Number.isInteger(value) || value < 0)
    throw new SourcererConfigurationError('totalItems must be a non-negative integer');

  return value;
}

export function createPagePagination(page: number, pageSize: number, total: number): PagePagination {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    hasNext: page < pageCount,
    hasPrevious: page > 1,
    page,
    pageCount,
    pageSize,
    totalItems: total,
  };
}
