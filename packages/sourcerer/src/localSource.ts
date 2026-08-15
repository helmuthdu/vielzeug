import { createPagePagination, positiveInteger, sameQuery, totalItems } from './pagination';
import { createSourceStore } from './sourceStore';
import type {
  LocalQuery,
  LocalQueryPatch,
  LocalSource,
  LocalSourceConfig,
  PagePagination,
  SourceSnapshot,
} from './types';

const normalizeQuery = (current: LocalQuery, patch: LocalQueryPatch = {}, maxPage?: number): LocalQuery => {
  const page = patch.page ?? current.page;
  const pageSize = patch.pageSize ?? current.pageSize;
  const search = patch.search ?? current.search;
  const resetsPage = patch.pageSize !== undefined || patch.search !== undefined;

  const requestedPage = patch.page ?? (resetsPage ? 1 : page);

  return {
    page:
      maxPage === undefined
        ? positiveInteger(requestedPage, 'page')
        : Math.min(positiveInteger(requestedPage, 'page'), maxPage),
    pageSize: positiveInteger(pageSize, 'pageSize'),
    search,
  };
};

/** Local sources own only search and pagination; callers prepare filtering and ranking. */
export function createLocalSource<T>(data: readonly T[], config: LocalSourceConfig<T> = {}): LocalSource<T> {
  let allData = data;
  let query = normalizeQuery({ page: 1, pageSize: 20, search: '' }, config.initialQuery);

  const buildSnapshot = (): SourceSnapshot<T, LocalQuery, PagePagination> => {
    const matched =
      query.search.length > 0 && config.match ? allData.filter((item) => config.match?.(item, query.search)) : allData;
    const total = totalItems(matched.length);
    const pagination = createPagePagination(query.page, query.pageSize, total);
    const start = (pagination.index - 1) * pagination.size;

    query = { ...query, page: pagination.index };

    return {
      data: matched.slice(start, start + pagination.size),
      error: null,
      isFetching: false,
      pagination,
      query,
    };
  };

  const store = createSourceStore(buildSnapshot());

  const commit = (): boolean => {
    const next = buildSnapshot();

    if (
      sameQuery(next.query, store.value.query) &&
      next.data === store.value.data &&
      next.pagination === store.value.pagination
    ) {
      return false;
    }

    store.set(next);

    return true;
  };

  const setQuery = (patch: LocalQueryPatch): void => {
    const next = normalizeQuery(query, patch, store.value.pagination.count);

    if (sameQuery(next, query)) return;

    query = next;

    commit();
  };

  const source: LocalSource<T> = {
    get disposalSignal() {
      return store.disposalSignal;
    },

    dispose: store.dispose,

    get disposed() {
      return store.disposed;
    },

    page: {
      go(index) {
        setQuery({ page: index });
      },

      last() {
        setQuery({ page: store.value.pagination.count });
      },

      next() {
        if (store.value.pagination.hasNext) setQuery({ page: store.value.pagination.index + 1 });
      },

      previous() {
        if (store.value.pagination.hasPrevious) setQuery({ page: store.value.pagination.index - 1 });
      },
    },

    setData(nextData) {
      if (nextData === allData) return;

      allData = nextData;

      commit();
    },

    setQuery,

    get snapshot() {
      return store.value;
    },

    subscribe: store.subscribe,

    [Symbol.dispose]() {
      source.dispose();
    },
  };

  return source;
}
