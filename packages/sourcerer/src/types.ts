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
  search: string;
}>;

export type RemoteSourceQuery<TFilter = unknown, TSort = unknown> = SourceQuery &
  Readonly<{
    filter?: TFilter;
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

/**
 * Event emitted by the `onFetch` callback after each fetch attempt settles.
 * Fires once per unique query key; joiners do not receive a duplicate event.
 */
export type FetchEvent<TQuery = unknown> = Readonly<{
  /** Total time in ms from issuing the request to receiving a response (includes retries). */
  durationMs: number;
  /** Error message when `status` is `'error'`. */
  error?: string;
  /** The query object that was fetched. */
  query: TQuery;
  status: 'error' | 'success';
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
 * if (state.status === 'error') return <Error message={state.message} />;
 * return <List items={state.items} />;
 * ```
 */
export type SourceState<T> =
  | { readonly items: readonly T[]; readonly status: 'data' }
  | { readonly message: string; readonly status: 'error' }
  | { readonly status: 'loading' };

// ── Reactive source interface (F1) ───────────────────────────────────────────

/**
 * Minimal observable interface shared by all source and derived source types.
 * Framework adapters (React hooks, Vue composables, Svelte stores) should target
 * this interface rather than concrete source types for maximum portability.
 *
 * @example
 * ```ts
 * function useSource<T, TMeta>(source: ReactiveSource<T, TMeta>) {
 *   const [state, setState] = useState({ current: source.current, meta: source.meta });
 *   useEffect(() => source.subscribe(() => setState({ current: source.current, meta: source.meta })), [source]);
 *   return state;
 * }
 * ```
 */
export type ReactiveSource<T, TMeta = SourceMeta> = {
  readonly current: readonly T[];
  dispose(): void;
  readonly meta: TMeta;
  subscribe(listener: () => void): () => void;
};

/**
 * Read-only reactive projection derived from a parent source.
 * Alias for `ReactiveSource<T, TMeta>` — returned by `deriveSource` and `mergeSource`.
 */
export type DerivedSource<T, TMeta = SourceMeta> = ReactiveSource<T, TMeta>;

// ── Page-based source types ──────────────────────────────────────────────────

/**
 * Shared navigation interface for all page-based source types (local and remote).
 * Captures the ~10 identical methods that were previously duplicated between
 * `Source` and `RemoteSource`.
 */
export type PageNavigator<T> = ReactiveSource<T, SourceMeta> & {
  flush(): Promise<void>;
  goTo(page: number): Promise<void>;
  goToLast(): Promise<void>;
  next(): Promise<void>;
  prev(): Promise<void>;
  reset(): Promise<void>;
  search(query: string): void;
  searchNow(query: string): Promise<void>;
  setLimit(limit: number): Promise<void>;
};

/**
 * Full interface for local (in-memory) page-based sources.
 * `hydrate(patch)` applies URL-decoded state preserving the page number.
 */
export type Source<T> = PageNavigator<T> & {
  hydrate(patch: Partial<SourceQuery & { filter?: Predicate<T>; sort?: Sorter<T> }>): Promise<void>;
  setFilter(filter?: Predicate<T>): Promise<void>;
  setSort(sort?: Sorter<T>): Promise<void>;
  toQuery(): SourceQuery;
};

export type LocalSource<T> = Source<T> & {
  setData(data: readonly T[]): Promise<void>;
};

/**
 * Full interface for remote page-based sources.
 * `hydrate(patch)` applies URL-decoded state preserving the page number.
 * `optimisticUpdate(mutator)` applies an immediate provisional state before a fetch settles.
 * Throws if a concurrent optimistic update is already pending.
 */
export type RemoteSource<T, TFilter = unknown, TSort = unknown> = PageNavigator<T> & {
  hydrate(patch: Partial<RemoteSourceQuery<TFilter, TSort>>): Promise<void>;
  /**
   * Applies an optimistic update immediately before a fetch settles.
   * Returns a rollback function. The optimistic state is automatically cleared on the next
   * successful fetch, or rolled back automatically on failure.
   *
   * @throws {Error} If an optimistic update is already active — roll back the previous one first.
   */
  optimisticUpdate(mutator: (current: readonly T[]) => readonly T[], options?: { total?: number }): () => void;
  ready(): Promise<void>;
  refresh(): Promise<void>;
  setFilter(filter?: TFilter): Promise<void>;
  setSort(sort?: TSort): Promise<void>;
  toQuery(): RemoteSourceQuery<TFilter, TSort>;
};

export type LocalConfig<T> = Readonly<{
  debounceMs?: number;
  filter?: Predicate<T>;
  limit?: number;
  /**
   * Custom search function. Default: case-insensitive JSON substring match.
   * Provide a domain-specific function for better relevance and performance on large datasets.
   */
  searchFn?: (items: readonly T[], query: string) => readonly T[];
  sort?: Sorter<T>;
}>;

export type RemoteConfig<T, TFilter = unknown, TSort = unknown> = Readonly<{
  /** Automatically fetch on construction. Default: `true`. */
  autoFetch?: boolean;
  /** Debounce delay in ms for `search()` calls. Default: `300`. */
  debounceMs?: number;
  fetch: (
    q: Readonly<{ filter?: TFilter; limit: number; page: number; search?: string; sort?: TSort }>,
    signal: AbortSignal,
  ) => Promise<Readonly<{ items: readonly T[]; total: number }>>;
  filter?: TFilter;
  limit?: number;
  /**
   * Called after each fetch attempt settles (success or failure).
   * Useful for logging, telemetry, and debugging without needing middleware.
   */
  onFetch?: (
    event: FetchEvent<Readonly<{ filter?: TFilter; limit: number; page: number; search?: string; sort?: TSort }>>,
  ) => void;
  queryKey?: (q: Readonly<{ filter?: TFilter; limit: number; page: number; search?: string; sort?: TSort }>) => string;
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

export type CursorSource<T, TCursor = string> = ReactiveSource<T, CursorMeta> & {
  flush(): Promise<void>;
  next(): Promise<void>;
  prev(): Promise<void>;
  ready(): Promise<void>;
  refresh(): Promise<void>;
  reset(): Promise<void>;
  search(query: string): void;
  searchNow(query: string): Promise<void>;
  setLimit(limit: number): Promise<void>;
  toQuery(): CursorSourceQuery<TCursor>;
};

export type CursorConfig<T, TCursor = string> = Readonly<{
  autoFetch?: boolean;
  debounceMs?: number;
  fetch: (
    q: Readonly<{ after?: TCursor; before?: TCursor; limit: number; search?: string }>,
    signal: AbortSignal,
  ) => Promise<Readonly<{ items: readonly T[]; nextCursor?: TCursor; prevCursor?: TCursor; total?: number }>>;
  limit?: number;
  /** Called after each fetch attempt settles. Useful for logging and telemetry. */
  onFetch?: (event: FetchEvent<CursorSourceQuery<TCursor>>) => void;
  queryKey?: (q: Readonly<{ after?: TCursor; before?: TCursor; limit: number; search?: string }>) => string;
  /** Automatically re-fetch at this interval in ms. Cancelled on `dispose()`. */
  refreshInterval?: number;
  retry?: RetryConfig;
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

export type InfiniteSource<T> = ReactiveSource<T, InfiniteMeta> & {
  flush(): Promise<void>;
  /** Appends the next page of results to `current`. No-op when `meta.hasMore` is false. */
  loadMore(): Promise<void>;
  ready(): Promise<void>;
  reset(): Promise<void>;
  search(query: string): void;
  searchNow(query: string): Promise<void>;
  setLimit(limit: number): Promise<void>;
  toQuery(): InfiniteSourceQuery;
};

export type InfiniteConfig<T> = Readonly<{
  autoFetch?: boolean;
  debounceMs?: number;
  fetch: (
    q: Readonly<{ limit: number; page: number; search?: string }>,
    signal: AbortSignal,
  ) => Promise<Readonly<{ items: readonly T[]; total: number }>>;
  limit?: number;
  /** Called after each fetch attempt settles. Useful for logging and telemetry. */
  onFetch?: (event: FetchEvent<InfiniteSourceQuery>) => void;
  /** Automatically re-fetch (reset to page 1) at this interval in ms. Cancelled on `dispose()`. */
  refreshInterval?: number;
  retry?: RetryConfig;
}>;
