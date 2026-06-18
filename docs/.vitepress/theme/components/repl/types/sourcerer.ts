export const sourcererTypes = `
declare module '/sourcerer' {
  export type QueryParamsInput = Record<string, string | string[] | undefined>;
  export type QueryParams = Record<string, string>;

  export type Predicate<T> = (value: T, index: number, array: readonly T[]) => boolean;
  export type Sorter<T> = (a: T, b: T) => number;

  export type SearchOptions = Readonly<{ immediate?: boolean }>;

  export type SourceQuery = Readonly<{
    limit: number;
    page: number;
    search?: string;
  }>;

  export type LocalSourceQuery<T> = Partial<{
    filter: Predicate<T> | undefined;
    limit: number;
    page: number;
    search: string;
    sort: Sorter<T> | undefined;
  }>;

  export type RemoteSourceQuery<TFilter = unknown, TSort = unknown> = Readonly<{
    filter?: TFilter;
    limit: number;
    page: number;
    search?: string;
    sort?: TSort;
  }>;

  export type CursorSourceQuery<TCursor = string> = Readonly<{
    after?: TCursor;
    before?: TCursor;
    limit: number;
    search?: string;
  }>;

  export type InfiniteSourceQuery = Readonly<{
    limit: number;
    page: number;
    search?: string;
  }>;

  export class SourceError extends Error {
    readonly name: 'SourceError';
    readonly attempt: number;
    readonly context: Record<string, unknown> | undefined;
  }

  export class SourceTimeoutError extends SourceError {
    readonly name: 'SourceTimeoutError';
    readonly timeoutMs: number;
  }

  export class SourceDisposedError extends SourceError {
    readonly name: 'SourceDisposedError';
  }

  export type SourceMeta = Readonly<{
    error: SourceError | null;
    isLoading: boolean;
    isSearchPending: boolean;
    pageCount: number;
    pageNumber: number;
    pageSize: number;
    totalItems: number;
  }>;

  export type CursorMeta = Readonly<{
    error: SourceError | null;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    isLoading: boolean;
    isSearchPending: boolean;
    pageSize: number;
    totalItems: number;
  }>;

  export type InfiniteMeta = Readonly<{
    error: SourceError | null;
    hasMore: boolean;
    isLoading: boolean;
    isLoadingMore: boolean;
    isSearchPending: boolean;
    loadedPages: number;
    pageSize: number;
    totalItems: number;
  }>;

  export type SourceState<T> =
    | { readonly status: 'loading' }
    | { readonly error: SourceError; readonly status: 'error' }
    | { readonly items: readonly T[]; readonly status: 'success' };

  export type ReactiveSource<T, TMeta> = {
    readonly current: readonly T[];
    readonly disposalSignal: AbortSignal;
    dispose(): void;
    readonly disposed: boolean;
    readonly meta: TMeta;
    subscribe(listener: () => void): () => void;
    [Symbol.dispose](): void;
  };

  export type MergedSource<T> = {
    readonly current: readonly T[];
    readonly disposalSignal: AbortSignal;
    dispose(): void;
    readonly disposed: boolean;
    subscribe(listener: () => void): () => void;
    [Symbol.dispose](): void;
  };

  export type LocalSource<T> = ReactiveSource<T, SourceMeta> & {
    flush(): Promise<void>;
    goTo(page: number): Promise<void>;
    goToLast(): Promise<void>;
    next(): Promise<void>;
    patch(changes: LocalSourceQuery<T>): Promise<void>;
    prev(): Promise<void>;
    ready(timeoutMs?: number): Promise<void>;
    reset(): Promise<void>;
    search(query: string, opts?: SearchOptions): void | Promise<void>;
    setData(data: readonly T[]): Promise<void>;
    setFilter(filter?: Predicate<T>): Promise<void>;
    setLimit(limit: number): Promise<void>;
    setSort(sort?: Sorter<T>): Promise<void>;
    toQuery(): SourceQuery;
  };

  export type RemoteSource<T, TFilter = unknown, TSort = unknown> = ReactiveSource<T, SourceMeta> & {
    flush(): Promise<void>;
    goTo(page: number): Promise<void>;
    goToLast(): Promise<void>;
    next(): Promise<void>;
    optimisticUpdate(
      mutator: (current: readonly T[]) => readonly T[],
      options?: { total?: number },
    ): () => void;
    prev(): Promise<void>;
    ready(timeoutMs?: number): Promise<void>;
    refresh(): Promise<void>;
    reset(): Promise<void>;
    search(query: string, opts?: SearchOptions): void | Promise<void>;
    setFilter(filter?: TFilter): Promise<void>;
    setLimit(limit: number): Promise<void>;
    setSort(sort?: TSort): Promise<void>;
    toQuery(): RemoteSourceQuery<TFilter, TSort>;
  };

  export type CursorSource<T, TCursor = string> = ReactiveSource<T, CursorMeta> & {
    flush(): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    ready(timeoutMs?: number): Promise<void>;
    refresh(): Promise<void>;
    reset(): Promise<void>;
    search(query: string, opts?: SearchOptions): void | Promise<void>;
    setLimit(limit: number): Promise<void>;
    toQuery(): CursorSourceQuery<TCursor>;
  };

  export type InfiniteSource<T> = ReactiveSource<T, InfiniteMeta> & {
    flush(): Promise<void>;
    loadMore(): Promise<void>;
    ready(timeoutMs?: number): Promise<void>;
    reset(): Promise<void>;
    search(query: string, opts?: SearchOptions): void | Promise<void>;
    setLimit(limit: number): Promise<void>;
    toQuery(): InfiniteSourceQuery;
  };

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
      q: RemoteSourceQuery<TFilter, TSort>,
      signal: AbortSignal,
    ) => Promise<{ items: readonly T[]; total: number }>;
    filter?: TFilter;
    limit?: number;
    queryKey?: (q: RemoteSourceQuery<TFilter, TSort>) => string;
    refreshInterval?: number;
    retry?: { attempts?: number; delay?: (attempt: number) => number };
    sort?: TSort;
  }): RemoteSource<T, TFilter, TSort>;

  export function createCursorSource<T, TCursor = string>(cfg: {
    autoFetch?: boolean;
    debounceMs?: number;
    fetch: (
      q: CursorSourceQuery<TCursor>,
      signal: AbortSignal,
    ) => Promise<{ items: readonly T[]; nextCursor?: TCursor; prevCursor?: TCursor; total?: number }>;
    limit?: number;
    queryKey?: (q: CursorSourceQuery<TCursor>) => string;
  }): CursorSource<T, TCursor>;

  export function createInfiniteSource<T>(cfg: {
    autoFetch?: boolean;
    debounceMs?: number;
    fetch: (
      q: InfiniteSourceQuery,
      signal: AbortSignal,
    ) => Promise<{ items: readonly T[]; total: number }>;
    limit?: number;
    queryKey?: (q: InfiniteSourceQuery) => string;
  }): InfiniteSource<T>;

  export function deriveSource<T, U>(
    source: ReactiveSource<T, unknown>,
    transform: (items: readonly T[]) => readonly U[],
  ): ReactiveSource<U, unknown>;

  export function mergeSource<T>(
    sources: readonly ReactiveSource<T, unknown>[],
    combine: (snapshots: ReadonlyArray<{ current: readonly T[] }>) => readonly T[],
  ): MergedSource<T>;

  export function withDataSource<T, TMeta>(
    source: ReactiveSource<T, TMeta>,
    fn: (snapshot: { readonly current: readonly T[]; readonly meta: TMeta }) => void,
  ): () => void;

  export function applyQuery<TChanges extends Record<string, unknown>>(
    source: { patch(changes: Partial<TChanges>): Promise<void> },
    changes: Partial<TChanges>,
  ): Promise<void>;

  export function applyLocalQuery<T>(
    source: LocalSource<T>,
    changes: LocalSourceQuery<T>,
  ): Promise<void>;

  export function applyRemoteQuery<T, TFilter, TSort>(
    source: RemoteSource<T, TFilter, TSort>,
    changes: Partial<RemoteSourceQuery<TFilter, TSort>>,
  ): Promise<void>;

  export function applyCursorQuery<TCursor>(
    source: { patch(changes: Partial<Pick<CursorSourceQuery<TCursor>, 'limit' | 'search'>>): Promise<void> },
    changes: Partial<Pick<CursorSourceQuery<TCursor>, 'limit' | 'search'>>,
  ): Promise<void>;

  export function applyInfiniteQuery(
    source: { patch(changes: Partial<Pick<InfiniteSourceQuery, 'limit' | 'search'>>): Promise<void> },
    changes: Partial<Pick<InfiniteSourceQuery, 'limit' | 'search'>>,
  ): Promise<void>;

  export function sourceState<T>(source: {
    readonly current: readonly T[];
    readonly meta: { readonly error: SourceError | null; readonly isLoading: boolean; readonly isSearchPending?: boolean };
  }): SourceState<T>;

  export function itemRange(meta: Readonly<{
    pageNumber: number;
    pageSize: number;
    totalItems: number;
  }>): { end: number; start: number };

  export function prefetchSource<T, TFilter = unknown, TSort = unknown>(
    cfg: Parameters<typeof createRemoteSource<T, TFilter, TSort>>[0],
  ): Promise<{ items: readonly T[]; page?: number; search?: string; total: number }>;

  export function composeFetch<TQuery, TResult>(
    base: (q: TQuery, signal: AbortSignal) => Promise<TResult>,
    ...middlewares: Array<(q: TQuery, signal: AbortSignal, next: (q: TQuery, signal: AbortSignal) => Promise<TResult>) => Promise<TResult>>
  ): (q: TQuery, signal: AbortSignal) => Promise<TResult>;

  export function encodeQuery<TFilter = unknown, TSort = unknown>(
    query: SourceQuery | RemoteSourceQuery<TFilter, TSort>,
  ): QueryParams;

  export function decodeQuery<TFilter = unknown, TSort = unknown>(
    params: QueryParamsInput | URLSearchParams,
    options?: { defaultLimit?: number; strict?: boolean },
  ): Partial<RemoteSourceQuery<TFilter, TSort>>;

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
