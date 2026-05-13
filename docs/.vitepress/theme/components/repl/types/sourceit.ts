export const sourceitTypes = `
declare module '@vielzeug/sourceit' {
  export type QueryParamsInput = Record<string, string | string[] | undefined>;
  export type QueryParams = Record<string, string>;

  export type Predicate<T> = (value: T, index: number, array: readonly T[]) => boolean;
  export type Sorter<T> = (a: T, b: T) => number;

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
    setLimit(limit: number): void;
    setSort(sort?: Sorter<T>): void;
    snapshot(): SourceSnapshot;
    toQueryParams(): QueryParams;
    update(
      mutator: (ctx: {
        goTo(page: number): void;
        search(query: string): void;
        setData(data: readonly T[]): void;
        setFilter(filter?: Predicate<T>): void;
        setLimit(limit: number): void;
        setSort(sort?: Sorter<T>): void;
      }) => void
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
    setLimit(limit: number): void;
    setSort(sort?: S): void;
    snapshot(): RemoteSourceSnapshot<F, S>;
    toQueryParams(): QueryParams;
    update(
      mutator: (ctx: {
        goTo(page: number): void;
        search(query: string): void;
        setFilter(filter?: F): void;
        setLimit(limit: number): void;
        setSort(sort?: S): void;
      }) => void
    ): void;
  };

  export function createLocalSource<T>(
    initialData: readonly T[],
    cfg?: {
      debounceMs?: number;
      filter?: Predicate<T>;
      limit?: number;
      sort?: Sorter<T>;
    }
  ): LocalSource<T>;

  export function createRemoteSource<T, F = unknown, S = unknown>(cfg: {
    debounceMs?: number;
    fetch: (q: {
      filter?: F;
      limit: number;
      page: number;
      search?: string;
      sort?: S;
    }) => Promise<{ items: readonly T[]; total: number }>;
    initialFilter?: F;
    initialSort?: S;
    limit?: number;
  }): RemoteSource<T, F, S>;

  export function subscribeSelector<T, U>(
    source: BaseSource<T>,
    selector: (source: BaseSource<T>) => U,
    listener: (next: U, prev: U) => void,
    isEqual?: (a: U, b: U) => boolean
  ): () => void;

  export function decodeLocalQueryParams(params: QueryParamsInput, defaultLimit?: number): Partial<SourceSnapshot>;
  export function encodeLocalQueryParams(snapshot: SourceSnapshot): QueryParams;
  export function decodeRemoteQueryParams<F = unknown, S = unknown>(
    params: QueryParamsInput,
    defaultLimit?: number
  ): Partial<RemoteSourceSnapshot<F, S>>;
  export function decodeRemoteQueryParamsStrict<F = unknown, S = unknown>(
    params: QueryParamsInput,
    defaultLimit?: number
  ): Partial<RemoteSourceSnapshot<F, S>>;
  export function encodeRemoteQueryParams<F = unknown, S = unknown>(snapshot: RemoteSourceSnapshot<F, S>): QueryParams;

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
}
`;
