export const courierTypes = `
declare module '/courier' {
  export type ResponseType = 'auto' | 'json' | 'text' | 'blob' | 'arrayBuffer' | 'raw';

  export type TransportOptions = {
    baseUrl?: string;
    fetch?: typeof globalThis.fetch;
    headers?: Record<string, string>;
    timeout?: number;
  };

  export type FetchContext = { init: RequestInit; url: string };

  export type ParamValue = string | number | boolean | null | readonly (string | number | boolean | null)[] | undefined;
  export type Params = Record<string, ParamValue>;

  export type CourierRequestConfig<P extends string = string> = {
    body?: unknown;
    /** Set to \`false\` to bypass in-flight deduplication for this request. */
    dedupe?: boolean;
    /** Explicit deduplication key for non-idempotent requests. */
    dedupeKey?: unknown;
    query?: Params;
    responseType?: ResponseType;
    timeout?: number;
    params?: Record<string, string | number | boolean>;
  };

  export type HttpRequestConfig<P extends string = string> = CourierRequestConfig<P> & {
    fetchInit?: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  };

  export type Interceptor = (
    ctx: FetchContext,
    next: (ctx: FetchContext) => Promise<Response>
  ) => Promise<Response>;

  export interface ApiClient {
    cancelAll(): void;
    delete<T = unknown, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>): Promise<T>;
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
    [Symbol.dispose](): void;
  }

  export function createApi(opts?: TransportOptions, sharedTransport?: TransportCore): ApiClient;

  export type QueryKey = readonly unknown[];
  export type Unsubscribe = () => void;

  export interface SyncStore<T> {
    peek(): T;
    subscribe(onStoreChange: () => void): Unsubscribe;
  }

  export type RetryOptions = {
    /** Maximum total attempts. \`1\` = single try, no retries. Defaults to \`1\`. */
    maxAttempts?: number;
    retryDelay?: number | ((attempt: number) => number);
    shouldRetry?: (error: unknown, attempt: number) => boolean;
  };

  export type QueryFnContext = {
    key: QueryKey;
    signal: AbortSignal;
  };

  export type AsyncState<T = unknown> =
    | { data: undefined; error: null; isFetching: false; status: 'idle'; updatedAt: undefined }
    | { data: T | undefined; error: null; isFetching: true; status: 'pending'; updatedAt: number | undefined }
    | { data: T; error: null; isFetching: boolean; status: 'success'; updatedAt: number }
    | { data: T | undefined; error: Error; isFetching: boolean; status: 'error'; updatedAt: number };

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
    initialData?: T | (() => T | undefined);
    key: QueryKey;
    staleTime?: number;
  };

  export type PrefetchOptions<T> = QueryOptions<T> & {
    throwOnError?: boolean;
  };

  export interface QueryClient {
    cancel(key: QueryKey): void;
    clear(): void;
    dispose(): void;
    readonly disposed: boolean;
    fetch<T>(options: QueryOptions<T>): Promise<T | undefined>;
    get<T>(key: QueryKey): T | undefined;
    getState<T>(key: QueryKey): QueryState<T> | null;
    invalidate(key: QueryKey): void;
    prefetch<T>(options: PrefetchOptions<T>): Promise<void>;
    refetchStale(): void;
    set<T>(key: QueryKey, data: T, opts?: { gcTime?: number; updatedAt?: number }): void;
    set<T>(key: QueryKey, updater: (old: T | undefined) => T, opts?: { gcTime?: number; updatedAt?: number }): void;
    subscribe<T = unknown, S = T>(
      key: QueryKey,
      listener: (state: QueryState<S>) => void,
      opts?: { placeholderData?: S | (() => S | undefined); select?: (data: T | undefined) => S | undefined }
    ): Unsubscribe;
    watch<T = unknown, S = T>(
      key: QueryKey,
      opts?: { placeholderData?: S | (() => S | undefined); select?: (data: T | undefined) => S | undefined }
    ): SyncStore<QueryState<S>>;
    [Symbol.dispose](): void;
  }

  export function createQuery(opts?: QueryClientOptions): QueryClient;

  export type MutationFn<TData, TVariables = void> = (input: TVariables, signal: AbortSignal) => Promise<TData>;

  export type MutationOptions<TData = unknown> = RetryOptions & {
    onCallbackError?: (error: Error) => void;
    onError?: (error: Error) => void | Promise<void>;
    onSettled?: (data: TData | undefined, error: Error | null) => void | Promise<void>;
    onSuccess?: (data: TData) => void | Promise<void>;
  };

  export interface Mutation<TData, TVariables = void> {
    cancel(): Promise<void>;
    getState(): MutationState<TData>;
    mutate(variables: TVariables, callOpts?: { signal?: AbortSignal }): Promise<TData>;
    reset(): void;
    subscribe(listener: (state: MutationState<TData>) => void): Unsubscribe;
    toStore(): SyncStore<MutationState<TData>>;
  }

  export function createMutation<TData, TVariables = void>(
    mutationFn: MutationFn<TData, TVariables>,
    opts?: MutationOptions<TData>
  ): Mutation<TData, TVariables>;

  export type StreamRequestConfig<P extends string = string> = {
    body?: unknown;
    headers?: Record<string, string>;
    method?: string;
    params?: Record<string, string | number | boolean>;
    query?: Params;
    signal?: AbortSignal;
    timeout?: number;
  };

  export type ReconnectOptions = {
    /** Total reconnect attempts after the first failure. Defaults to \`5\`. */
    maxAttempts?: number;
    retryDelay?: number | ((attempt: number) => number);
  };

  export type SseOptions<P extends string = string> = StreamRequestConfig<P> & {
    /** Called when reconnect budget is exhausted. Not called on \`close()\`. */
    onError?: (error: Error) => void;
    /** Auto-reconnect with exponential backoff. \`true\` uses defaults (5 attempts). */
    reconnect?: boolean | ReconnectOptions;
  };

  export type SseSource<TEvents extends Record<string, unknown> = Record<string, string>> = {
    close(): void;
    on<K extends keyof TEvents & string>(event: K, handler: (data: TEvents[K]) => void): () => void;
  };

  export interface StreamClient {
    cancelAll(): void;
    dispose(): void;
    readonly disposed: boolean;
    getHeaders(): Readonly<Record<string, string>>;
    headers(updates: Record<string, string | undefined>): void;
    readable<T = string, P extends string = string>(
      url: P,
      config?: StreamRequestConfig<P> & { parse?: 'ndjson' | 'text' }
    ): AsyncGenerator<T>;
    sse<TEvents extends Record<string, unknown> = Record<string, string>, P extends string = string>(
      url: P,
      opts?: SseOptions<P>
    ): SseSource<TEvents>;
    use(interceptor: Interceptor): () => void;
    [Symbol.dispose](): void;
  }

  export function createStream(opts?: TransportOptions, sharedTransport?: TransportCore): StreamClient;

  export interface TransportCore {
    readonly baseUrl: string;
    cancelAll(): void;
    dispatch(ctx: FetchContext): Promise<Response>;
    dispose(): void;
    readonly disposed: boolean;
    getHeaders(): Readonly<Record<string, string>>;
    headers(updates: Record<string, string | undefined>): void;
    mergeHeaders(perRequest?: Record<string, string>, extra?: Record<string, string>): Record<string, string>;
    readonly timeout: number;
    track(controller: AbortController): () => void;
    use(interceptor: Interceptor): () => void;
  }

  export function createTransportCore(opts?: TransportOptions): TransportCore;

  export type CourierOptions = TransportOptions & {
    mutationDefaults?: MutationOptions;
    query?: QueryClientOptions;
  };

  export interface Courier {
    api: ApiClient;
    cancelAll(): void;
    dispose(): void;
    readonly disposed: boolean;
    headers(updates: Record<string, string | undefined>): void;
    mutation<TData, TVariables = void>(
      fn: MutationFn<TData, TVariables>,
      opts?: MutationOptions<TData>
    ): Mutation<TData, TVariables>;
    query: QueryClient;
    stream: StreamClient;
    use(interceptor: Interceptor): () => void;
    [Symbol.dispose](): void;
  }

  export function createCourier(opts?: CourierOptions): Courier;

  /** Bind qc.refetchStale() to visibilitychange and window online events. Returns unbind fn. */
  export function bindRefetch(qc: { refetchStale(): void }): () => void;

  export type BatcherOptions<K, V> = {
    maxSize?: number;
    resolve: (keys: K[]) => Promise<V[]>;
    window?: number;
  };

  export interface Batcher<K, V> {
    dispose(): void;
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
    removeItem(key: string): Promise<void> | void;
    setItem(key: string, value: string): Promise<void> | void;
  }

  export type PersistOptions = {
    include?: (key: QueryKey) => boolean;
    maxAge?: number;
    onError?: (err: unknown, key: QueryKey) => void;
    prefix?: string;
    storage: PersistStorage;
  };

  export function persistQueryCache(
    qc: QueryClient,
    opts: PersistOptions & { keys: QueryKey[] }
  ): () => void;

  export function hydrateQueryCache(
    qc: QueryClient,
    opts: PersistOptions & { keys: QueryKey[] }
  ): Promise<void>;

  export class HttpError extends Error {
    readonly name: 'HttpError';
    readonly kind: 'abort' | 'http' | 'network' | 'timeout';
    readonly url: string;
    readonly method: string;
    readonly status?: number;
    readonly data?: unknown;
    readonly response?: Response;
    readonly headers?: Headers;
    readonly isTimeout: boolean;
    readonly isAborted: boolean;
    static is(err: unknown, status?: number): err is HttpError;
    static fromResponse(response: Response, method: string): Promise<HttpError>;
    static fromCause(cause: unknown, method: string, url: string): HttpError;
  }
}
`;
