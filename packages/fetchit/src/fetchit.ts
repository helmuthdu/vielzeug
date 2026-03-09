/* ============================================
   fetchit — Lightweight HTTP client with query caching
   ============================================ */

import { retry } from '@vielzeug/toolkit';

/* -------------------- Types -------------------- */

export type QueryKey = readonly unknown[];

export type QueryStatus = 'idle' | 'pending' | 'success' | 'error';

export type QueryState<T = unknown> = {
  data: T | undefined;
  error: Error | null;
  status: QueryStatus;
  updatedAt: number;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
};

/** Mutation state is the same shape as query state. */
export type MutationState<TData = unknown> = QueryState<TData>;

export type QueryOptions<T> = {
  key: QueryKey;
  fn: () => Promise<T>;
  staleTime?: number;
  gcTime?: number;
  enabled?: boolean;
  retry?: number | false;
  retryDelay?: number | ((attempt: number) => number);
};

export type ParamValue = string | number | boolean | undefined;
export type Params = Record<string, ParamValue>;

export type HttpRequestConfig = Omit<RequestInit, 'body' | 'method'> & {
  body?: unknown;
  params?: Params;
  search?: Params;
  dedupe?: boolean;
};

export type FetchContext = { url: string; init: RequestInit };

export type Interceptor = (ctx: FetchContext, next: (ctx: FetchContext) => Promise<Response>) => Promise<Response>;

export type HttpClientOptions = {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
  dedupe?: boolean;
  logger?: (level: 'info' | 'error', msg: string, meta?: unknown) => void;
};

export type QueryClientOptions = {
  staleTime?: number;
  gcTime?: number;
};

export type ClientOptions = HttpClientOptions & QueryClientOptions;

/* -------------------- Constants -------------------- */

const DEFAULT_GC = 5 * 60_000;
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY = 3;
const CONTENT_TYPE_JSON = 'application/json';
const HEADER_CONTENT_TYPE = 'content-type';
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/* -------------------- Errors -------------------- */

export class HttpError extends Error {
  readonly name = 'HttpError';
  readonly url: string;
  readonly method: string;
  readonly status?: number;
  readonly cause?: unknown;

  constructor(opts: { message: string; url: string; method: string; status?: number; cause?: unknown }) {
    super(opts.message);
    this.url = opts.url;
    this.method = opts.method;
    this.status = opts.status;
    this.cause = opts.cause;
  }
}

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

/* -------------------- URL & Body Utilities -------------------- */

function buildUrl(base: string, path: string, params?: Params, search?: Params) {
  const baseClean = base.replace(/\/+$/, '');
  let pathClean = path.replace(/^\/+/, '');

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        const colonPattern = new RegExp(`:${key}(?=/|$)`, 'g');
        const bracePattern = new RegExp(`\\{${key}\\}`, 'g');
        const valueStr = String(value);
        pathClean = pathClean.replace(colonPattern, valueStr).replace(bracePattern, valueStr);
      }
    }
  }

  const url = baseClean ? `${baseClean}/${pathClean}` : pathClean;

  if (!search) return url;

  const qs = Object.entries(search)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    value instanceof FormData ||
    value instanceof Blob ||
    value instanceof URLSearchParams ||
    typeof value === 'string' ||
    value instanceof ArrayBuffer ||
    !!ArrayBuffer.isView(value)
  );
}

function stableStringify(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value as object).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`).join(',')}}`;
}

function serializeBodyKey(body: unknown): string {
  if (body === undefined || body === null) return 'null';
  if (body instanceof FormData) return '[FormData]';
  if (body instanceof Blob) return `[Blob:${body.size}:${body.type}]`;
  if (body instanceof URLSearchParams) return `[URLSearchParams:${body.toString()}]`;
  if (body instanceof ArrayBuffer) return `[ArrayBuffer:${body.byteLength}]`;
  if (ArrayBuffer.isView(body)) return `[ArrayBufferView:${(body as ArrayBufferView).byteLength}]`;
  if (typeof body === 'string') return body;
  try {
    return stableStringify(body);
  } catch {
    return '[Object]';
  }
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
      external?.removeEventListener('abort', onAbort);
    },
    signal: controller.signal,
  };
}

/* -------------------- Response Parsing -------------------- */

async function parseResponse(res: Response): Promise<unknown> {
  if (res.status === 204) return;
  const contentType = res.headers.get(HEADER_CONTENT_TYPE) ?? '';
  if (contentType.includes(CONTENT_TYPE_JSON)) return res.json();
  if (contentType.startsWith('text/')) return res.text();
  try {
    return await res.blob();
  } catch {
    return res.text();
  }
}

/* -------------------- Retry Config -------------------- */

function getRetryConfig(
  retryCount: number | false | undefined,
  retryDelay: number | ((attempt: number) => number) | undefined,
  defaultRetryCount = DEFAULT_RETRY,
) {
  // retry: N = N retries after initial attempt = N+1 total attempts
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

/* -------------------- HTTP Client -------------------- */

export function createHttpClient(opts: HttpClientOptions = {}) {
  const { baseUrl = '', headers: initialHeaders = {}, timeout = DEFAULT_TIMEOUT, dedupe = false, logger } = opts;

  const globalHeaders: Record<string, string> = { ...initialHeaders };
  const inFlight = new Map<string, Promise<unknown>>();
  const interceptors: Interceptor[] = [];
  let pipeline: ((ctx: FetchContext) => Promise<Response>) | null = null;

  function use(interceptor: Interceptor): () => void {
    interceptors.push(interceptor);
    pipeline = null;
    return () => {
      const i = interceptors.indexOf(interceptor);
      if (i !== -1) {
        interceptors.splice(i, 1);
        pipeline = null;
      }
    };
  }

  function getPipeline(): (ctx: FetchContext) => Promise<Response> {
    if (pipeline) return pipeline;
    const base: (ctx: FetchContext) => Promise<Response> = (ctx) => fetch(ctx.url, ctx.init);
    const p =
      interceptors.length === 0
        ? base
        : interceptors.reduceRight<(ctx: FetchContext) => Promise<Response>>(
            (next, interceptor) => (ctx) => interceptor(ctx, next),
            base,
          );
    pipeline = p;
    return p;
  }

  async function request<T>(method: string, url: string, config: HttpRequestConfig = {}) {
    const full = buildUrl(baseUrl, url, config.params, config.search);
    const m = method.toUpperCase();
    const { body, headers, dedupe: cfgDedupe, signal: extSignal, params, search, ...rest } = config;

    // Dedupe idempotent methods by default; non-idempotent only when explicitly opted in
    const shouldDedupe = cfgDedupe === true || (cfgDedupe !== false && (dedupe || IDEMPOTENT_METHODS.has(m)));

    const dedupeKey = shouldDedupe ? `${m}:${full}:${serializeBodyKey(body)}` : '';

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
        const res = await getPipeline()({ url: full, init });
        const parsed = await parseResponse(res);
        logger?.('info', `${m} ${full} - ${res.status} (${Date.now() - start}ms)`, { res: parsed });
        if (!res.ok)
          throw new HttpError({ cause: parsed, message: 'Non-OK response', method: m, status: res.status, url: full });
        return parsed as T;
      } catch (err) {
        logger?.('error', `${m} ${full} - ERROR`, err);
        if (err instanceof HttpError) throw err;
        throw new HttpError({ cause: err, message: toError(err).message, method: m, url: full });
      } finally {
        clear();
        if (shouldDedupe) inFlight.delete(dedupeKey);
      }
    })();

    if (shouldDedupe) inFlight.set(dedupeKey, p);
    return p as Promise<T>;
  }

  return {
    delete: <T>(url: string, cfg?: HttpRequestConfig) => request<T>('DELETE', url, cfg),
    get: <T>(url: string, cfg?: HttpRequestConfig) => request<T>('GET', url, cfg),
    patch: <T>(url: string, cfg?: HttpRequestConfig) => request<T>('PATCH', url, cfg),
    post: <T>(url: string, cfg?: HttpRequestConfig) => request<T>('POST', url, cfg),
    put: <T>(url: string, cfg?: HttpRequestConfig) => request<T>('PUT', url, cfg),
    request,
    setHeaders(headers: Record<string, string | undefined>) {
      for (const [key, value] of Object.entries(headers)) {
        if (value === undefined) delete globalHeaders[key];
        else globalHeaders[key] = value;
      }
    },
    use,
  };
}

/* -------------------- Query Client -------------------- */

type CacheEntry<T = unknown> = {
  data?: T;
  status: QueryStatus;
  error: Error | null;
  updatedAt: number;
  observers: Set<(state: QueryState<T>) => void>;
  promise: Promise<T> | null;
  abortController: AbortController | null;
  gcTimer?: ReturnType<typeof setTimeout> | null;
};

type MutationEntry<TData> = {
  status: QueryStatus;
  data: TData | undefined;
  error: Error | null;
  updatedAt: number;
};

function toQueryState<T>(entry: CacheEntry<T>): QueryState<T> {
  return {
    data: entry.data,
    error: entry.error,
    isError: entry.status === 'error',
    isIdle: entry.status === 'idle',
    isLoading: entry.status === 'pending',
    isSuccess: entry.status === 'success',
    status: entry.status,
    updatedAt: entry.updatedAt,
  };
}

function toMutationState<T>(entry: MutationEntry<T>): MutationState<T> {
  return {
    data: entry.data,
    error: entry.error,
    isError: entry.status === 'error',
    isIdle: entry.status === 'idle',
    isLoading: entry.status === 'pending',
    isSuccess: entry.status === 'success',
    status: entry.status,
    updatedAt: entry.updatedAt,
  };
}

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
        error: null,
        gcTimer: null,
        observers: new Set(),
        promise: null,
        status: 'idle',
        updatedAt: 0,
      } as CacheEntry<T>;
      cache.set(id, e as CacheEntry<unknown>);
    }
    return e;
  }

  function notify<T>(entry: CacheEntry<T>) {
    const state = toQueryState(entry);
    entry.observers.forEach((fn) => {
      try {
        fn(state);
      } catch {}
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

  async function fetchQuery<T>(options: QueryOptions<T>): Promise<T | undefined> {
    const {
      key: queryKey,
      fn: queryFn,
      staleTime = staleTimeDefault,
      gcTime = gcTimeDefault,
      enabled = true,
      retry: retryCount = DEFAULT_RETRY,
      retryDelay,
    } = options;

    if (!enabled) return ensureEntry<T>(queryKey).data;

    const id = keyToStr(queryKey);
    const entry = ensureEntry<T>(queryKey);

    if (entry.status === 'success' && Date.now() - entry.updatedAt < staleTime) {
      return entry.data as T;
    }

    if (entry.promise) return entry.promise;

    const abortController = new AbortController();
    entry.abortController = abortController;
    entry.status = 'pending';
    notify(entry);

    const { times, delay, backoff } = getRetryConfig(retryCount, retryDelay);

    const p = (async () => {
      try {
        const data = await retry(() => queryFn(), { backoff, delay, signal: abortController.signal, times });
        entry.data = data;
        entry.status = 'success';
        entry.updatedAt = Date.now();
        entry.error = null;
        entry.promise = null;
        entry.abortController = null;
        scheduleGc(id, entry, gcTime);
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
          entry.updatedAt = Date.now();
        }
        entry.promise = null;
        entry.abortController = null;
        notify(entry);
        throw error;
      }
    })();

    entry.promise = p;
    return p;
  }

  async function prefetch<T>(options: QueryOptions<T>): Promise<void> {
    await fetchQuery<T>({ ...options, enabled: true }).catch(() => {});
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
    entry.data = typeof dataOrUpdater === 'function' ? (dataOrUpdater as (old?: T) => T)(entry.data) : dataOrUpdater;
    entry.updatedAt = Date.now();
    entry.status = 'success';
    scheduleGc(id, entry, gcTimeDefault);
    notify(entry);
  }

  function getData<T>(key: QueryKey): T | undefined {
    return cache.get(keyToStr(key))?.data as T | undefined;
  }

  function getState<T>(key: QueryKey): QueryState<T> | null {
    const entry = cache.get(keyToStr(key)) as CacheEntry<T> | undefined;
    return entry ? toQueryState(entry) : null;
  }

  function subscribe<T = unknown>(key: QueryKey, listener: (state: QueryState<T>) => void) {
    const entry = ensureEntry<T>(key);
    entry.observers.add(listener);
    listener(toQueryState(entry));
    return () => entry.observers.delete(listener);
  }

  function mutation<TData, TVariables = void>(
    mutationFn: (variables: TVariables) => Promise<TData>,
    mutOpts?: { retry?: number | false; retryDelay?: number | ((attempt: number) => number) },
  ) {
    const idleEntry: MutationEntry<TData> = { data: undefined, error: null, status: 'idle', updatedAt: 0 };
    let entry: MutationEntry<TData> = { ...idleEntry };
    const observers = new Set<(state: MutationState<TData>) => void>();

    function notifyMutation() {
      const snap = toMutationState(entry);
      observers.forEach((fn) => {
        try {
          fn(snap);
        } catch {}
      });
    }

    return {
      getState(): MutationState<TData> {
        return toMutationState(entry);
      },

      async mutate(variables: TVariables): Promise<TData> {
        const { times, delay, backoff } = getRetryConfig(mutOpts?.retry ?? false, mutOpts?.retryDelay, 0);
        entry = { data: undefined, error: null, status: 'pending', updatedAt: 0 };
        notifyMutation();
        try {
          const data = await retry(() => mutationFn(variables), { backoff, delay, times });
          entry = { data, error: null, status: 'success', updatedAt: Date.now() };
          notifyMutation();
          return data;
        } catch (err) {
          entry = { data: undefined, error: toError(err), status: 'error', updatedAt: Date.now() };
          notifyMutation();
          throw entry.error;
        }
      },

      reset() {
        entry = { ...idleEntry };
        notifyMutation();
      },

      subscribe(listener: (state: MutationState<TData>) => void) {
        observers.add(listener);
        listener(toMutationState(entry));
        return () => observers.delete(listener);
      },
    };
  }

  return {
    clear: clearCache,
    getData,
    getState,
    invalidate,
    mutation,
    prefetch,
    query: fetchQuery,
    setData,
    subscribe,
  };
}

/* -------------------- Unified Client -------------------- */

export function createClient(opts: ClientOptions = {}) {
  const { staleTime, gcTime, ...httpOpts } = opts;
  const http = createHttpClient(httpOpts);
  const qc = createQueryClient({ gcTime, staleTime });

  return {
    delete: http.delete,
    get: http.get,
    patch: http.patch,
    post: http.post,
    put: http.put,
    request: http.request,
    setHeaders: http.setHeaders,
    use: http.use,
    clear: qc.clear,
    getData: qc.getData,
    getState: qc.getState,
    invalidate: qc.invalidate,
    mutation: qc.mutation,
    prefetch: qc.prefetch,
    query: qc.query,
    setData: qc.setData,
    subscribe: qc.subscribe,
  };
}

export type HttpClient = ReturnType<typeof createHttpClient>;
export type QueryClient = ReturnType<typeof createQueryClient>;
export type Client = ReturnType<typeof createClient>;
