export type Predicate<T> = (value: T, index: number, values: readonly T[]) => boolean;
export type Sorter<T> = (left: T, right: T) => number;

export type Disposable = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
};

export type PagePagination = Readonly<{
  count: number;
  hasNext: boolean;
  hasPrevious: boolean;
  index: number;
  kind: 'page';
  size: number;
  total: number;
}>;

export type CursorPagination<TCursor = string> = Readonly<{
  hasNext: boolean;
  hasPrevious: boolean;
  kind: 'cursor';
  nextCursor?: TCursor;
  previousCursor?: TCursor;
  total?: number;
}>;

export type InfinitePagination = Readonly<{
  hasMore: boolean;
  isLoadingMore: boolean;
  kind: 'infinite';
  loaded: number;
  total: number;
}>;

export type AnyPagination = CursorPagination<unknown> | InfinitePagination | PagePagination;

/** Loaded state remains internally consistent while pendingQuery describes newer work. */
export type SourceSnapshot<T, TQuery, TPagination extends AnyPagination = AnyPagination> = Readonly<{
  data: readonly T[];
  error: Error | null;
  isFetching: boolean;
  pagination: TPagination;
  pendingQuery?: TQuery;
  query: TQuery;
}>;

export type Source<T, TQuery, TPagination extends AnyPagination = AnyPagination> = Disposable & {
  readonly snapshot: SourceSnapshot<T, TQuery, TPagination>;
  subscribe(listener: (snapshot: SourceSnapshot<T, TQuery, TPagination>) => void): () => void;
};

export type PageQuery<TFilter = unknown, TSort = unknown> = Readonly<{
  filter?: TFilter;
  page: number;
  pageSize: number;
  search: string;
  sort?: TSort;
}>;

export type PageQueryPatch<TFilter = unknown, TSort = unknown> = Readonly<{
  filter?: TFilter | undefined;
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: TSort | undefined;
}>;

export type PageResult<T> = Readonly<{
  data: readonly T[];
  total: number;
}>;

export type PageLoadContext<TQuery> = Readonly<{
  query: TQuery;
  signal: AbortSignal;
}>;

export type PageSource<T, TFilter = unknown, TSort = unknown> = Source<T, PageQuery<TFilter, TSort>, PagePagination> & {
  readonly page: Readonly<{
    go(index: number): Promise<void>;
    last(): Promise<void>;
    next(): Promise<void>;
    previous(): Promise<void>;
  }>;
  reload(): Promise<void>;
  setQuery(changes: PageQueryPatch<TFilter, TSort>): Promise<void>;
};

export type PageSourceConfig<T, TFilter = unknown, TSort = unknown> = Readonly<{
  autoStart?: boolean;
  initialQuery?: PageQueryPatch<TFilter, TSort>;
  load(context: PageLoadContext<PageQuery<TFilter, TSort>>): Promise<PageResult<T>>;
}>;

export type LocalQuery = Readonly<{
  page: number;
  pageSize: number;
  search: string;
}>;

export type LocalQueryPatch = Readonly<{
  page?: number;
  pageSize?: number;
  search?: string;
}>;

export type LocalSource<T> = Source<T, LocalQuery, PagePagination> & {
  readonly page: Readonly<{
    go(index: number): boolean;
    last(): boolean;
    next(): boolean;
    previous(): boolean;
  }>;
  setData(data: readonly T[]): boolean;
  setQuery(changes: LocalQueryPatch): boolean;
};

export type LocalSourceConfig<T> = Readonly<{
  initialQuery?: LocalQueryPatch;
  match?: (item: T, search: string) => boolean;
}>;

export type CursorQuery<TCursor = string> = Readonly<{
  after?: TCursor;
  before?: TCursor;
  pageSize: number;
  search: string;
}>;

export type CursorQueryPatch<TCursor = string> = Readonly<{
  after?: TCursor | undefined;
  before?: TCursor | undefined;
  pageSize?: number;
  search?: string;
}>;

export type CursorResult<T, TCursor = string> = Readonly<{
  data: readonly T[];
  nextCursor?: TCursor;
  previousCursor?: TCursor;
  total?: number;
}>;

export type CursorSource<T, TCursor = string> = Source<T, CursorQuery<TCursor>, CursorPagination<TCursor>> & {
  readonly page: Readonly<{
    next(): Promise<void>;
    previous(): Promise<void>;
  }>;
  reload(): Promise<void>;
  setQuery(changes: CursorQueryPatch<TCursor>): Promise<void>;
};

export type CursorSourceConfig<T, TCursor = string> = Readonly<{
  autoStart?: boolean;
  initialQuery?: CursorQueryPatch<TCursor>;
  load(context: PageLoadContext<CursorQuery<TCursor>>): Promise<CursorResult<T, TCursor>>;
}>;

export type InfiniteQuery = Readonly<{
  pageSize: number;
  search: string;
}>;

export type InfiniteQueryPatch = Readonly<{
  pageSize?: number;
  search?: string;
}>;

export type InfiniteSource<T> = Source<T, InfiniteQuery, InfinitePagination> & {
  loadMore(): Promise<void>;
  reload(): Promise<void>;
  setQuery(changes: InfiniteQueryPatch): Promise<void>;
};

export type InfiniteSourceConfig<T> = Readonly<{
  autoStart?: boolean;
  initialQuery?: InfiniteQueryPatch;
  load(context: PageLoadContext<PageQuery>): Promise<PageResult<T>>;
}>;
