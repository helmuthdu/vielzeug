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
  getValue: (item: T) => Date | number,
  bounds: Readonly<{ max?: Date | number; min?: Date | number }>,
): Predicate<T> => {
  const toNum = (v: Date | number): number => (v instanceof Date ? v.getTime() : v);

  const min = bounds.min !== undefined ? toNum(bounds.min) : undefined;
  const max = bounds.max !== undefined ? toNum(bounds.max) : undefined;

  return (item) => {
    const value = toNum(getValue(item));

    if (min !== undefined && value < min) return false;

    if (max !== undefined && value > max) return false;

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
