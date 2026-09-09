export type PagePagination = Readonly<{
  hasNext: boolean;
  hasPrevious: boolean;
  page: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
}>;

export type CursorPagination<TCursor = string> = Readonly<{
  nextCursor?: TCursor;
  pageSize: number;
  previousCursor?: TCursor;
  totalItems?: number;
}>;

export type InfinitePagination = Readonly<{
  hasMore: boolean;
  loadedItems: number;
  pageSize: number;
  totalItems: number;
}>;

export type PageSourceState<T, TParams = undefined> = Readonly<{
  error: Error | null;
  items: readonly T[];
  loading: boolean;
  pagination: PagePagination;
  params: TParams;
  pendingParams?: TParams;
}>;

export type PageLoadContext<TParams = undefined> = Readonly<{
  page: number;
  pageSize: number;
  params: TParams;
  signal: AbortSignal;
}>;

export type PageResult<T> = Readonly<{
  items: readonly T[];
  totalItems: number;
}>;

export type PageSource<T, TParams = undefined> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  first(): Promise<void>;
  goTo(page: number): Promise<void>;
  last(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  reload(): Promise<void>;
  setPageSize(pageSize: number): Promise<void>;
  setParams(params: TParams): Promise<void>;
  readonly state: PageSourceState<T, TParams>;
  subscribe(listener: (state: PageSourceState<T, TParams>) => void): () => void;
};

export type PageSourceConfig<T, TParams = undefined> = Readonly<
  {
    load(context: PageLoadContext<TParams>): Promise<PageResult<T>>;
    pageSize?: number;
  } & (undefined extends TParams ? { params?: TParams } : { params: TParams })
>;

export type LocalSourceState<T, TParams = undefined> = Readonly<{
  error: null;
  items: readonly T[];
  loading: false;
  pagination: PagePagination;
  params: TParams;
}>;

export type LocalSource<T, TParams = undefined> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  first(): void;
  goTo(page: number): void;
  last(): void;
  next(): void;
  previous(): void;
  setItems(items: readonly T[]): void;
  setPageSize(pageSize: number): void;
  setParams(params: TParams): void;
  readonly state: LocalSourceState<T, TParams>;
  subscribe(listener: (state: LocalSourceState<T, TParams>) => void): () => void;
};

export type LocalSourceConfig<T, TParams = undefined> = Readonly<
  {
    filter?: (item: T, params: TParams) => boolean;
    pageSize?: number;
  } & (undefined extends TParams ? { params?: TParams } : { params: TParams })
>;

export type CursorSourceState<T, TParams = undefined, TCursor = string> = Readonly<{
  error: Error | null;
  items: readonly T[];
  loading: boolean;
  pagination: CursorPagination<TCursor>;
  params: TParams;
  pendingParams?: TParams;
}>;

export type CursorLoadContext<TParams = undefined, TCursor = string> = Readonly<{
  after?: TCursor;
  before?: TCursor;
  pageSize: number;
  params: TParams;
  signal: AbortSignal;
}>;

export type CursorResult<T, TCursor = string> = Readonly<{
  items: readonly T[];
  nextCursor?: TCursor;
  previousCursor?: TCursor;
  totalItems?: number;
}>;

export type CursorSource<T, TParams = undefined, TCursor = string> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  next(): Promise<void>;
  previous(): Promise<void>;
  reload(): Promise<void>;
  setPageSize(pageSize: number): Promise<void>;
  setParams(params: TParams): Promise<void>;
  readonly state: CursorSourceState<T, TParams, TCursor>;
  subscribe(listener: (state: CursorSourceState<T, TParams, TCursor>) => void): () => void;
};

export type CursorSourceConfig<T, TParams = undefined, TCursor = string> = Readonly<
  {
    after?: TCursor;
    before?: TCursor;
    load(context: CursorLoadContext<TParams, TCursor>): Promise<CursorResult<T, TCursor>>;
    pageSize?: number;
  } & (undefined extends TParams ? { params?: TParams } : { params: TParams })
>;

export type InfiniteSourceState<T, TParams = undefined> = Readonly<{
  error: Error | null;
  items: readonly T[];
  loading: boolean;
  pagination: InfinitePagination;
  params: TParams;
  pendingParams?: TParams;
}>;

export type InfiniteLoadContext<TParams = undefined> = Readonly<{
  page: number;
  pageSize: number;
  params: TParams;
  signal: AbortSignal;
}>;

export type InfiniteSource<T, TParams = undefined> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  loadMore(): Promise<void>;
  reload(): Promise<void>;
  setPageSize(pageSize: number): Promise<void>;
  setParams(params: TParams): Promise<void>;
  readonly state: InfiniteSourceState<T, TParams>;
  subscribe(listener: (state: InfiniteSourceState<T, TParams>) => void): () => void;
};

export type InfiniteSourceConfig<T, TParams = undefined> = Readonly<
  {
    load(context: InfiniteLoadContext<TParams>): Promise<PageResult<T>>;
    pageSize?: number;
  } & (undefined extends TParams ? { params?: TParams } : { params: TParams })
>;
