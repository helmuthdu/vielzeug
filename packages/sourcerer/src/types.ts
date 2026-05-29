export type Predicate<T> = (value: T, index: number, array: readonly T[]) => boolean;

export type Sorter<T> = (a: T, b: T) => number;

export type QueryParamsInput = Record<string, string | string[] | undefined>;
export type QueryParams = Record<string, string>;

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

/**
 * Common metadata shared by both local and remote sources.
 */
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
  reset(): void;
  restore(state: Partial<SourceQuery>): void;
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
  reset(): Promise<void>;
  restore(state: Partial<RemoteSourceQuery<TFilter, TSort>>): Promise<void>;
  search(query: string): void;
  searchNow(query: string): Promise<void>;
  setFilter(filter?: TFilter): Promise<void>;
  setLimit(limit: number): Promise<void>;
  setSort(sort?: TSort): Promise<void>;
  toQuery(): RemoteSourceQuery<TFilter, TSort>;
};

export type LocalConfig<T> = Readonly<{
  debounceMs?: number;
  filter?: Predicate<T>;
  limit?: number;
  searchFn?: (items: readonly T[], query: string) => readonly T[];
  sort?: Sorter<T>;
}>;

export type RemoteConfig<T, TFilter, TSort> = Readonly<{
  debounceMs?: number;
  fetch: (
    q: Readonly<{ filter?: TFilter; limit: number; page: number; search?: string; sort?: TSort }>,
  ) => Promise<Readonly<{ items: readonly T[]; total: number }>>;
  filter?: TFilter;
  limit?: number;
  sort?: TSort;
}>;
