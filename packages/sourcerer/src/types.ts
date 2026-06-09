export type Predicate<T> = (value: T, index: number, array: readonly T[]) => boolean;
export type Sorter<T> = (a: T, b: T) => number;
export type QueryParamsInput = Record<string, string | string[] | undefined>;
export type QueryParams = Record<string, string>;

/** Configures automatic retry on fetch failure. */
export type RetryConfig = Readonly<{
  /** Number of retry attempts after the first failure. Default: 0 (no retries). */
  attempts?: number;
  /** Returns the delay in ms before the nth retry (1-indexed). Default: exponential backoff. */
  delay?: (attempt: number) => number;
}>;

export type SourceQuery = Readonly<{
  limit: number;
  page: number;
  /** Absent when no search is active. */
  search?: string;
}>;

export type RemoteFetchQuery<TFilter = unknown, TSort = unknown> = Readonly<{
  filter?: TFilter;
  limit: number;
  page: number;
  search?: string;
  sort?: TSort;
}>;

export type RemoteSourceQuery<TFilter = unknown, TSort = unknown> = RemoteFetchQuery<TFilter, TSort>;

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

/**
 * Structured error type for all data source failures.
 * Carries the original cause, the query that triggered the error, and the attempt number.
 *
 * @example
 * ```ts
 * if (source.meta.error) {
 *   console.error(source.meta.error.message, source.meta.error.query);
 * }
 * ```
 */
export class SourceTimeoutError extends Error {
  override readonly name = 'SourceTimeoutError';

  constructor(timeoutMs: number) {
    super(`Source.ready() timed out after ${timeoutMs}ms`);
  }
}

export class SourceError extends Error {
  override readonly name = 'SourceError';

  readonly #opts: {
    readonly attempt?: number;
    readonly cause?: unknown;
    readonly query?: unknown;
  };

  constructor(
    message: string,
    opts: {
      readonly attempt?: number;
      readonly cause?: unknown;
      readonly query?: unknown;
    } = {},
  ) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
    this.#opts = opts;
  }

  get attempt(): number {
    return this.#opts.attempt ?? 0;
  }

  /** The query that triggered the error. May contain user-supplied values (search terms, filters) — sanitise before logging in production. */
  get query(): unknown {
    return this.#opts.query;
  }
}

/**
 * Event emitted by the `onFetch` callback after each fetch attempt settles.
 * Carries the full `SourceError` on failure for rich diagnostics.
 */
export type FetchEvent<TQuery = unknown> = Readonly<{
  /** Total time in ms from issuing the request to receiving a response (includes retries). */
  durationMs: number;
  /** Structured error when `status` is `'error'`. */
  error?: SourceError;
  /** The query object that was fetched. */
  query: TQuery;
  status: 'error' | 'success';
}>;

/**
 * Metadata snapshot describing the current pagination and loading state of a source.
 * Use `itemRange(meta)` to compute display-level start/end item numbers.
 */
export type SourceMeta = Readonly<{
  /** Structured error from the most recent failed fetch. `null` when healthy. */
  error: SourceError | null;
  isLoading: boolean;
  isSearchPending: boolean;
  pageCount: number;
  pageNumber: number;
  pageSize: number;
  totalItems: number;
}>;

/**
 * A serializable point-in-time snapshot of a remote source's loaded state.
 * Safe to embed in HTML or pass over the network.
 */
export type SourceSnapshot<T> = Readonly<{
  items: readonly T[];
  page?: number;
  search?: string;
  total: number;
}>;

/**
 * Discriminated union describing the current state of any reactive source.
 * Use `sourceState(source)` to derive this without manual branching on meta fields.
 *
 * @example
 * ```ts
 * const state = sourceState(source);
 * if (state.status === 'loading') return <Spinner />;
 * if (state.status === 'error') return <Error message={state.error.message} />;
 * return <List items={state.items} />;
 * ```
 */
export type SourceState<T> =
  | { readonly error: SourceError; readonly status: 'error' }
  | { readonly items: readonly T[]; readonly status: 'success' }
  | { readonly status: 'loading' };

// ── Reactive source interface ─────────────────────────────────────────────────

/**
 * Minimal observable interface shared by all source and derived source types.
 * Framework adapters should target this interface for maximum portability.
 */
export type ReactiveSource<T, TMeta = SourceMeta> = {
  readonly current: readonly T[];
  dispose(): void;
  readonly meta: TMeta;
  subscribe(listener: () => void): () => void;
};

/**
 * Read-only reactive projection derived from a parent source.
 * Returned by `deriveSource()`.
 */
export type DerivedSource<T, TMeta = SourceMeta> = ReactiveSource<T, TMeta>;

/**
 * Read-only reactive view combining multiple sources.
 * Returned by `mergeSource()`. Has no `meta` because the parent sources may have different meta shapes.
 */
export type MergedSource<T> = {
  readonly current: readonly T[];
  dispose(): void;
  subscribe(listener: () => void): () => void;
};

// ── Page-based source types ───────────────────────────────────────────────────

/** Shared navigation interface for all page-based source types (local and remote). */
export type PageNavigator<T> = ReactiveSource<T, SourceMeta> & {
  flush(): Promise<void>;
  goTo(page: number): Promise<void>;
  goToLast(): Promise<void>;
  next(): Promise<void>;
  prev(): Promise<void>;
  /**
   * Resolves when the source is idle (no pending async computation).
   * Rejects with `SourceTimeoutError` after `timeout` ms if still busy.
   */
  ready(timeout?: number): Promise<void>;
  reset(): Promise<void>;
  search(query: string): void;
  searchNow(query: string): Promise<void>;
  setLimit(limit: number): Promise<void>;
};

/**
 * Full interface for local (in-memory) page-based sources.
 * `restoreQuery(patch)` applies URL-decoded state without resetting page.
 */
export type Source<T> = PageNavigator<T> & {
  restoreQuery(patch: Partial<SourceQuery & { filter?: Predicate<T>; sort?: Sorter<T> }>): Promise<void>;
  setFilter(filter?: Predicate<T>): Promise<void>;
  setSort(sort?: Sorter<T>): Promise<void>;
  toQuery(): SourceQuery;
};

export type LocalSource<T> = Source<T> & {
  setData(data: readonly T[]): Promise<void>;
};

/**
 * Full interface for remote page-based sources.
 * `optimisticUpdate(mutator)` throws if a concurrent update is already pending.
 */
export type RemoteSource<T, TFilter = unknown, TSort = unknown> = PageNavigator<T> & {
  /**
   * Applies an optimistic update immediately before a fetch settles.
   * Returns a rollback function. The optimistic state is automatically cleared
   * on the next successful fetch, or rolled back on failure.
   *
   * @throws {Error} If an optimistic update is already active.
   */
  optimisticUpdate(mutator: (current: readonly T[]) => readonly T[], options?: { total?: number }): () => void;
  ready(timeout?: number): Promise<void>;
  refresh(): Promise<void>;
  restoreQuery(patch: Partial<RemoteSourceQuery<TFilter, TSort>>): Promise<void>;
  setFilter(filter?: TFilter): Promise<void>;
  setSort(sort?: TSort): Promise<void>;
  toQuery(): RemoteSourceQuery<TFilter, TSort>;
};

// ── Config types ──────────────────────────────────────────────────────────────

export type LocalConfig<T> = Readonly<{
  debounceMs?: number;
  filter?: Predicate<T>;
  /**
   * Async filter applied after the sync `filter`, enabling Web Worker offloading
   * via `@vielzeug/familiar`. Sets `meta.isLoading` to `true` during computation.
   * The signal is aborted when a new computation supersedes this one.
   */
  filterAsync?: (items: readonly T[], signal: AbortSignal) => Promise<readonly T[]>;
  /** Initial data to populate the source. When provided, pass `[]` as the first arg of `createLocalSource`. */
  initialData?: readonly T[];
  limit?: number;
  /**
   * Custom search function. Default: case-insensitive JSON substring match.
   * Provide a domain-specific function for better relevance on large datasets.
   */
  searchFn?: (items: readonly T[], query: string) => readonly T[];
  sort?: Sorter<T>;
  /**
   * Async sort applied after the sync `sort`. Sets `meta.isLoading` to `true`
   * during computation, enabling Web Worker offloading.
   */
  sortAsync?: (items: readonly T[], signal: AbortSignal) => Promise<readonly T[]>;
}>;

export type RemoteConfig<T, TFilter = unknown, TSort = unknown> = Readonly<{
  /** Automatically fetch on construction. Default: `true`. */
  autoFetch?: boolean;
  /** Debounce delay in ms for `search()` calls. Default: `300`. */
  debounceMs?: number;
  fetch: (
    q: RemoteFetchQuery<TFilter, TSort>,
    signal: AbortSignal,
  ) => Promise<Readonly<{ items: readonly T[]; total: number }>>;
  filter?: TFilter;
  limit?: number;
  /**
   * Called after each fetch attempt settles (success or failure).
   * Useful for logging, telemetry, and debugging.
   */
  onFetch?: (event: FetchEvent<RemoteFetchQuery<TFilter, TSort>>) => void;
  queryKey?: (q: RemoteFetchQuery<TFilter, TSort>) => string;
  /**
   * Automatically re-fetch at this interval in ms. The timer is cancelled on `dispose()`.
   * Useful for live dashboards and real-time data displays.
   */
  refreshInterval?: number;
  retry?: RetryConfig;
  /**
   * Pre-populate the source with server-fetched data (SSR / prefetch).
   * The source starts in a loaded state — no initial loading flash.
   * Set `autoFetch: false` to suppress the background re-fetch when the snapshot is fresh.
   */
  snapshot?: SourceSnapshot<T>;
  sort?: TSort;
  /**
   * Skip re-fetching if the last successful fetch was within this many ms.
   * Returns cached data immediately. Combine with `refreshInterval` for
   * stale-while-revalidate behaviour.
   * Default: `0` (always re-fetch).
   */
  staleTime?: number;
}>;

// ── Cursor-based source types ─────────────────────────────────────────────────

export type CursorMeta = Readonly<{
  error: SourceError | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isLoading: boolean;
  isSearchPending: boolean;
  pageSize: number;
  totalItems: number;
}>;

export type CursorSource<T, TCursor = string> = ReactiveSource<T, CursorMeta> & {
  flush(): Promise<void>;
  next(): Promise<void>;
  prev(): Promise<void>;
  ready(timeout?: number): Promise<void>;
  refresh(): Promise<void>;
  reset(): Promise<void>;
  restoreQuery(patch: Partial<CursorSourceQuery<TCursor>>): Promise<void>;
  search(query: string): void;
  searchNow(query: string): Promise<void>;
  setLimit(limit: number): Promise<void>;
  toQuery(): CursorSourceQuery<TCursor>;
};

export type CursorConfig<T, TCursor = string> = Readonly<{
  autoFetch?: boolean;
  debounceMs?: number;
  fetch: (
    q: CursorSourceQuery<TCursor>,
    signal: AbortSignal,
  ) => Promise<Readonly<{ items: readonly T[]; nextCursor?: TCursor; prevCursor?: TCursor; total?: number }>>;
  limit?: number;
  /** Called after each fetch attempt settles. Useful for logging and telemetry. */
  onFetch?: (event: FetchEvent<CursorSourceQuery<TCursor>>) => void;
  queryKey?: (q: CursorSourceQuery<TCursor>) => string;
  /** Automatically re-fetch at this interval in ms. Cancelled on `dispose()`. */
  refreshInterval?: number;
  retry?: RetryConfig;
}>;

// ── Infinite (append) source types ───────────────────────────────────────────

export type InfiniteMeta = Readonly<{
  error: SourceError | null;
  hasMore: boolean;
  isLoading: boolean;
  /** `true` only during `loadMore()` fetches — distinct from the initial load. */
  isLoadingMore: boolean;
  isSearchPending: boolean;
  /** Number of pages appended so far. Resets to 0 on `reset()` or `search*()`. */
  loadedPages: number;
  pageSize: number;
  totalItems: number;
}>;

export type InfiniteSource<T> = ReactiveSource<T, InfiniteMeta> & {
  flush(): Promise<void>;
  /** Appends the next page of results to `current`. No-op when `meta.hasMore` is false. */
  loadMore(): Promise<void>;
  /**
   * Resolves when no fetch is in progress (including `loadMore` fetches).
   * Rejects after `timeout` ms if still loading.
   */
  ready(timeout?: number): Promise<void>;
  reset(): Promise<void>;
  search(query: string): void;
  searchNow(query: string): Promise<void>;
  setLimit(limit: number): Promise<void>;
  toQuery(): InfiniteSourceQuery;
};

export type InfiniteConfig<T> = Readonly<{
  autoFetch?: boolean;
  debounceMs?: number;
  fetch: (q: InfiniteSourceQuery, signal: AbortSignal) => Promise<Readonly<{ items: readonly T[]; total: number }>>;
  limit?: number;
  /** Called after each fetch attempt settles. Useful for logging and telemetry. */
  onFetch?: (event: FetchEvent<InfiniteSourceQuery>) => void;
  /** Custom cache key function. Used to deduplicate in-flight requests. Default: stable JSON stringify. */
  queryKey?: (q: InfiniteSourceQuery) => string;
  /** Automatically re-fetch (reset to page 1) at this interval in ms. Cancelled on `dispose()`. */
  refreshInterval?: number;
  retry?: RetryConfig;
}>;
