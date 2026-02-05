import { debounce } from '../function/debounce';
import type { Predicate } from '../types';
import { chunk } from './chunk';
import { search } from './search';

type Config<T> = {
  filterFn?: Predicate<T>;
  limit?: number;
  sortFn?: (a: T, b: T) => number;
};

const DEFAULT_LIMIT = 10;
const DEFAULT_SEARCH_TONE = 0.5;
const MIN_LIMIT = 1;

function getPages<T>(data: T[], size: number, sortFn: Config<T>['sortFn']): T[][] {
  const sortedData = sortFn ? [...data].sort(sortFn) : [...data];
  return chunk<T>(sortedData, size) as T[][];
}

function getData<T>(data: T[], currentFilterFn: Predicate<T>, query = ''): T[] {
  const searchResults = query ? search(data, query, DEFAULT_SEARCH_TONE) : data;
  return searchResults.filter(currentFilterFn) as T[];
}

export function list<T>(initialData: T[], config: Config<T> = {}) {
  let { limit = DEFAULT_LIMIT, filterFn = () => true, sortFn } = config;
  let rawData = [...initialData];
  let offset = 0;
  let query = '';
  let data = getData(rawData, filterFn);
  let pages = getPages(data, limit, sortFn);

  const update = () => {
    data = getData(rawData, filterFn, query);
    pages = getPages(data, limit, sortFn);
    // Ensure offset is valid for the new page count
    // If pages is empty, offset should be 0. Max index is pages.length - 1
    const maxOffset = Math.max(0, pages.length - 1);
    offset = Math.max(0, Math.min(offset, maxOffset));
    return pages[offset] ?? [];
  };

  return {
    get current() {
      return pages[offset] ?? [];
    },
    set data(newData: T[]) {
      rawData = [...newData];
      offset = 0;
      update();
    },
    filter(predicate: (item: T) => boolean) {
      filterFn = predicate;
      offset = 0;
      return update();
    },
    set limit(newLimit: number) {
      limit = Math.max(MIN_LIMIT, newLimit);
      update();
    },
    get meta() {
      return {
        end: Math.min(limit * (offset + 1), data.length),
        isEmpty: data.length === 0,
        isFirst: offset === 0,
        isLast: offset === pages.length - 1,
        limit: limit,
        page: offset + 1,
        pages: Math.ceil(data.length / limit),
        start: Math.max(0, limit * offset + 1),
        total: data.length,
      };
    },
    next() {
      if (offset < pages.length - 1) {
        offset++;
      }
    },
    set page(page: number) {
      const index = page - 1;
      const value = index < 0 ? pages.length + index : index;
      offset = Math.max(0, Math.min(value, pages.length - 1));
    },
    get pages() {
      return pages;
    },
    prev() {
      if (offset > 0) {
        offset--;
      }
    },
    reset() {
      offset = 0;
      query = '';
      filterFn = config.filterFn ?? (() => true);
      return update();
    },
    search: debounce((str: string) => {
      query = str;
      return update();
    }),
    sort(fn?: (a: T, b: T) => number) {
      sortFn = fn;
      return update();
    },
    *[Symbol.iterator]() {
      for (const page of pages) {
        yield page;
      }
    },
  };
}
