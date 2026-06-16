export const courierTypes = `
declare module '/courier' {
  export type ResponseType = 'auto' | 'json' | 'text' | 'blob' | 'arrayBuffer' | 'raw';

  export type TransportOptions = {
    baseUrl?: string;
    fetch?: typeof globalThis.fetch;
    headers?: Record<string, string>;
    timeout?: number;
  };

  export type FetchContext = {
    headers: Record<string, string>;
    init: Omit<RequestInit, 'headers'>;
    url: string;
    withHeaders(updates: Record<string, string>): FetchContext;
  };

  export type Params = Record<string, string | number | boolean | null | undefined>;

  export type HttpRequestConfig<P extends string = string> = {
    body?: unknown;
    dedupe?: boolean;
    dedupeKey?: unknown;
    fetchInit?: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>;
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean>;
    query?: Params;
    responseType?: ResponseType;
    schema?: { parse(data: unknown): unknown };
    signal?: AbortSignal;
    timeout?: number;
  };

  export type Interceptor = (
    ctx: FetchContext,
    next: (ctx: FetchContext) => Promise<Response>
  ) => Promise<Response>;

  export interface ApiClient {
    [Symbol.dispose](): void;
    cancelAll(): void;
    delete<T = unknown, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>): Promise<T>;
    readonly disposalSignal: AbortSignal;
    dispose(): void;
    readonly disposed: boolean;
    get<T = unknown, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>): Promise<T>;
    getHeaders(): Readonly<Record<string, string>>;
    headers(updates: Record<string, string | undefined>): void;
    patch<T = unknown, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>): Promise<T>;
    post<T = unknown, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>): Promise<T>;
    put<T = unknown, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>): Promise<T>;
    request<T = unknown, P extends string = string>(method: string, url: P, config?: HttpRequestConfig<P>): Promise<T>;
    use(interceptor: Interceptor): () => void;
  }

  export function createApi(opts?: TransportOptions): ApiClient;

  export type QueryKeyAtom = string | number | boolean | null | { readonly [k: string]: string | number | boolean | null };
  export type QueryKey = readonly [QueryKeyAtom, ...QueryKeyAtom[]];

  export type Unsubscribe = () => void;

  export interface SyncStore<T> {
    peek(): T;
    subscribe(onStoreChange: () => void): Unsubscribe;
  }

  export type RetryOptions = {
    delay?: number | ((attempt: number) => number);
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    /** Total attempts including the first. \`1\` = single try, no retries. Defaults to \`1\`. */
    times?: number;
  };

  export type QueryFnContext = {
    key: QueryKey;
    signal: AbortSignal;
  };

  export type AsyncState<T = unknown> =
    | { readonly data: undefined; readonly error: null; readonly isFetching: false; readonly status: 'idle'; readonly updatedAt: undefined }
    | { readonly data: undefined; readonly error: null; readonly isFetching: true; readonly status: 'pending'; readonly updatedAt: number | undefined }
    | { readonly data: T; readonly error: null; readonly isFetching: boolean; readonly status: 'success'; readonly updatedAt: number }
    | { readonly data: T | undefined; readonly error: Error; readonly isFetching: boolean; readonly status: 'error'; readonly updatedAt: number };

  export type QueryState<T = unknown> = AsyncState<T>;
  export type MutationState<TData = unknown> = AsyncState<TData>;

  export type QueryClientOptions = RetryOptions & {
    gcTime?: number;
    staleTime?: number;
  };

  export type QueryOptions<T> = RetryOptions & {
    enabled?: boolean;
    fn: (ctx: QueryFnContext) => Promise<T>;
    gcTime?: number;
    /** Pre-seed the cache as a successful entry when no data exists. Subject to normal staleTime checks. */
    initialData?: T | (() => T | undefined);
    key: QueryKey;
    staleTime?: number;
  };

  export type ObserveOptions<T, S = T> = QueryOptions<T> & {
    /** When \`false\`, no background fetch is triggered. Defaults to \`true\`. */
    fetch?: boolean;
    /** Temporary value shown while a fetch is in-flight; does not affect cache state. */
    placeholderData?: S | (() => S | undefined);
    /** Transform cached data before delivery to store subscribers. \`S\` defaults to \`T\`. */
    select?: (data: T | undefined) => S | undefined;
  };

  export interface QueryClient {
    [Symbol.dispose](): void;
    cancel(key: QueryKey): void;
    cancelAll(): void;
    clear(): void;
    dispose(): void;
    readonly disposalSignal: AbortSignal;
    readonly disposed: boolean;
    /** Always throws on error. */
    fetch<T>(options: QueryOptions<T>): Promise<T>;
    fetchMany<T = unknown>(queries: QueryOptions<T>[]): Promise<T[]>;
    get<T>(key: QueryKey): T | undefined;
    getState<T>(key: QueryKey): QueryState<T> | null;
    invalidate(key: QueryKey): void;
    keys(): QueryKey[];
    /** Return a SyncStore and trigger a background fetch if stale. Errors surface via \`store.peek().status === 'error'\`. */
    observe<T = unknown, S = T>(options: ObserveOptions<T, S>): SyncStore<QueryState<S>>;
    /** Observe multiple keys as one combined store; updates on any key change. */
    observeMany<T = unknown>(keys: QueryKey[]): SyncStore<QueryState<T>[]>;
    refetchStale(): void;
    set<T>(key: QueryKey, data: T, opts?: { gcTime?: number; updatedAt?: number }): void;
    set<T>(key: QueryKey, updater: (old: T | undefined) => T, opts?: { gcTime?: number; updatedAt?: number }): void;
    readonly size: number;
    /** Read-through store for one key; no fetch triggered. */
    watchKey<T = unknown>(key: QueryKey): SyncStore<QueryState<T>>;
  }

  export function createQuery(opts?: QueryClientOptions): QueryClient;

  export type MutationFn<TData, TVariables = void> = (input: TVariables, signal: AbortSignal) => Promise<TData>;

  export type SettledResult<TData, TVariables> =
    | { readonly data: TData; readonly status: 'success'; readonly variables: TVariables }
    | { readonly error: Error; readonly status: 'error'; readonly variables: TVariables }
    | { readonly status: 'aborted'; readonly variables: TVariables };

  export type MutationOptions<TData = unknown, TVariables = void> = RetryOptions & {
    onCallbackError?: (error: Error) => void;
    onError?: (error: Error, variables: TVariables) => void | Promise<void>;
    /** Called after every run (success, error, abort). Switch on \`result.status\` for exhaustive handling. */
    onSettled?: (result: SettledResult<TData, TVariables>) => void | Promise<void>;
    onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  };

  export type CourierMutationOptions<TData = unknown, TVariables = void> = MutationOptions<TData, TVariables> & {
    /** Keys to invalidate in the shared query cache after a successful run. */
    invalidates?: QueryKey[];
    /** Seed one or more cache entries with transformed mutation data after a successful run. */
    sets?: (data: TData, variables: TVariables) => [QueryKey, unknown] | Array<[QueryKey, unknown]>;
  };

  export interface Mutation<TData, TVariables = void> {
    [Symbol.dispose](): void;
    cancel(): Promise<void>;
    dispose(): void;
    readonly disposed: boolean;
    getState(): MutationState<TData>;
    mutate(variables: TVariables, callOpts?: { signal?: AbortSignal }): Promise<TData>;
    reset(): void;
    /** Stable \`SyncStore\` for framework integrations. Use \`mutation.store.subscribe\` + \`mutation.store.peek()\`. */
    readonly store: SyncStore<MutationState<TData>>;
  }

  export function createMutation<TData, TVariables = void>(
    mutationFn: MutationFn<TData, TVariables>,
    opts?: MutationOptions<TData, TVariables>
  ): Mutation<TData, TVariables>;

  export type StreamRequestConfig<P extends string = string> = {
    body?: unknown;
    fetchInit?: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>;
    headers?: Record<string, string>;
    method?: string;
    params?: Record<string, string | number | boolean>;
    query?: Params;
    signal?: AbortSignal;
    timeout?: number;
  };

  export type ReconnectOptions = {
    delay?: number | ((attempt: number) => number);
    /** Total reconnect attempts after the first failure. Defaults to \`5\`. */
    times?: number;
  };

  export type ReadableConfig<P extends string = string> = StreamRequestConfig<P> & {
    /** Called when the reconnect budget is exhausted or a non-retriable error occurs. */
    onError?: (error: Error) => void;
    parse?: 'ndjson' | 'text';
    /** Auto-reconnect on connection loss. \`true\` uses defaults (5 attempts). */
    reconnect?: boolean | ReconnectOptions;
  };

  export type SseOptions<P extends string = string> = StreamRequestConfig<P> & {
    /** Called when reconnect budget is exhausted. Not called on \`dispose()\`. */
    onError?: (error: Error) => void;
    /** Auto-reconnect with exponential backoff. \`true\` uses defaults (5 attempts). */
    reconnect?: boolean | ReconnectOptions;
  };

  export type SseStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

  export type SseSource<TEvents extends Record<string, unknown> = Record<string, string>> = {
    readonly closed: boolean;
    readonly status: SseStatus;
    [Symbol.dispose](): void;
    dispose(): void;
    on<K extends keyof TEvents & string>(event: K, handler: (data: TEvents[K]) => void): () => void;
  };

  export interface StreamClient {
    [Symbol.dispose](): void;
    cancelAll(): void;
    readonly disposalSignal: AbortSignal;
    dispose(): void;
    readonly disposed: boolean;
    getHeaders(): Readonly<Record<string, string>>;
    headers(updates: Record<string, string | undefined>): void;
    readable<T = string, P extends string = string>(
      url: P,
      config?: ReadableConfig<P>
    ): AsyncGenerator<T>;
    sse<TEvents extends Record<string, unknown> = Record<string, string>, P extends string = string>(
      url: P,
      opts?: SseOptions<P>
    ): SseSource<TEvents>;
    use(interceptor: Interceptor): () => void;
  }

  export function createStream(opts?: TransportOptions): StreamClient;

  export type CourierOptions = TransportOptions & {
    mutationDefaults?: MutationOptions;
    query?: QueryClientOptions;
  };

  export interface Courier {
    [Symbol.dispose](): void;
    api: ApiClient;
    cancelAll(): void;
    readonly disposalSignal: AbortSignal;
    dispose(): void;
    readonly disposed: boolean;
    headers(updates: Record<string, string | undefined>): void;
    /** Accepts \`invalidates\` and \`sets\` cache shorthands in addition to \`MutationOptions\`. */
    mutation<TData, TVariables = void>(
      fn: MutationFn<TData, TVariables>,
      opts?: CourierMutationOptions<TData, TVariables>
    ): Mutation<TData, TVariables>;
    query: QueryClient;
    stream: StreamClient;
    use(interceptor: Interceptor): () => void;
  }

  export function createCourier(opts?: CourierOptions): Courier;

  /** Bind qc.refetchStale() to visibilitychange and window online events. Pass \`opts.signal\` (e.g. \`qc.disposalSignal\`) to auto-remove listeners on disposal. Returns unbind fn. */
  export function bindRefetch(qc: { refetchStale(): void }, opts?: { signal?: AbortSignal }): () => void;

  export type BatcherOptions<K, V> =
    | {
        maxSize?: number;
        resolve: (keys: K[]) => Promise<V[]>;
        window?: number;
      }
    | {
        maxSize?: number;
        /** Per-key error isolation — each \`load()\` fulfills or rejects independently. */
        resolveSettled: (keys: K[]) => Promise<PromiseSettledResult<V>[]>;
        window?: number;
      };

  export interface Batcher<K, V> {
    [Symbol.dispose](): void;
    dispose(): void;
    readonly disposed: boolean;
    load(key: K): Promise<V>;
  }

  export function createBatcher<K, V>(opts: BatcherOptions<K, V>): Batcher<K, V>;

  /** Inject \`Authorization: Bearer <token>\` before every request. */
  export function withBearerAuth(token: string | (() => string | Promise<string>)): Interceptor;

  /** Add a unique request ID header (default: \`x-request-id\`). */
  export function withRequestId(opts?: { generate?: () => string; header?: string }): Interceptor;

  /** Log method, URL, status, and duration via \`console.debug\` (or a custom logger). */
  export function withLogging(opts?: {
    logger?: (msg: string, meta: { duration: number; method: string; status: number; url: string }) => void;
  }): Interceptor;

  export interface PersistStorage {
    getItem(key: string): Promise<string | null> | string | null;
    setItem(key: string, value: string): Promise<void> | void;
  }

  export type PersistOptions = {
    /** Keys to persist/hydrate: explicit \`QueryKey[]\` list or predicate function. */
    keys: QueryKey[] | ((key: QueryKey) => boolean);
    maxAge?: number;
    onError?: (err: unknown, key: QueryKey) => void;
    prefix?: string;
    storage: PersistStorage;
  };

  export function persistQueryCache(qc: QueryClient, opts: PersistOptions): () => void;
  export function hydrateQueryCache(qc: QueryClient, opts: PersistOptions): Promise<void>;

  export class CourierError extends Error {
    readonly name: 'CourierError';
    static is(err: unknown): err is CourierError;
  }

  export class HttpError extends CourierError {
    readonly name: 'HttpError';
    readonly url: string;
    readonly method: string;
    readonly status: number;
    readonly data: unknown;
    readonly headers: Headers;
    static is(err: unknown, status?: number): err is HttpError;
    static fromResponse(response: Response, body: unknown, method: string, url: string): HttpError;
  }

  export class NetworkError extends CourierError {
    readonly name: 'NetworkError';
    readonly url: string;
    readonly method: string;
  }

  export class TimeoutError extends CourierError {
    readonly name: 'TimeoutError';
    readonly url: string;
    readonly method: string;
  }

  export class AbortError extends CourierError {
    readonly name: 'AbortError';
    readonly url: string;
    readonly method: string;
  }

  export class SchemaValidationError extends CourierError {
    readonly name: 'SchemaValidationError';
    readonly data: unknown;
    static is(err: unknown): err is SchemaValidationError;
  }
}
`;
