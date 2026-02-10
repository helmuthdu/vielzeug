import { retry } from '@vielzeug/toolkit';

export type QueryKey = readonly unknown[];

export type QueryStatus = 'idle' | 'pending' | 'success' | 'error';

export type QueryState<T = unknown> = {
  data: T | undefined;
  error: Error | null;
  status: QueryStatus;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  fetchedAt: number;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
};

export type QueryOptions<T> = {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  staleTime?: number;
  gcTime?: number;
  enabled?: boolean;
  retry?: number | false;
  retryDelay?: number | ((attempt: number) => number);
  onSuccess?: (data: T) => void;
  onError?: (err: Error) => void;
};

export type MutationOptions<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (err: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  retry?: number | false;
  retryDelay?: number | ((attempt: number) => number);
};

export type HttpRequestConfig = Omit<RequestInit, 'body'> & {
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  dedupe?: boolean;
};

export type HttpClientOptions = {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
  dedupe?: boolean;
  logger?: (level: 'info' | 'error', msg: string, meta?: unknown) => void;
};

const DEFAULT_STALE = 0;
const DEFAULT_GC = 5 * 60_000;
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY = 3;
const DEFAULT_DEDUPE = true;
const CONTENT_TYPE_JSON = 'application/json';
const HEADER_CONTENT_TYPE = 'content-type';

export class HttpError extends Error {
  readonly url: string;
  readonly method: string;
  readonly status?: number;
  readonly original?: unknown;
  constructor(msg: string, url: string, method: string, status?: number, original?: unknown) {
    super(msg);
    this.name = 'HttpError';
    this.url = url;
    this.method = method;
    this.status = status;
    this.original = original;
  }
}

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

function buildUrl(base: string, path: string, params?: Record<string, string | number | undefined>) {
  const baseClean = (base || '').replace(/\/+$/, '');
  const pathClean = path.replace(/^\/+/, '');
  const url = baseClean ? `${baseClean}/${pathClean}` : pathClean;
  if (!params) return url;
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
}

function isBodyInit(value: unknown): value is BodyInit {
  if (typeof FormData !== 'undefined' && value instanceof FormData) return true;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
  if (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams) return true;
  if (typeof value === 'string') return true;

  // Handle ArrayBuffer more safely across realms
  if (value instanceof ArrayBuffer) return true;
  // Check ArrayBuffer via prototype for cross-realm compatibility
  if (value && typeof value === 'object' && Object.prototype.toString.call(value) === '[object ArrayBuffer]') {
    return true;
  }
  // Check ArrayBufferView (typed arrays, DataView)
  return !!ArrayBuffer.isView?.(value);
}

/**
 * Stable JSON stringify that sorts object keys recursively
 */
function stableStringify(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value !== 'object') return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  // Sort object keys for stable stringification
  const keys = Object.keys(value).sort();
  const pairs = keys.map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * Safely serialize body for dedupe key generation
 * Handles FormData, Blob, ArrayBuffer, and other non-JSON-serializable types
 *
 * Note: FormData with the same key-values will be treated as an identical-acceptable tradeoff
 * since we can't inspect FormData contents without consuming it
 */
function serializeBodyForDedupeKey(body: unknown): string {
  if (body === undefined || body === null) {
    return 'null';
  }

  // Handle BodyInit types that aren't JSON-serializable
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    // All FormData instances get the same key - can't inspect without consuming
    // This means all FormData uploads will dedupe together
    return '[FormData]';
  }
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    // Include size and type for better deduplication
    return `[Blob:${body.size}:${body.type}]`;
  }
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
    // URLSearchParams.toString() preserves key-value pairs
    return `[URLSearchParams:${body.toString()}]`;
  }
  if (body instanceof ArrayBuffer) {
    return `[ArrayBuffer:${body.byteLength}]`;
  }
  if (ArrayBuffer.isView?.(body)) {
    return `[ArrayBufferView:${body.byteLength}]`;
  }
  if (typeof body === 'string') {
    return body;
  }

  // For plain objects/arrays, use stable stringify to handle property ordering
  if (typeof body === 'object') {
    try {
      // Use stable stringify for consistent ordering
      return stableStringify(body);
    } catch {
      // Fallback for circular references or other issues
      return '[Object]';
    }
  }

  // Primitive types
  try {
    return JSON.stringify(body);
  } catch {
    return '[Unknown]';
  }
}

function timeoutSignal(timeoutMs: number, external?: AbortSignal | null) {
  // If timeout is 0 or Infinity, don't set a timer
  if (timeoutMs === 0 || timeoutMs === Number.POSITIVE_INFINITY) {
    // Just use external signal if provided, otherwise return a signal that never aborts
    if (external) {
      return {
        clear: () => {},
        signal: external,
      };
    }
    // Return a signal that never aborts
    const controller = new AbortController();
    return {
      clear: () => {},
      signal: controller.signal,
    };
  }

  // Use modern AbortSignal.timeout if available (Node 17.3+, modern browsers)
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal && !external) {
    const signal = (AbortSignal as { timeout(ms: number): AbortSignal }).timeout(timeoutMs);
    return {
      clear: () => {}, // No cleanup needed for native timeout
      signal,
    };
  }

  // Fallback to manual timeout
  const controller = new AbortController();
  const onAbort = () => controller.abort();

  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener('abort', onAbort, { once: true });
  }

  const tid = setTimeout(() => controller.abort(), timeoutMs);

  return {
    clear: () => {
      clearTimeout(tid);
      if (external) external.removeEventListener('abort', onAbort);
    },
    signal: controller.signal,
  };
}

/**
 * Parse response based on content type
 */
async function parseResponse(res: Response): Promise<unknown> {
  if (res.status === 204) {
    return undefined;
  }

  const contentType = res.headers.get(HEADER_CONTENT_TYPE) ?? '';

  if (contentType.includes(CONTENT_TYPE_JSON)) {
    return await res.json();
  }

  if (contentType.startsWith('text/')) {
    return await res.text();
  }

  // Try blob if available, otherwise fallback to text
  try {
    return await res.blob();
  } catch {
    return await res.text();
  }
}

/**
 * Creates an HTTP client for making requests
 *
 * Pure HTTP operations without caching overhead. Perfect for simple requests
 * where you don't need query management features.
 *
 * @param opts - Client configuration options
 * @returns HTTP client with request methods (get, post, put, patch, delete, request)
 *
 * @example
 * ```typescript
 * const http = createHttpClient({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 5000,
 *   headers: { 'Authorization': 'Bearer token' }
 * });
 *
 * // Make requests
 * const user = await http.get<User>('/users/1');
 * const created = await http.post<User>('/users', {
 *   body: { name: 'Alice' }
 * });
 *
 * // Update headers dynamically
 * http.setHeaders({ 'Authorization': 'Bearer new-token' });
 * ```
 */
export function createHttpClient(opts: HttpClientOptions = {}) {
  const {
    baseUrl = '',
    headers: initialHeaders = {},
    timeout = DEFAULT_TIMEOUT,
    dedupe = DEFAULT_DEDUPE,
    logger,
  } = opts;

  let globalHeaders = { ...initialHeaders };
  const inFlight = new Map<string, Promise<unknown>>();

  function log(level: 'info' | 'error', msg: string, meta?: unknown) {
    if (logger) logger(level, msg, meta);
  }

  async function request<T>(method: string, url: string, config: HttpRequestConfig = {}) {
    const full = buildUrl(baseUrl, url, config.params);
    const m = (method || 'GET').toUpperCase();
    const { body, headers, dedupe: cfgDedupe, signal: extSignal, ...rest } = config;
    const shouldDedupe = cfgDedupe !== false && dedupe;

    // Use safe serialization for a dedupe key to handle FormData, Blob, etc.
    const dedupeKey = shouldDedupe
      ? JSON.stringify({
          body: serializeBodyForDedupeKey(body),
          full,
          m,
        })
      : '';

    if (shouldDedupe && inFlight.has(dedupeKey)) {
      return inFlight.get(dedupeKey)! as Promise<T>;
    }

    const { signal, clear } = timeoutSignal(timeout, extSignal ?? null);

    const init: RequestInit = {
      method: m,
      ...rest,
      headers: { ...globalHeaders, ...(headers as Record<string, string> | undefined) },
      signal,
    };

    if (body !== undefined && !isBodyInit(body)) {
      init.body = JSON.stringify(body);
      init.headers = { [HEADER_CONTENT_TYPE]: CONTENT_TYPE_JSON, ...(init.headers as Record<string, string>) };
    } else if (body !== undefined) {
      init.body = body as BodyInit;
    }

    const p = (async () => {
      const start = Date.now();
      try {
        const res = await fetch(full, init);
        const parsed = await parseResponse(res);

        log('info', `${m} ${full} - ${res.status} (${Date.now() - start}ms)`, { req: init, res: parsed });

        if (!res.ok) throw new HttpError('Non-OK response', full, m, res.status, parsed);
        return parsed as T;
      } catch (err) {
        log('error', `${m} ${full} - ERROR`, err);
        if (err instanceof HttpError) throw err;
        throw new HttpError(toError(err).message, full, m, undefined, err);
      } finally {
        clear();
        if (shouldDedupe) inFlight.delete(dedupeKey);
      }
    })();

    if (shouldDedupe) inFlight.set(dedupeKey, p);
    return p as Promise<T>;
  }

  return {
    delete: (url: string, cfg?: Omit<HttpRequestConfig, 'method'>) => request('DELETE', url, cfg),
    get: (url: string, cfg?: Omit<HttpRequestConfig, 'method'>) => request('GET', url, cfg),
    getHeaders: () => ({ ...globalHeaders }),
    patch: (url: string, cfg?: Omit<HttpRequestConfig, 'method'>) => request('PATCH', url, cfg),
    post: (url: string, cfg?: Omit<HttpRequestConfig, 'method'>) => request('POST', url, cfg),
    put: (url: string, cfg?: Omit<HttpRequestConfig, 'method'>) => request('PUT', url, cfg),
    request,
    setHeaders(next: Record<string, string | undefined>) {
      globalHeaders = Object.fromEntries(
        Object.entries({ ...globalHeaders, ...next }).filter(([, v]) => v !== undefined),
      ) as Record<string, string>;
    },
  };
}

/* ---------------------------
   Query client
   --------------------------- */

type CacheEntry<T = unknown> = {
  data?: T;
  status: QueryStatus;
  error: Error | null;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  fetchedAt: number;
  observers: Set<(state: QueryState<T>) => void>;
  promise: Promise<T> | null;
  abortController: AbortController | null;
  gcTimer?: ReturnType<typeof setTimeout> | null;
};

export type QueryClientOptions = {
  staleTime?: number;
  gcTime?: number;
  cache?: {
    staleTime?: number;
    gcTime?: number;
  };
  refetch?: {
    onFocus?: boolean;
    onReconnect?: boolean;
  };
};

/**
 * Creates a query client for managing cached queries
 *
 * Provides intelligent caching, request deduplication, and state management.
 * Works with any HTTP client or fetch function.
 *
 * @param opts - Query client configuration options
 * @returns Query client with caching methods
 *
 * @example
 * ```typescript
 * const queryClient = createQueryClient({
 *   cache: { staleTime: 5000, gcTime: 300000 }
 * });
 *
 * // Use with HTTP client
 * const http = createHttpClient({ baseUrl: 'https://api.example.com' });
 *
 * const user = await queryClient.fetch({
 *   queryKey: ['users', '1'],
 *   queryFn: () => http.get('/users/1'),
 *   staleTime: 5000
 * });
 *
 * // Or use with native fetch
 * const data = await queryClient.fetch({
 *   queryKey: ['data'],
 *   queryFn: () => fetch('/api/data').then(r => r.json())
 * });
 *
 * // Mutations
 * await queryClient.mutate({
 *   mutationFn: (vars) => http.post('/users', { body: vars }),
 *   onSuccess: () => queryClient.invalidate(['users'])
 * }, { name: 'Alice' });
 * ```
 */
export function createQueryClient(opts?: QueryClientOptions) {
  // Support both flat and nested options
  const staleTimeDefault = opts?.cache?.staleTime ?? opts?.staleTime ?? DEFAULT_STALE;
  const gcTimeDefault = opts?.cache?.gcTime ?? opts?.gcTime ?? DEFAULT_GC;

  const cache = new Map<string, CacheEntry>();
  // Store stringified original keys for consistent prefix matching
  // This avoids reference equality issues with nested objects
  const keyMap = new Map<string, string>(); // stringified id -> original key stringified

  function keyToStr(k: QueryKey) {
    return stableStringify(k);
  }

  function ensureEntry<T>(key: QueryKey): CacheEntry<T> {
    const id = keyToStr(key);
    let e = cache.get(id) as CacheEntry<T> | undefined;
    if (!e) {
      e = {
        abortController: null,
        data: undefined,
        dataUpdatedAt: 0,
        error: null,
        errorUpdatedAt: 0,
        fetchedAt: 0,
        gcTimer: null,
        observers: new Set(),
        promise: null,
        status: 'idle',
      } as CacheEntry<T>;
      cache.set(id, e as CacheEntry<unknown>);
      keyMap.set(id, id); // Store stringified version
    }
    return e;
  }

  function notify<T>(entry: CacheEntry<T>) {
    const state: QueryState<T> = {
      data: entry.data,
      dataUpdatedAt: entry.dataUpdatedAt,
      error: entry.error,
      errorUpdatedAt: entry.errorUpdatedAt,
      fetchedAt: entry.fetchedAt,
      isError: entry.status === 'error',
      isIdle: entry.status === 'idle',
      isLoading: entry.status === 'pending',
      isSuccess: entry.status === 'success',
      status: entry.status,
    };
    entry.observers.forEach((fn) => {
      try {
        fn(state);
      } catch {
        // swallow
      }
    });
  }

  /**
   * Centralized GC scheduling for cache entries
   * Schedules garbage collection when entry becomes successful
   */
  function scheduleGc<T = unknown>(id: string, entry: CacheEntry<T>, gcTime: number) {
    // Clear the existing timer
    if (entry.gcTimer) {
      clearTimeout(entry.gcTimer);
      entry.gcTimer = null;
    }

    // Schedule new GC if gcTime > 0
    if (gcTime > 0) {
      entry.gcTimer = setTimeout(() => {
        cache.delete(id);
        keyMap.delete(id);
      }, gcTime);
    }
  }

  /**
   * Clean up an entry by aborting requests and clearing timers
   */
  function cleanupEntry(entry: CacheEntry) {
    entry.abortController?.abort();
    if (entry.gcTimer) {
      clearTimeout(entry.gcTimer);
      entry.gcTimer = null;
    }
  }

  /**
   * Configure retry options for retry() calls
   * Centralizes retry logic used in both queries and mutations
   */
  function getRetryConfig(
    retryCount: number | false | undefined,
    retryDelay: number | ((attempt: number) => number) | undefined,
    defaultRetryCount = DEFAULT_RETRY,
  ) {
    const times = retryCount === false ? 1 : (retryCount ?? defaultRetryCount) + 1;

    let delay: number | undefined;
    let backoff: ((attempt: number, currentDelay: number) => number) | undefined;

    if (typeof retryDelay === 'function') {
      delay = undefined;
      backoff = (attempt) => retryDelay(attempt - 1);
    } else if (typeof retryDelay === 'number') {
      delay = retryDelay;
      backoff = undefined;
    } else {
      delay = 1000;
      backoff = (_a, cur) => Math.min(cur * 2, 30_000);
    }

    return { backoff, delay, times };
  }

  async function fetchQuery<T>(options: QueryOptions<T>): Promise<T> {
    const {
      queryKey,
      queryFn,
      staleTime = staleTimeDefault,
      gcTime = gcTimeDefault,
      enabled = true,
      retry: retryCount = DEFAULT_RETRY,
      retryDelay,
      onSuccess,
      onError,
    } = options;

    if (!enabled) throw new Error('Query disabled');

    const id = keyToStr(queryKey);
    const entry = ensureEntry<T>(queryKey);

    // if fresh
    if (entry.status === 'success' && Date.now() - entry.dataUpdatedAt < staleTime) {
      return entry.data as T;
    }

    if (entry.promise) return entry.promise;

    // cancel the existing abort controller if any and create a new one for retries
    const abortController = new AbortController();
    entry.abortController = abortController;
    entry.status = 'pending';
    notify(entry);

    const { times, delay, backoff } = getRetryConfig(retryCount, retryDelay);

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: retry and error handling requires complexity
    const p = (async () => {
      try {
        const data = await retry(() => queryFn(), { backoff, delay, signal: abortController.signal, times });
        const t = Date.now();
        entry.data = data;
        entry.status = 'success';
        entry.dataUpdatedAt = t;
        entry.fetchedAt = t;
        entry.error = null;
        entry.promise = null;
        entry.abortController = null;

        // Schedule GC using a centralized function
        scheduleGc(id, entry as CacheEntry<unknown>, gcTime);

        try {
          onSuccess?.(data);
        } catch {}
        notify(entry);
        return data;
      } catch (err) {
        const error = toError(err);

        // Distinguish between abort and other errors
        const isAborted = abortController.signal.aborted || error.name === 'AbortError';

        if (isAborted) {
          // Abort is not an error - clear error state and set to idle
          entry.status = 'idle';
          entry.error = null;
          // Don't update errorUpdatedAt for aborts
        } else {
          // Actual error - set error state
          entry.status = 'error';
          entry.error = error;
          entry.errorUpdatedAt = Date.now();
        }

        entry.promise = null;
        entry.abortController = null;

        try {
          // Only call onError for actual errors, not aborts
          if (!isAborted) {
            onError?.(error);
          }
        } catch {}
        notify(entry);
        throw error;
      }
    })();

    entry.promise = p;

    return p;
  }

  async function prefetch<T>(opts: QueryOptions<T>) {
    return fetchQuery({ ...opts, enabled: true }).catch(() => {}); // swallow errors
  }

  function invalidate(key: QueryKey) {
    const keyStr = keyToStr(key);

    // Check for the exact match first
    const exactEntry = cache.get(keyStr);
    if (exactEntry) {
      cleanupEntry(exactEntry);
      cache.delete(keyStr);
      keyMap.delete(keyStr);
      return;
    }

    // If no exact match, try prefix matching using string comparison
    // This avoids deep equality issues with nested objects
    // e.g., '["users"]' matches '["users",1]', '["users","all"]', etc.
    const toDelete: string[] = [];

    // Create a prefix pattern: remove the closing bracket from the key string
    const prefixPattern = keyStr.slice(0, -1); // Remove ']'

    for (const [id, storedKeyStr] of keyMap.entries()) {
      // Check if the stored key starts with the pattern
      // Must match exactly at prefix and either be exact or have a comma continuation
      const matches =
        storedKeyStr === keyStr || // Exact match
        storedKeyStr.startsWith(`${prefixPattern},`); // Prefix match with continuation

      if (matches) {
        const entry = cache.get(id);
        if (entry) {
          cleanupEntry(entry);
        }
        toDelete.push(id);
      }
    }

    // Delete all matched entries
    for (const id of toDelete) {
      cache.delete(id);
      keyMap.delete(id);
    }
  }

  function clearCache() {
    cache.forEach(cleanupEntry);
    cache.clear();
    keyMap.clear();
  }

  function setData<T>(key: QueryKey, dataOrUpdater: T | ((old?: T) => T)) {
    const id = keyToStr(key);
    const entry = ensureEntry<T>(key);
    entry.data = typeof dataOrUpdater === 'function' ? (dataOrUpdater as (old?: T) => T)(entry.data) : dataOrUpdater;
    entry.dataUpdatedAt = Date.now();
    entry.fetchedAt = entry.fetchedAt || Date.now();
    entry.status = 'success';

    // Schedule GC since entry is now successful
    scheduleGc(id, entry as CacheEntry<unknown>, gcTimeDefault);

    notify(entry);
  }

  function getData<T>(key: QueryKey): T | undefined {
    const id = keyToStr(key);
    return (cache.get(id)?.data as T) ?? undefined;
  }

  function getState<T>(key: QueryKey): QueryState<T> | null {
    const id = keyToStr(key);
    const entry = cache.get(id) as CacheEntry<T> | undefined;
    if (!entry) return null;
    return {
      data: entry.data,
      dataUpdatedAt: entry.dataUpdatedAt,
      error: entry.error,
      errorUpdatedAt: entry.errorUpdatedAt,
      fetchedAt: entry.fetchedAt,
      isError: entry.status === 'error',
      isIdle: entry.status === 'idle',
      isLoading: entry.status === 'pending',
      isSuccess: entry.status === 'success',
      status: entry.status,
    };
  }

  function subscribe<T = unknown>(key: QueryKey, listener: (state: QueryState<T>) => void) {
    const entry = ensureEntry<T>(key);
    entry.observers.add(listener);
    const state: QueryState<T> = {
      data: entry.data,
      dataUpdatedAt: entry.dataUpdatedAt,
      error: entry.error,
      errorUpdatedAt: entry.errorUpdatedAt,
      fetchedAt: entry.fetchedAt,
      isError: entry.status === 'error',
      isIdle: entry.status === 'idle',
      isLoading: entry.status === 'pending',
      isSuccess: entry.status === 'success',
      status: entry.status,
    };
    listener(state);
    return () => entry.observers.delete(listener);
  }

  function unsubscribe<T = unknown>(key: QueryKey, listener: (state: QueryState<T>) => void) {
    const id = keyToStr(key);
    const entry = cache.get(id) as CacheEntry<T> | undefined;
    if (entry) {
      entry.observers.delete(listener);
    }
  }

  async function mutate<TData, TVariables = void>(options: MutationOptions<TData, TVariables>, variables: TVariables) {
    const { mutationFn, onSuccess, onError, onSettled, retry: retryCount = false, retryDelay } = options;

    const { times, delay, backoff } = getRetryConfig(retryCount, retryDelay, 0);

    try {
      const data = await retry(() => mutationFn(variables), { backoff, delay, times });
      try {
        onSuccess?.(data, variables);
      } catch {}
      try {
        onSettled?.(data, null, variables);
      } catch {}
      return data;
    } catch (err) {
      const error = toError(err);
      try {
        onError?.(error, variables);
      } catch {}
      try {
        onSettled?.(undefined, error, variables);
      } catch {}
      throw error;
    }
  }

  return {
    clearCache,
    fetch: fetchQuery,
    getCacheSize: () => cache.size,
    getData,
    getState,
    invalidate,
    mutate,
    prefetch,
    setData,
    subscribe,
    unsubscribe,
  };
}
