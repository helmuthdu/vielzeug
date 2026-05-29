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
 * Metadata snapshot describing the current pagination and loading state of a source.
 */
export type SourceMeta = Readonly<{
  errorMessage: string | null;
  isLoading: boolean;
  isSearchPending: boolean;
  itemEnd: number;
  itemStart: number;
  pageCount: number;
  pageNumber: number;
  pageSize: number;
  totalItems: number;
}>;

/**
 * Shared read-only interface for all source types.
 * Provides the paginated view, metadata, and a framework-agnostic subscription.
 */
export type BaseSource<T> = {
  readonly current: readonly T[];
  readonly meta: SourceMeta;
  subscribe(listener: () => void): () => void;
};

/**
 * Shared mutation interface for local sources.
 * All mutation methods return Promise<void>; LocalSource wraps sync operations
 * in resolved promises. RemoteSource has a separate, extended interface.
 */
export type Source<T> = BaseSource<T> & {
  commit(): Promise<void>;
  goTo(page: number): Promise<void>;
  goToLast(): Promise<void>;
  next(): Promise<void>;
  prev(): Promise<void>;
  reset(): Promise<void>;
  restore(state: Partial<SourceQuery>): Promise<void>;
  search(query: string): void;
  searchNow(query: string): Promise<void>;
  setFilter(filter?: Predicate<T>): Promise<void>;
  setLimit(limit: number): Promise<void>;
  setSort(sort?: Sorter<T>): Promise<void>;
  toQuery(): SourceQuery;
  update(patch: Partial<SourceQuery & { filter?: Predicate<T>; sort?: Sorter<T> }>): Promise<void>;
};

export type LocalSource<T> = Source<T> & {
  setData(data: readonly T[]): Promise<void>;
};

export type RemoteSource<T, TFilter = unknown, TSort = unknown> = BaseSource<T> & {
  commit(): Promise<void>;
  goTo(page: number): Promise<void>;
  goToLast(): Promise<void>;
  next(): Promise<void>;
  /**
   * Applies an optimistic update to the current items immediately, before a fetch settles.
   * Returns a rollback function. The optimistic state is automatically cleared when the
   * next successful fetch completes, or rolled back automatically on failure.
   */
  optimisticUpdate(mutator: (current: readonly T[]) => readonly T[], options?: { total?: number }): () => void;
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
  update(patch: Partial<RemoteSourceQuery<TFilter, TSort>>): Promise<void>;
};

export type LocalConfig<T> = Readonly<{
  debounceMs?: number;
  filter?: Predicate<T>;
  limit?: number;
  searchFn?: (items: readonly T[], query: string) => readonly T[];
  sort?: Sorter<T>;
}>;

export type RemoteConfig<T, TFilter, TSort> = Readonly<{
  autoFetch?: boolean;
  debounceMs?: number;
  fetch: (
    q: Readonly<{ filter?: TFilter; limit: number; page: number; search?: string; sort?: TSort }>,
    signal: AbortSignal,
  ) => Promise<Readonly<{ items: readonly T[]; total: number }>>;
  filter?: TFilter;
  limit?: number;
  queryKey?: (q: Readonly<{ filter?: TFilter; limit: number; page: number; search?: string; sort?: TSort }>) => string;
  sort?: TSort;
}>;

// ── Cursor-based source types ────────────────────────────────────────────────

export type CursorMeta = Readonly<{
  errorMessage: string | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isLoading: boolean;
  isSearchPending: boolean;
  pageSize: number;
  totalItems: number;
}>;

export type CursorSource<T> = {
  readonly current: readonly T[];
  readonly meta: CursorMeta;
  next(): Promise<void>;
  prev(): Promise<void>;
  ready(): Promise<void>;
  refresh(): Promise<void>;
  reset(): Promise<void>;
  search(query: string): void;
  searchNow(query: string): Promise<void>;
  setLimit(limit: number): Promise<void>;
  subscribe(listener: () => void): () => void;
};

export type CursorConfig<T, TCursor = string> = Readonly<{
  autoFetch?: boolean;
  debounceMs?: number;
  fetch: (
    q: Readonly<{ after?: TCursor; before?: TCursor; limit: number; search?: string }>,
    signal: AbortSignal,
  ) => Promise<Readonly<{ items: readonly T[]; nextCursor?: TCursor; prevCursor?: TCursor; total?: number }>>;
  limit?: number;
  queryKey?: (q: Readonly<{ after?: TCursor; before?: TCursor; limit: number; search?: string }>) => string;
}>;

// ── Infinite (append) source types ──────────────────────────────────────────

export type InfiniteMeta = Readonly<{
  errorMessage: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isSearchPending: boolean;
  pageSize: number;
  totalItems: number;
}>;

export type InfiniteSource<T> = {
  readonly all: readonly T[];
  loadMore(): Promise<void>;
  readonly meta: InfiniteMeta;
  ready(): Promise<void>;
  reset(): Promise<void>;
  search(query: string): void;
  searchNow(query: string): Promise<void>;
  setLimit(limit: number): Promise<void>;
  subscribe(listener: () => void): () => void;
};

export type InfiniteConfig<T> = Readonly<{
  autoFetch?: boolean;
  debounceMs?: number;
  fetch: (
    q: Readonly<{ limit: number; page: number; search?: string }>,
    signal: AbortSignal,
  ) => Promise<Readonly<{ items: readonly T[]; total: number }>>;
  limit?: number;
}>;
