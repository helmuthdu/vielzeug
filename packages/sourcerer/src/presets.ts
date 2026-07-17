import type { Predicate, Sorter } from './types';

type Direction = 'asc' | 'desc';

type PrimitiveComparable = number | string | Date;
type SearchByGetter<T> = (item: T) => unknown;
type SearchByOptions = Readonly<{ caseSensitive?: boolean }>;

const toSearchableString = (value: unknown): string => {
  if (value === null || value === undefined) return '';

  if (
    typeof value === 'bigint' ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return String(value);
  }

  if (value instanceof Date) return value.toISOString();

  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return String(value);
  }
};

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

export const searchBy = <T>(
  getValue: SearchByGetter<T> | readonly SearchByGetter<T>[],
  opts: SearchByOptions = {},
): ((items: readonly T[], query: string) => readonly T[]) => {
  const getters = Array.isArray(getValue) ? getValue : [getValue];
  const caseSensitive = opts.caseSensitive === true;

  return (items, query) => {
    if (query.length === 0) return items;

    const needle = caseSensitive ? query : query.toLowerCase();

    return items.filter((item) => {
      return getters.some((getter) => {
        const raw = toSearchableString(getter(item));
        const haystack = caseSensitive ? raw : raw.toLowerCase();

        return haystack.includes(needle);
      });
    });
  };
};
