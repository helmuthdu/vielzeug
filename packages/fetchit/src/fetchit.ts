import { Logit } from '@vielzeug/logit';
import { cache, retry } from '@vielzeug/toolkit';

export type QueryKey = readonly unknown[];

export type QueryStatus = 'idle' | 'pending' | 'success' | 'error';

export type RequestResponse<T> = {
  data: T;
  ok: boolean;
  status: number;
};

export type QueryOptions<T> = {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  staleTime?: number;
  cacheTime?: number;
  enabled?: boolean;
  retry?: number | false;
  retryDelay?: number | ((attemptIndex: number) => number);
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
};

export type MutationOptions<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  retry?: number | false;
};

export type HttpClientOptions = {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
  defaultStaleTime?: number;
  defaultCacheTime?: number;
};

export type HttpRequestConfig = Omit<RequestInit, 'body'> & {
  body?: unknown;
  params?: Record<string, string | number | undefined>;
};

const DEFAULT_STALE_TIME = 0;
const DEFAULT_CACHE_TIME = 5 * 60 * 1000;
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY = 3;

type CacheEntry<T> = {
  data: T | undefined;
  status: QueryStatus;
  error: Error | null;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  fetchedAt: number;
  observers: Set<() => void>;
  promise: Promise<T> | null;
  abortController: AbortController | null;
};

type PersistedQueryOptions = {
  options: QueryOptions<unknown>;
  // store when it was last used
  lastUsedAt: number;
};

function createQueryCache() {
  const cacheInstance = cache<CacheEntry<unknown>>();
  const meta = cache<PersistedQueryOptions>();

  return {
    clear: () => {
      cacheInstance.clear();
      meta.clear();
    },
    delete: (key: QueryKey) => {
      cacheInstance.delete(key);
      return meta.delete(key);
    },
    get: <T>(key: QueryKey) => cacheInstance.get(key) as CacheEntry<T> | undefined,
    getMeta: (key: QueryKey) => meta.get(key),
    getMetaByHash: (keyHash: string) => meta.getMetaByHash(keyHash),
    listMetaHashes: () => meta.listMetaHashes(),
    scheduleGc: (key: QueryKey, cacheTime: number) => cacheInstance.scheduleGc(key, cacheTime),
    set: <T>(key: QueryKey, entry: CacheEntry<T>) => cacheInstance.set(key, entry as CacheEntry<unknown>),
    setMeta: (key: QueryKey, options: QueryOptions<unknown>) => meta.set(key, { lastUsedAt: Date.now(), options }),
    size: () => cacheInstance.size(),
  };
}

export class HttpError extends Error {
  readonly url: string;
  readonly method: string;
  readonly status?: number;
  readonly originalError?: unknown;

  constructor(message: string, url: string, method: string, status?: number, originalError?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.url = url;
    this.method = method;
    this.status = status;
    this.originalError = originalError;
  }
}

// Helper to create an empty cache entry
const createCacheEntry = <T>(): CacheEntry<T> => ({
  abortController: null,
  data: undefined,
  dataUpdatedAt: 0,
  error: null,
  errorUpdatedAt: 0,
  fetchedAt: 0,
  observers: new Set(),
  promise: null,
  status: 'idle',
});

export function fetchit(options: HttpClientOptions = {}) {
  const {
    baseUrl = '',
    headers: defaultHeaders = {},
    timeout = DEFAULT_TIMEOUT,
    defaultStaleTime = DEFAULT_STALE_TIME,
    defaultCacheTime = DEFAULT_CACHE_TIME,
  } = options;

  const queryCache = createQueryCache();
  let globalHeaders = { ...defaultHeaders };

  // store keyHash strings for focus/reconnect sets
  const focusKeyHashes = new Set<string>();
  const reconnectKeyHashes = new Set<string>();

  // window listeners: refetch persisted queries on focus/online.
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      for (const keyHash of focusKeyHashes) {
        refetchPersistedQueryByHash(keyHash);
      }
    });
    window.addEventListener('online', () => {
      for (const keyHash of reconnectKeyHashes) {
        refetchPersistedQueryByHash(keyHash);
      }
    });
  }

  function refetchPersistedQueryByHash(keyHash: string) {
    const persisted = queryCache.getMetaByHash(keyHash);
    if (!persisted) return;

    const { options } = persisted as PersistedQueryOptions;
    // Only refetch if there's an existing cache entry in success state
    try {
      const key = options.queryKey;
      const entry = queryCache.get(key);
      if (!entry) return;
      if (entry.status !== 'success') return;

      // Re-run original queryFn with original options to perform network refetch
      // ignore the returned promise; errors are swallowed to avoid unhandled rejections
      fetchQuery({ ...options, refetchOnFocus: false, refetchOnReconnect: false } as QueryOptions<unknown>).catch(
        () => {},
      );
    } catch {
      // ignore parsing errors
    }
  }

  async function fetchRequest<T>(url: string, config: HttpRequestConfig = {}): Promise<RequestResponse<T>> {
    const start = Date.now();
    const fullUrl = buildFullUrl(baseUrl, url, config.params);

    const controller = new AbortController();
    const { signal: combinedSignal, clearTimeoutFn } = createTimeoutSignal(controller, timeout, config.signal);

    try {
      const init = buildFetchInit(config, globalHeaders, combinedSignal);
      const response = await fetch(fullUrl, init);
      const parsed = await parseResponse<T>(response);

      log('SUCCESS', fullUrl, init, { data: parsed, status: response.status }, start);

      if (!response.ok) {
        throw new HttpError('Non-OK HTTP status', fullUrl, (init.method ?? 'GET').toString(), response.status, parsed);
      }

      return { data: parsed, ok: response.ok, status: response.status };
    } catch (err) {
      const errObj = err instanceof Error ? err : new Error(String(err));
      log('ERROR', fullUrl, { method: config.method ?? 'GET' }, errObj, start);
      if (err instanceof HttpError) throw err;
      throw new HttpError(errObj.message, fullUrl, (config.method ?? 'GET').toString(), undefined, err);
    } finally {
      clearTimeoutFn();
    }
  }

  async function fetchQuery<T>(options: QueryOptions<T>): Promise<T> {
    const {
      queryKey,
      queryFn,
      staleTime = defaultStaleTime,
      cacheTime = defaultCacheTime,
      enabled = true,
      retry: retryCount = DEFAULT_RETRY,
      retryDelay,
      refetchOnFocus = false,
      refetchOnReconnect = false,
      onSuccess,
      onError,
    } = options;

    if (!enabled) throw new Error('Query is disabled');

    const keyHash = JSON.stringify(queryKey);
    if (refetchOnFocus) focusKeyHashes.add(keyHash);
    if (refetchOnReconnect) reconnectKeyHashes.add(keyHash);

    // persist options for future auto-refetch
    queryCache.setMeta(queryKey, options as QueryOptions<unknown>);

    let entry = queryCache.get<T>(queryKey);

    // if fresh, return immediately
    if (entry && entry.status === 'success' && Date.now() - entry.dataUpdatedAt < staleTime) {
      queryCache.setMeta(queryKey, options as QueryOptions<unknown>); // update lastUsedAt
      return entry.data as T;
    }

    // dedupe in-flight
    if (entry?.promise) return entry.promise as Promise<T>;

    // create entry if needed
    if (!entry) {
      entry = createCacheEntry<T>();
      queryCache.set(queryKey, entry);
    }

    const abortController = new AbortController();
    entry.abortController = abortController;
    entry.status = 'pending';

    const times = retryCount === false ? 1 : Math.max(1, (retryCount ?? DEFAULT_RETRY) + 1);
    let delay: number;
    let backoff: number | ((attempt: number, currentDelay: number) => number);

    if (typeof retryDelay === 'function') {
      // Custom delay function: adapt to toolkit's backoff signature
      delay = 0;
      backoff = (attempt: number) => retryDelay(attempt - 1);
    } else if (typeof retryDelay === 'number') {
      // Fixed delay
      delay = retryDelay;
      backoff = 1; // No backoff
    } else {
      // Exponential backoff: 1s, 2s, 4s, 8s... (max 30s)
      delay = 1000;
      backoff = (_attempt: number, currentDelay: number) => Math.min(currentDelay * 2, 30_000);
    }

    const promise = retry(() => queryFn(), { backoff, delay, signal: abortController.signal, times });
    entry.promise = promise;

    try {
      const data = await promise;
      const t = Date.now();
      entry.data = data;
      entry.status = 'success';
      entry.dataUpdatedAt = t;
      entry.fetchedAt = t;
      entry.error = null;
      entry.promise = null;
      entry.abortController = null;

      onSuccess?.(data);
      notifyObservers(entry);

      // schedule GC
      queryCache.scheduleGc(queryKey, cacheTime);

      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      entry.status = 'error';
      entry.error = error;
      entry.errorUpdatedAt = Date.now();
      entry.promise = null;
      entry.abortController = null;

      onError?.(error);
      notifyObservers(entry);

      throw error;
    }
  }

  async function executeMutation<TData, TVariables>(
    options: MutationOptions<TData, TVariables>,
    variables: TVariables,
  ): Promise<TData> {
    const { mutationFn, onSuccess, onError, onSettled, retry: retryCount = false } = options;

    try {
      const times = retryCount === false ? 1 : Math.max(1, (retryCount ?? DEFAULT_RETRY) + 1);
      const data = await retry(() => mutationFn(variables), { times });
      onSuccess?.(data, variables);
      onSettled?.(data, null, variables);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error, variables);
      onSettled?.(undefined, error, variables);
      throw error;
    }
  }

  function invalidateQueries(queryKey: QueryKey): void {
    queryCache.get(queryKey)?.abortController?.abort();
    queryCache.delete(queryKey);
  }

  function setQueryData<T>(queryKey: QueryKey, data: T | ((old: T | undefined) => T)): void {
    let entry = queryCache.get<T>(queryKey);
    if (!entry) {
      entry = createCacheEntry<T>();
      entry.status = 'success';
      entry.dataUpdatedAt = Date.now();
      entry.fetchedAt = Date.now();
      queryCache.set(queryKey, entry);
    }
    entry.data = typeof data === 'function' ? (data as (old: T | undefined) => T)(entry.data as T | undefined) : data;
    entry.dataUpdatedAt = Date.now();
    entry.status = 'success';
    notifyObservers(entry);
  }

  function getQueryData<T>(queryKey: QueryKey): T | undefined {
    return queryCache.get<T>(queryKey)?.data;
  }

  function subscribe(queryKey: QueryKey, listener: () => void): () => void {
    let entry = queryCache.get(queryKey);
    if (!entry) {
      entry = createCacheEntry();
      queryCache.set(queryKey, entry);
    }
    entry.observers.add(listener);
    return () => queryCache.get(queryKey)?.observers.delete(listener);
  }

  function unsubscribe(queryKey: QueryKey, listener: () => void): void {
    queryCache.get(queryKey)?.observers.delete(listener);
  }

  function createRequestMethod(method: string) {
    return (url: string, config: Omit<HttpRequestConfig, 'method'> = {}) => fetchRequest(url, { ...config, method });
  }

  return {
    clearCache: () => queryCache.clear(),
    delete: createRequestMethod('DELETE'),
    get: createRequestMethod('GET'),
    getCacheSize: () => queryCache.size(),
    getHeaders: () => ({ ...globalHeaders }),
    getQueryData,
    invalidateQueries,
    mutate: executeMutation,
    patch: createRequestMethod('PATCH'),
    post: createRequestMethod('POST'),
    put: createRequestMethod('PUT'),
    query: fetchQuery,
    setHeaders(headers: Record<string, string | undefined>): void {
      globalHeaders = Object.fromEntries(
        Object.entries({ ...globalHeaders, ...headers }).filter(([, v]) => v !== undefined),
      ) as Record<string, string>;
    },
    setQueryData,
    subscribe,
    unsubscribe,
  };
}

function isBodyInit(value: unknown): value is BodyInit {
  if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
  if (typeof FormData !== 'undefined' && value instanceof FormData) return true;
  if (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams) return true;
  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) return true;
  return typeof value === 'string';
}

function buildFullUrl(baseUrl: string, path: string, params?: Record<string, string | number | undefined>): string {
  const cleanedBase = baseUrl.replace(/\/+$/, '');
  const cleanedPath = path.replace(/^\/+/, '');
  const base = cleanedBase ? `${cleanedBase}/${cleanedPath}` : cleanedPath;

  if (!params || Object.keys(params).length === 0) return base;

  try {
    const url = new URL(base, cleanedBase ? undefined : 'http://dummy');
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.append(k, String(v));
    }
    const out = url.toString();
    return out.startsWith('http://dummy') ? out.replace('http://dummy', '') : out;
  } catch {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return qs ? `${base}${base.includes('?') ? '&' : '?'}${qs}` : base;
  }
}

function headersToObject(headers: HeadersInit | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headers) return result;

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = value;
    });
  } else if (Array.isArray(headers)) {
    for (const [k, v] of headers) result[k] = v;
  } else {
    Object.assign(result, headers);
  }

  return result;
}

function mergeHeaders(
  globalHeaders: Record<string, string>,
  configHeaders?: HeadersInit,
  additional?: Record<string, string>,
) {
  return {
    ...globalHeaders,
    ...headersToObject(configHeaders),
    ...(additional ?? {}),
  };
}

// Create a combined signal with timeout + optional external signal
function createTimeoutSignal(controller: AbortController, timeoutMs: number, externalSignal?: AbortSignal | null) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  // Link external signal to controller
  if (externalSignal?.aborted) {
    controller.abort();
  } else if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  // Try native AbortSignal.timeout (modern browsers/Node)
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    try {
      const timeoutSignal = (AbortSignal as any).timeout(timeoutMs) as AbortSignal;
      timeoutSignal.addEventListener('abort', () => controller.abort(), { once: true });
      return { clearTimeoutFn: () => {}, signal: controller.signal };
    } catch {
      // Fall through to manual timeout
    }
  }

  // Fallback: manual timeout
  timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    clearTimeoutFn: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
    signal: controller.signal,
  };
}

function buildFetchInit(
  config: HttpRequestConfig,
  globalHeaders: Record<string, string>,
  signal: AbortSignal,
): RequestInit {
  let body: BodyInit | undefined;
  let additionalHeaders: Record<string, string> | undefined;

  if (config.body !== undefined) {
    if (isBodyInit(config.body)) {
      body = config.body as BodyInit;
    } else {
      body = JSON.stringify(config.body);
      additionalHeaders = { 'Content-Type': 'application/json' };
    }
  }

  return {
    ...config,
    body,
    headers: mergeHeaders(globalHeaders, config.headers, additionalHeaders),
    method: config.method,
    signal,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const contentLength = response.headers.get('content-length');
  if (contentLength === '0') return undefined as T;

  const ct = response.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return response.json();
  if (ct.includes('text/')) return (await response.text()) as unknown as T;
  return (await response.blob()) as unknown as T;
}

function notifyObservers<T>(entry: CacheEntry<T>): void {
  entry.observers.forEach((observer) => {
    try {
      observer();
    } catch {
      // Silently ignore observer errors to prevent cascade failures
    }
  });
}

function log(type: 'SUCCESS' | 'ERROR', url: string, req: RequestInit, res: unknown, startTime: number): void {
  const elapsed = Date.now() - startTime;
  const method = (req.method ?? 'GET').toUpperCase();
  const shortUrl = url.replace(/^https?:\/\/[^/]+\//, '');
  const icon = type === 'SUCCESS' ? '✓' : '✕';
  const logType = type.toLowerCase() as 'success' | 'error';

  Logit[logType](`HTTP::${method}(…/${shortUrl}) ${icon} ${elapsed}ms`, { req, res, url });
}
