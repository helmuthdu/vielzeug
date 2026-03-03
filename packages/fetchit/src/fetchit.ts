/* ============================================
   fetchit - Lightweight HTTP client with query caching
   ============================================ */

import { retry } from '@vielzeug/toolkit';

/* -------------------- Core Types -------------------- */

export type LogLevel = 'info' | 'error';

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

export type MutationOptions<TData, TVariables = void> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (err: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  retry?: number | false;
  retryDelay?: number | ((attempt: number) => number);
};

export type ParamValue = string | number | boolean | undefined;
export type Params = Record<string, ParamValue>;

export type HttpRequestConfig = Omit<RequestInit, 'body' | 'method'> & {
  body?: unknown;
  params?: Params;
  query?: Params;
  dedupe?: boolean;
};

export type HttpClientOptions = {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
  dedupe?: boolean;
  logger?: (level: LogLevel, msg: string, meta?: unknown) => void;
};

export type QueryClientOptions = {
  staleTime?: number;
  gcTime?: number;
};

/* -------------------- Constants -------------------- */

const DEFAULT_GC = 5 * 60_000;
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY = 3;
const CONTENT_TYPE_JSON = 'application/json';
const HEADER_CONTENT_TYPE = 'content-type';

/* -------------------- Errors -------------------- */

export class HttpError extends Error {
  readonly name = 'HttpError';
  readonly url: string;
  readonly method: string;
  readonly status?: number;
  readonly original?: unknown;

  constructor(msg: string, url: string, method: string, status?: number, original?: unknown) {
    super(msg);
    this.url = url;
    this.method = method;
    this.status = status;
    this.original = original;
  }
}

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

/* -------------------- URL & Body Utilities -------------------- */

/**
 * Build URL with optional path parameters and query string parameters.
 * @param base - Base URL (e.g., 'https://api.example.com')
 * @param path - URL path with optional placeholders (e.g., '/users/:id' or '/users/{id}')
 * @param params - Path parameters to replace in the URL (e.g., { id: '123' } -> '/users/123')
 * @param query - Query string parameters (e.g., { page: 1, limit: 10 } -> '?page=1&limit=10')
 * @returns Full URL with path parameters replaced and query string appended
 */
function buildUrl(base: string, path: string, params?: Params, query?: Params) {
  const baseClean = base.replace(/\/+$/, '');
  let pathClean = path.replace(/^\/+/, '');

  // Replace path parameters (supports both :param and {param} syntax)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        // Support both :id and {id} syntax
        const colonPattern = new RegExp(`:${key}(?=/|$)`, 'g');
        const bracePattern = new RegExp(`\\{${key}\\}`, 'g');
        const valueStr = String(value);

        pathClean = pathClean.replace(colonPattern, valueStr).replace(bracePattern, valueStr);
      }
    }
  }

  const url = baseClean ? `${baseClean}/${pathClean}` : pathClean;

  // Build query string
  if (!query) return url;

  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
}

function isBodyInit(value: unknown): value is BodyInit {
  if (value instanceof FormData) return true;
  if (value instanceof Blob) return true;
  if (value instanceof URLSearchParams) return true;
  if (typeof value === 'string') return true;
  if (value instanceof ArrayBuffer) return true;
  if (value && typeof value === 'object' && Object.prototype.toString.call(value) === '[object ArrayBuffer]') {
    return true;
  }
  return !!ArrayBuffer.isView(value);
}

/**
 * Stable JSON stringify that sorts object keys recursively.
 */
function stableStringify(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value !== 'object') return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  const pairs = keys.map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`);
  return `{${pairs.join(',')}}`;
}

function serializeBodyForDedupeKey(body: unknown): string {
  if (body === undefined || body === null) return 'null';
  if (body instanceof FormData) return '[FormData]';
  if (body instanceof Blob) return `[Blob:${body.size}:${body.type}]`;
  if (body instanceof URLSearchParams) return `[URLSearchParams:${body.toString()}]`;
  if (body instanceof ArrayBuffer) return `[ArrayBuffer:${body.byteLength}]`;
  if (ArrayBuffer.isView(body)) return `[ArrayBufferView:${(body as ArrayBufferView).byteLength}]`;
  if (typeof body === 'string') return body;
  if (typeof body === 'object') {
    try {
      return stableStringify(body);
    } catch {
      return '[Object]';
    }
  }
  return String(body);
}

/* -------------------- Signal & Timeout -------------------- */

function timeoutSignal(timeoutMs: number, external?: AbortSignal | null) {
  if (timeoutMs === 0 || timeoutMs === Number.POSITIVE_INFINITY) {
    return { clear: () => {}, signal: external ?? undefined };
  }

  if ('timeout' in AbortSignal && !external) {
    return { clear: () => {}, signal: AbortSignal.timeout(timeoutMs) };
  }

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

/* -------------------- Response Parsing -------------------- */

async function parseResponse(res: Response): Promise<unknown> {
  if (res.status === 204) return;

  const contentType = res.headers.get(HEADER_CONTENT_TYPE) ?? '';

  if (contentType.includes(CONTENT_TYPE_JSON)) {
    return res.json();
  }

  if (contentType.startsWith('text/')) {
    return res.text();
  }

  try {
    return await res.blob();
  } catch {
    return await res.text();
  }
}

/* -------------------- HTTP Client -------------------- */

/**
 * Creates an HTTP client for making requests.
 */
export function createHttpClient(opts: HttpClientOptions = {}) {
  const { baseUrl = '', headers: initialHeaders = {}, timeout = DEFAULT_TIMEOUT, dedupe = true, logger } = opts;

  const globalHeaders: Record<string, string> = { ...initialHeaders };
  const inFlight = new Map<string, Promise<unknown>>();

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: HTTP request handling requires complexity for deduplication, timeout, retry, and error handling
  async function request<T>(method: string, url: string, config: HttpRequestConfig = {}) {
    const full = buildUrl(baseUrl, url, config.params, config.query);
    const m = method.toUpperCase();
    const { body, headers, dedupe: cfgDedupe, signal: extSignal, params, query, ...rest } = config;
    const shouldDedupe = cfgDedupe !== false && dedupe;

    const dedupeKey = shouldDedupe ? `${m}:${full}:${serializeBodyForDedupeKey(body)}` : '';

    if (shouldDedupe) {
      const existing = inFlight.get(dedupeKey);
      if (existing) return existing as Promise<T>;
    }

    const { signal, clear } = timeoutSignal(timeout, extSignal ?? null);

    const init: RequestInit = {
      ...rest,
      headers: { ...globalHeaders, ...(headers as Record<string, string> | undefined) },
      method: m,
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

        logger?.('info', `${m} ${full} - ${res.status} (${Date.now() - start}ms)`, { req: init, res: parsed });

        if (!res.ok) throw new HttpError('Non-OK response', full, m, res.status, parsed);
        return parsed as T;
      } catch (err) {
        logger?.('error', `${m} ${full} - ERROR`, err);
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
    delete: (url: string, cfg?: HttpRequestConfig) => request('DELETE', url, cfg),
    get: (url: string, cfg?: HttpRequestConfig) => request('GET', url, cfg),
    patch: (url: string, cfg?: HttpRequestConfig) => request('PATCH', url, cfg),
    post: (url: string, cfg?: HttpRequestConfig) => request('POST', url, cfg),
    put: (url: string, cfg?: HttpRequestConfig) => request('PUT', url, cfg),
    request,
    setHeaders(headers: Record<string, string | undefined>) {
      for (const [key, value] of Object.entries(headers)) {
        if (value === undefined) {
          delete globalHeaders[key];
        } else {
          globalHeaders[key] = value;
        }
      }
    },
  };
}

/* -------------------- Query Client -------------------- */

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

/**
 * Creates a query client for managing cached queries.
 */
export function createQueryClient(opts?: QueryClientOptions) {
  const staleTimeDefault = opts?.staleTime ?? 0;
  const gcTimeDefault = opts?.gcTime ?? DEFAULT_GC;

  const cache = new Map<string, CacheEntry>();

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
    }
    return e;
  }

  function toState<T>(entry: CacheEntry<T>): QueryState<T> {
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

  function notify<T>(entry: CacheEntry<T>) {
    const state = toState(entry);

    entry.observers.forEach((fn) => {
      try {
        fn(state);
      } catch {
        // Swallow observer errors
      }
    });
  }

  function scheduleGc(id: string, entry: { gcTimer?: CacheEntry['gcTimer'] }, gcTime: number) {
    if (entry.gcTimer) {
      clearTimeout(entry.gcTimer);
      entry.gcTimer = null;
    }

    if (gcTime > 0) {
      entry.gcTimer = setTimeout(() => {
        entry.gcTimer = null;
        cache.delete(id);
      }, gcTime);
    }
  }

  function cleanupEntry(entry: CacheEntry) {
    entry.abortController?.abort();
    clearTimeout(entry.gcTimer ?? undefined);
    entry.gcTimer = null;
  }

  function getRetryConfig(
    retryCount: number | false | undefined,
    retryDelay: number | ((attempt: number) => number) | undefined,
    defaultRetryCount = DEFAULT_RETRY,
  ) {
    const times = retryCount === false ? 1 : (retryCount ?? defaultRetryCount) + 1;

    let delay: number | undefined;
    let backoff: ((attempt: number, currentDelay: number) => number) | undefined;

    if (typeof retryDelay === 'function') {
      backoff = (attempt) => retryDelay(attempt - 1);
    } else if (typeof retryDelay === 'number') {
      delay = retryDelay;
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

    // Return cached data if fresh
    if (entry.status === 'success' && Date.now() - entry.dataUpdatedAt < staleTime) {
      return entry.data as T;
    }

    if (entry.promise) return entry.promise;

    const abortController = new AbortController();
    entry.abortController = abortController;
    entry.status = 'pending';
    notify(entry);

    const { times, delay, backoff } = getRetryConfig(retryCount, retryDelay);

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Query fetching requires complexity for retry and error handling
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

        scheduleGc(id, entry, gcTime);

        try {
          onSuccess?.(data);
        } catch {}

        notify(entry);
        return data;
      } catch (err) {
        const error = toError(err);
        const isAborted = abortController.signal.aborted || error.name === 'AbortError';

        if (isAborted) {
          entry.status = 'idle';
          entry.error = null;
        } else {
          entry.status = 'error';
          entry.error = error;
          entry.errorUpdatedAt = Date.now();
        }

        entry.promise = null;
        entry.abortController = null;

        if (!isAborted)
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

  async function prefetch<T>(options: QueryOptions<T>) {
    return fetchQuery({ ...options, enabled: true }).catch(() => {});
  }

  function invalidate(key: QueryKey) {
    const keyStr = keyToStr(key);

    const exactEntry = cache.get(keyStr);
    if (exactEntry) {
      cleanupEntry(exactEntry);
      cache.delete(keyStr);
      return;
    }

    const prefix = `${keyStr.slice(0, -1)},`;

    for (const id of [...cache.keys()]) {
      if (id.startsWith(prefix)) {
        const entry = cache.get(id);
        if (entry) cleanupEntry(entry);
        cache.delete(id);
      }
    }
  }

  function clearCache() {
    cache.forEach(cleanupEntry);
    cache.clear();
  }

  function setData<T>(key: QueryKey, dataOrUpdater: T | ((old?: T) => T)) {
    const id = keyToStr(key);
    const entry = ensureEntry<T>(key);

    const now = Date.now();
    entry.data = typeof dataOrUpdater === 'function' ? (dataOrUpdater as (old?: T) => T)(entry.data) : dataOrUpdater;
    entry.dataUpdatedAt = now;
    entry.fetchedAt = entry.fetchedAt || now;
    entry.status = 'success';

    scheduleGc(id, entry, gcTimeDefault);
    notify(entry);
  }

  function getData<T>(key: QueryKey): T | undefined {
    const id = keyToStr(key);
    return cache.get(id)?.data as T | undefined;
  }

  function getState<T>(key: QueryKey): QueryState<T> | null {
    const id = keyToStr(key);
    const entry = cache.get(id) as CacheEntry<T> | undefined;
    return entry ? toState(entry) : null;
  }

  function subscribe<T = unknown>(key: QueryKey, listener: (state: QueryState<T>) => void) {
    const entry = ensureEntry<T>(key);
    entry.observers.add(listener);
    listener(toState(entry));
    return () => entry.observers.delete(listener);
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
    clear: clearCache,
    fetch: fetchQuery,
    getData,
    getState,
    invalidate,
    mutate,
    prefetch,
    setData,
    subscribe,
  };
}

export type HttpClient = ReturnType<typeof createHttpClient>;
export type QueryClient = ReturnType<typeof createQueryClient>;
