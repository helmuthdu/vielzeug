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
  return typeof value === 'string' || value instanceof ArrayBuffer;
}

function timeoutSignal(timeoutMs: number, external?: AbortSignal | null) {
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
    const dedupeKey = JSON.stringify({ body, full, m });

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
      init.headers = { 'content-type': 'application/json', ...(init.headers as Record<string, string>) };
    } else if (body !== undefined) {
      init.body = body as BodyInit;
    }

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: -
    const p = (async () => {
      const start = Date.now();
      try {
        const res = await fetch(full, init);
        const contentType = res.headers.get('content-type') ?? '';
        let parsed: unknown;

        if (res.status === 204) {
          parsed = undefined;
        } else if (contentType.includes('application/json')) {
          parsed = await res.json();
        } else if (contentType.startsWith('text/')) {
          parsed = await res.text();
        } else {
          // Try blob if available, otherwise fallback to text
          try {
            parsed = await res.blob();
          } catch {
            parsed = await res.text();
          }
        }

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
  const keyMap = new Map<string, QueryKey>(); // stringified -> original key

  function keyToStr(k: QueryKey) {
    return JSON.stringify(k);
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
      keyMap.set(id, key);
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

    // retry configuration
    const times = retryCount === false ? 1 : Math.max(1, (retryCount ?? DEFAULT_RETRY) + 1);
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

        // schedule GC
        if (entry.gcTimer) {
          clearTimeout(entry.gcTimer);
          entry.gcTimer = null;
        }
        if (gcTime > 0) {
          entry.gcTimer = setTimeout(() => {
            cache.delete(id);
            keyMap.delete(id);
          }, gcTime);
        }

        try {
          onSuccess?.(data);
        } catch {}
        notify(entry);
        return data;
      } catch (err) {
        const error = toError(err);
        entry.status = 'error';
        entry.error = error;
        entry.errorUpdatedAt = Date.now();
        entry.promise = null;
        entry.abortController = null;
        try {
          onError?.(error);
        } catch {}
        notify(entry);
        throw error;
      }
    })();

    entry.promise = p;

    return p;
  }

  function prefetch<T>(opts: QueryOptions<T>) {
    return fetchQuery({ ...opts, enabled: true }).catch(() => {}); // swallow errors
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: -
  function invalidate(key: QueryKey) {
    const keyStr = keyToStr(key);

    // Check for exact match first
    const exactEntry = cache.get(keyStr);
    if (exactEntry) {
      exactEntry.abortController?.abort();
      if (exactEntry.gcTimer) {
        clearTimeout(exactEntry.gcTimer);
        exactEntry.gcTimer = null;
      }
      cache.delete(keyStr);
      keyMap.delete(keyStr);
      return;
    }

    // If no exact match, try prefix matching
    // e.g., ['users'] matches ['users', 1], ['users', 2], etc.
    const toDelete: string[] = [];

    for (const [id, storedKey] of keyMap.entries()) {
      // Check if stored key starts with the pattern key
      let matches = true;
      for (let i = 0; i < key.length; i++) {
        if (i >= storedKey.length || storedKey[i] !== key[i]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        const entry = cache.get(id);
        if (entry) {
          entry.abortController?.abort();
          if (entry.gcTimer) {
            clearTimeout(entry.gcTimer);
            entry.gcTimer = null;
          }
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
    cache.forEach((entry) => {
      entry.abortController?.abort();
      if (entry.gcTimer) {
        clearTimeout(entry.gcTimer);
        entry.gcTimer = null;
      }
    });
    cache.clear();
    keyMap.clear();
  }

  function setData<T>(key: QueryKey, dataOrUpdater: T | ((old?: T) => T)) {
    const entry = ensureEntry<T>(key);
    entry.data = typeof dataOrUpdater === 'function' ? (dataOrUpdater as (old?: T) => T)(entry.data) : dataOrUpdater;
    entry.dataUpdatedAt = Date.now();
    entry.fetchedAt = entry.fetchedAt || Date.now();
    entry.status = 'success';
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
    // immediate call with current state
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
    const times = retryCount === false ? 1 : Math.max(1, (retryCount ?? DEFAULT_RETRY) + 1);

    let delay: number | undefined;
    let backoff: ((attempt: number, currentDelay: number) => number) | undefined;
    if (typeof retryDelay === 'function') backoff = (attempt) => retryDelay(attempt - 1);
    else if (typeof retryDelay === 'number') delay = retryDelay;
    else {
      delay = 0;
      backoff = undefined;
    }

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
    // Core methods
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
