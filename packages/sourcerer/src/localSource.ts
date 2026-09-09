import { SourcererDisposedError } from './errors';
import { createPagePagination, positiveInteger } from './pagination';
import { createSourceStore } from './sourceStore';
import type { LocalSource, LocalSourceConfig, LocalSourceState, PagePagination } from './types';

/** Local sources filter and paginate an in-memory collection synchronously. */
export function createLocalSource<T>(items: readonly T[]): LocalSource<T>;
export function createLocalSource<T, TParams = undefined>(
  items: readonly T[],
  config: LocalSourceConfig<T, TParams>,
): LocalSource<T, TParams>;
export function createLocalSource<T, TParams = undefined>(
  items: readonly T[],
  config: LocalSourceConfig<T, TParams> = {} as LocalSourceConfig<T, TParams>,
): LocalSource<T, TParams> {
  let allItems = items;
  let page = 1;
  let pageSize = positiveInteger(config.pageSize ?? 20, 'pageSize');
  let params = config.params as TParams;

  const buildState = (): LocalSourceState<T, TParams> => {
    const filtered = config.filter ? allItems.filter((item) => config.filter?.(item, params)) : allItems;
    const pagination = createPagePagination(page, pageSize, filtered.length);
    if (page > pagination.pageCount) {
      page = pagination.pageCount;
      return buildState();
    }
    const start = (page - 1) * pageSize;

    return {
      error: null,
      items: filtered.slice(start, start + pageSize),
      loading: false,
      pagination,
      params,
    };
  };

  const store = createSourceStore(buildState());
  const assertLive = (): void => {
    if (store.disposed) throw new SourcererDisposedError();
  };
  const samePagination = (left: PagePagination, right: PagePagination): boolean =>
    Object.keys(left).every((key) => left[key as keyof PagePagination] === right[key as keyof PagePagination]);
  const commit = (): void => {
    const next = buildState();
    const current = store.value;
    const sameItems =
      next.items.length === current.items.length &&
      next.items.every((item, index) => Object.is(item, current.items[index]));

    if (Object.is(next.params, current.params) && sameItems && samePagination(next.pagination, current.pagination))
      return;
    store.set(next);
  };
  const goTo = (nextPage: number): void => {
    assertLive();
    const normalized = Math.min(positiveInteger(nextPage, 'page'), store.value.pagination.pageCount);
    if (normalized === page) return;
    page = normalized;
    commit();
  };

  const source: LocalSource<T, TParams> = {
    get disposalSignal() {
      return store.disposalSignal;
    },

    dispose: store.dispose,

    get disposed() {
      return store.disposed;
    },

    first() {
      goTo(1);
    },

    goTo,

    last() {
      goTo(store.value.pagination.pageCount);
    },

    next() {
      if (store.value.pagination.hasNext) goTo(page + 1);
      else assertLive();
    },

    previous() {
      if (store.value.pagination.hasPrevious) goTo(page - 1);
      else assertLive();
    },

    setItems(nextItems) {
      assertLive();
      if (nextItems === allItems) return;
      allItems = nextItems;
      commit();
    },

    setPageSize(nextPageSize) {
      assertLive();
      const normalized = positiveInteger(nextPageSize, 'pageSize');
      if (normalized === pageSize) return;
      page = 1;
      pageSize = normalized;
      commit();
    },

    setParams(nextParams) {
      assertLive();
      if (Object.is(nextParams, params)) return;
      page = 1;
      params = nextParams;
      commit();
    },

    get state() {
      return store.value;
    },

    subscribe: store.subscribe,

    [Symbol.dispose]() {
      source.dispose();
    },
  };

  return source;
}
