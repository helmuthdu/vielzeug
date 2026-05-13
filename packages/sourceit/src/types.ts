export type Predicate<T> = (value: T, index: number, array: readonly T[]) => boolean;

export type Sorter<T> = (a: T, b: T) => number;

export type QueryParamsInput = Record<string, string | string[] | undefined>;
export type QueryParams = Record<string, string>;

export type SourceSnapshot = Readonly<{
  limit: number;
  page: number;
  search: string;
}>;

export type RemoteSourceSnapshot<F = unknown, S = unknown> = SourceSnapshot &
  Readonly<{
    filter?: F;
    sort?: S;
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
  isPending: boolean;
  itemEndIndex: number;
  itemStartIndex: number;
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

export type LocalSource<T> = BaseSource<T> & {
  flush(): void;
  fromQueryParams(params: QueryParamsInput): void;
  goTo(page: number): void;
  goToFirst(): void;
  goToLast(): void;
  hydrate(state: Partial<SourceSnapshot>): void;
  next(): void;
  prev(): void;
  reset(): void;
  search(query: string, immediate?: boolean): void;
  setData(data: readonly T[]): void;
  setFilter(filter?: Predicate<T>): void;
  setLimit(n: number): void;
  setSort(sort?: Sorter<T>): void;
  snapshot(): SourceSnapshot;
  toQueryParams(): QueryParams;
  update(
    mutator: (ctx: {
      goTo(p: number): void;
      search(q: string): void;
      setData(d: readonly T[]): void;
      setFilter(f?: Predicate<T>): void;
      setLimit(n: number): void;
      setSort(s?: Sorter<T>): void;
    }) => void,
  ): void;
};

export type RemoteSource<T, F = unknown, S = unknown> = BaseSource<T> & {
  flush(): void;
  fromQueryParams(params: QueryParamsInput): void;
  goTo(page: number): void;
  goToFirst(): void;
  goToLast(): void;
  hydrate(state: Partial<RemoteSourceSnapshot<F, S>>): void;
  next(): void;
  prev(): void;
  ready(): Promise<void>;
  refresh(): void;
  reset(): void;
  search(query: string, immediate?: boolean): void;
  setFilter(filter?: F): void;
  setLimit(n: number): void;
  setSort(sort?: S): void;
  snapshot(): RemoteSourceSnapshot<F, S>;
  toQueryParams(): QueryParams;
  update(
    mutator: (ctx: {
      goTo(p: number): void;
      search(q: string): void;
      setFilter(f?: F): void;
      setLimit(n: number): void;
      setSort(s?: S): void;
    }) => void,
  ): void;
};

export type LocalConfig<T> = Readonly<{
  debounceMs?: number;
  filter?: Predicate<T>;
  limit?: number;
  sort?: Sorter<T>;
}>;

export type RemoteConfig<T, F, S> = Readonly<{
  debounceMs?: number;
  fetch: (
    q: Readonly<{ filter?: F; limit: number; page: number; search?: string; sort?: S }>,
  ) => Promise<Readonly<{ items: readonly T[]; total: number }>>;
  initialFilter?: F;
  initialSort?: S;
  limit?: number;
}>;
