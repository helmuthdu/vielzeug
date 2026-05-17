export const sourceitTypes = `
declare module '@vielzeug/sourceit' {
  export type QueryParamsInput = Record<string, string | string[] | undefined>;
  export type QueryParams = Record<string, string>;

  export type Predicate<T> = (value: T, index: number, array: readonly T[]) => boolean;
  export type Sorter<T> = (a: T, b: T) => number;

  export type SourceQuery = Readonly<{
    limit: number;
    page: number;
    search: string;
  }>;

  export type RemoteSourceQuery<TFilter = unknown, TSort = unknown> = SourceQuery &
    Readonly<{
      filter?: TFilter;
      sort?: TSort;
    }>;

  export type SourceMeta = Readonly<{
    errorMessage: string | null;
    hasNoItems: boolean;
    isFirstPage: boolean;
    isLastPage: boolean;
    isLoading: boolean;
    isSearchPending: boolean;
    itemEnd: number;
    itemStart: number;
    pageCount: number;
    pageNumber: number;
    pageSize: number;
    totalItems: number;
  }>;

  export type BaseSource<T> = {
    readonly current: readonly T[];
    readonly meta: SourceMeta;
    subscribe(listener: () => void): () => void;
  };

  export type LocalBatchContext<T> = {
    goTo(page: number): void;
    search(query: string): void;
    setData(data: readonly T[]): void;
    setFilter(filter?: Predicate<T>): void;
    setLimit(limit: number): void;
    setSort(sort?: Sorter<T>): void;
  };

  export type RemoteBatchContext<TFilter = unknown, TSort = unknown> = {
    goTo(page: number): void;
    search(query: string): void;
    setFilter(filter?: TFilter): void;
    setLimit(limit: number): void;
    setSort(sort?: TSort): void;
  };

  export type LocalSource<T> = BaseSource<T> & {
    batch(mutator: (ctx: LocalBatchContext<T>) => void): void;
    commit(): void;
    fromQueryParams(params: QueryParamsInput): void;
    goTo(page: number): void;
    goToLast(): void;
    next(): void;
    prev(): void;
    restore(state: Partial<SourceQuery>): void;
    reset(): void;
    search(query: string): void;
    searchNow(query: string): void;
    setData(data: readonly T[]): void;
    setFilter(filter?: Predicate<T>): void;
    setLimit(limit: number): void;
    setSort(sort?: Sorter<T>): void;
    toQuery(): SourceQuery;
  };

  export type RemoteSource<T, TFilter = unknown, TSort = unknown> = BaseSource<T> & {
    batch(mutator: (ctx: RemoteBatchContext<TFilter, TSort>) => void): Promise<void>;
    commit(): Promise<void>;
    fromQueryParams(params: QueryParamsInput): Promise<void>;
    goTo(page: number): Promise<void>;
    goToLast(): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    ready(): Promise<void>;
    refresh(): Promise<void>;
    restore(state: Partial<RemoteSourceQuery<TFilter, TSort>>): Promise<void>;
    reset(): Promise<void>;
    search(query: string): void;
    searchNow(query: string): Promise<void>;
    setFilter(filter?: TFilter): Promise<void>;
    setLimit(limit: number): Promise<void>;
    setSort(sort?: TSort): Promise<void>;
    toQuery(): RemoteSourceQuery<TFilter, TSort>;
  };

  export function createLocalSource<T>(
    initialData: readonly T[],
    cfg?: {
      debounceMs?: number;
      filter?: Predicate<T>;
      limit?: number;
      searchFn?: (items: readonly T[], query: string) => readonly T[];
      sort?: Sorter<T>;
    }
  ): LocalSource<T>;

  export function createRemoteSource<T, TFilter = unknown, TSort = unknown>(cfg: {
    debounceMs?: number;
    fetch: (q: {
      filter?: TFilter;
      limit: number;
      page: number;
      search?: string;
      sort?: TSort;
    }) => Promise<{ items: readonly T[]; total: number }>;
    filter?: TFilter;
    limit?: number;
    sort?: TSort;
  }): RemoteSource<T, TFilter, TSort>;

  export function subscribeSelector<T, U>(
    source: BaseSource<T>,
    selector: (source: BaseSource<T>) => U,
    listener: (next: U, prev: U) => void,
    isEqual?: (a: U, b: U) => boolean
  ): () => void;

  export function shallowEqual<T>(left: T, right: T): boolean;

  export function decodeLocalQueryParams(params: QueryParamsInput, defaultLimit?: number): Partial<SourceQuery>;
  export function encodeLocalQueryParams(query: SourceQuery): QueryParams;
  export function decodeRemoteQueryParams<TFilter = unknown, TSort = unknown>(
    params: QueryParamsInput,
    defaultLimit?: number
  ): Partial<RemoteSourceQuery<TFilter, TSort>>;
  export function decodeRemoteQueryParamsStrict<TFilter = unknown, TSort = unknown>(
    params: QueryParamsInput,
    defaultLimit?: number
  ): Partial<RemoteSourceQuery<TFilter, TSort>>;
  export function encodeRemoteQueryParams<TFilter = unknown, TSort = unknown>(
    query: RemoteSourceQuery<TFilter, TSort>
  ): QueryParams;

  export function and<T>(...predicates: Predicate<T>[]): Predicate<T>;
  export function or<T>(...predicates: Predicate<T>[]): Predicate<T>;
  export function not<T>(predicate: Predicate<T>): Predicate<T>;

  export function filterContains<T>(
    getValue: (item: T) => string | null | undefined,
    query: string,
    caseSensitive?: boolean
  ): Predicate<T>;
  export function filterEquals<T, V>(getValue: (item: T) => V, expected: V): Predicate<T>;
  export function filterRange<T>(
    getValue: (item: T) => number,
    bounds: Readonly<{ min?: number; max?: number }>
  ): Predicate<T>;
  export function sortBy<T, V extends number | string | Date>(
    getValue: (item: T) => V,
    direction?: 'asc' | 'desc'
  ): Sorter<T>;

  export function containsSearch<T>(array: readonly T[], query: string): T[];
  export function fuzzySearch<T>(array: readonly T[], query: string, tone?: number): T[];
}
`;
