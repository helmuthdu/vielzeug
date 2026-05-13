import type { Predicate, Sorter } from './types';

type Direction = 'asc' | 'desc';

type PrimitiveComparable = number | string | Date;

export const filterContains = <T>(
  getValue: (item: T) => string | null | undefined,
  query: string,
  caseSensitive = false,
): Predicate<T> => {
  const needle = caseSensitive ? query : query.toLowerCase();

  return (item) => {
    const value = getValue(item) ?? '';
    const haystack = caseSensitive ? value : value.toLowerCase();

    return haystack.includes(needle);
  };
};

export const filterEquals = <T, V>(getValue: (item: T) => V, expected: V): Predicate<T> => {
  return (item) => Object.is(getValue(item), expected);
};

export const filterRange = <T>(
  getValue: (item: T) => number,
  bounds: Readonly<{ max?: number; min?: number }>,
): Predicate<T> => {
  return (item) => {
    const value = getValue(item);

    if (bounds.min !== undefined && value < bounds.min) return false;

    if (bounds.max !== undefined && value > bounds.max) return false;

    return true;
  };
};

export const sortBy = <T, V extends PrimitiveComparable>(
  getValue: (item: T) => V,
  direction: Direction = 'asc',
): Sorter<T> => {
  const sign = direction === 'asc' ? 1 : -1;

  return (a, b) => {
    const left = getValue(a);
    const right = getValue(b);

    if (left instanceof Date && right instanceof Date) {
      return (left.getTime() - right.getTime()) * sign;
    }

    if (left < right) return -1 * sign;

    if (left > right) return 1 * sign;

    return 0;
  };
};
