export const sourcererTypes = `
declare module '/sourcerer' {
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
    isLoading: boolean;
    isSearchPending: boolean;
    itemEnd: number;
    itemStart: number;
    pageCount: number;
    pageNumber: number;
    pageSize: number;
    totalItems: number;
  }>;

  export type CursorMeta = Readonly<{
    errorMessage: string | null;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    isLoading: boolean;
    isSearchPending: boolean;
    pageSize: number;
    totalItems: number;
  }>;

  export type InfiniteMeta = Readonly<{
    errorMessage: string | null;
    hasMore: boolean;
    isLoading: boolean;
    isSearchPending: boolean;
    pageSize: number;
    totalItems: number;
  }>;

  export type BaseSource<T> = {
    readonly current: readonly T[];
    readonly meta: SourceMeta;
    subscribe(listener: () => void): () => void;
  };

  export type LocalSource<T> = BaseSource<T> & {
    commit(): Promise<void>;
    goTo(page: number): Promise<void>;
    goToLast(): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    reset(): Promise<void>;
    restore(state: Partial<SourceQuery>): Promise<void>;
    search(query: string): void;
    searchNow(query: string): Promise<void>;
    setData(data: readonly T[]): Promise<void>;
    setFilter(filter?: Predicate<T>): Promise<void>;
    setLimit(limit: number): Promise<void>;
    setSort(sort?: Sorter<T>): Promise<void>;
    toQuery(): SourceQuery;
    update(patch: Partial<SourceQuery & { filter?: Predicate<T>; sort?: Sorter<T> }>): Promise<void>;
  };

  export type RemoteSource<T, TFilter = unknown, TSort = unknown> = BaseSource<T> & {
    commit(): Promise<void>;
    goTo(page: number): Promise<void>;
    goToLast(): Promise<void>;
    next(): Promise<void>;
    optimisticUpdate(
      mutator: (current: readonly T[]) => readonly T[],
      options?: { total?: number },
    ): () => void;
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

  /** Simplified ComputedSignal shape (from @vielzeug/ripple) for signal adapter return types. */
  export interface ComputedSignal<T> {
    readonly value: T;
    dispose(): void;
  }

  export function createLocalSource<T>(
    initialData: readonly T[],
    cfg?: {
      debounceMs?: number;
      filter?: Predicate<T>;
      limit?: number;
      searchFn?: (items: readonly T[], query: string) => readonly T[];
      sort?: Sorter<T>;
    },
  ): LocalSource<T>;

  export function createRemoteSource<T, TFilter = unknown, TSort = unknown>(cfg: {
    autoFetch?: boolean;
    debounceMs?: number;
    fetch: (
      q: { filter?: TFilter; limit: number; page: number; search?: string; sort?: TSort },
      signal: AbortSignal,
    ) => Promise<{ items: readonly T[]; total: number }>;
    filter?: TFilter;
    limit?: number;
    queryKey?: (q: { filter?: TFilter; limit: number; page: number; search?: string; sort?: TSort }) => string;
    sort?: TSort;
  }): RemoteSource<T, TFilter, TSort>;

  export function createCursorSource<T, TCursor = string>(cfg: {
    autoFetch?: boolean;
    debounceMs?: number;
    fetch: (
      q: { after?: TCursor; before?: TCursor; limit: number; search?: string },
      signal: AbortSignal,
    ) => Promise<{ items: readonly T[]; nextCursor?: TCursor; prevCursor?: TCursor; total?: number }>;
    limit?: number;
    queryKey?: (q: { after?: TCursor; before?: TCursor; limit: number; search?: string }) => string;
  }): CursorSource<T>;

  export function createInfiniteSource<T>(cfg: {
    autoFetch?: boolean;
    debounceMs?: number;
    fetch: (
      q: { limit: number; page: number; search?: string },
      signal: AbortSignal,
    ) => Promise<{ items: readonly T[]; total: number }>;
    limit?: number;
  }): InfiniteSource<T>;

  export function toSignals<T>(source: BaseSource<T>): {
    current: ComputedSignal<readonly T[]>;
    dispose: () => void;
    meta: ComputedSignal<SourceMeta>;
  };

  export function toCursorSignals<T>(source: CursorSource<T>): {
    current: ComputedSignal<readonly T[]>;
    dispose: () => void;
    meta: ComputedSignal<CursorMeta>;
  };

  export function toInfiniteSignals<T>(source: InfiniteSource<T>): {
    all: ComputedSignal<readonly T[]>;
    dispose: () => void;
    meta: ComputedSignal<InfiniteMeta>;
  };

  export function encodeQuery<TFilter = unknown, TSort = unknown>(
    query: SourceQuery | RemoteSourceQuery<TFilter, TSort>,
  ): QueryParams;

  export function decodeQuery<TFilter = unknown, TSort = unknown>(
    params: QueryParamsInput,
    options?: { defaultLimit?: number; strict?: boolean },
  ): Partial<RemoteSourceQuery<TFilter, TSort>>;

  export function and<T>(...predicates: Predicate<T>[]): Predicate<T>;
  export function or<T>(...predicates: Predicate<T>[]): Predicate<T>;
  export function not<T>(predicate: Predicate<T>): Predicate<T>;

  export function filterContains<T>(
    getValue: (item: T) => string | null | undefined,
    query: string,
    caseSensitive?: boolean,
  ): Predicate<T>;
  export function filterEquals<T, V>(getValue: (item: T) => V, expected: V): Predicate<T>;
  export function filterRange<T>(
    getValue: (item: T) => number,
    bounds: Readonly<{ min?: number; max?: number }>,
  ): Predicate<T>;
  export function sortBy<T, V extends number | string | Date>(
    getValue: (item: T) => V,
    direction?: 'asc' | 'desc',
  ): Sorter<T>;
}
`;
