import type { PagePagination } from './types';

export function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer`);

  return value;
}

export function totalItems(value: number): number {
  if (!Number.isInteger(value) || value < 0) throw new RangeError('Source loader total must be a non-negative integer');

  return value;
}

export function createPagePagination(index: number, size: number, total: number): PagePagination {
  const count = Math.max(1, Math.ceil(total / size));
  const safeIndex = Math.min(index, count);

  return {
    count,
    hasNext: safeIndex < count,
    hasPrevious: safeIndex > 1,
    index: safeIndex,
    kind: 'page',
    size,
    total,
  };
}

export function sameQuery<T extends Record<string, unknown>>(left: T, right: T): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

  return [...keys].every((key) => Object.is(left[key], right[key]));
}
