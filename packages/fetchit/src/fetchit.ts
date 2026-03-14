/* ============================================
   fetchit — Lightweight HTTP client with query caching
   ============================================ */

import { retry } from '@vielzeug/toolkit';

/* -------------------- Types -------------------- */

export type QueryKey = readonly unknown[];
export type Unsubscribe = () => void;

export type QueryStatus = 'idle' | 'pending' | 'success' | 'error';

export type QueryState<T = unknown> = {
  readonly isError: boolean;
  readonly isIdle: boolean;
  readonly isPending: boolean;
  readonly isSuccess: boolean;
} & (
  | { data: undefined; error: null; status: 'idle'; updatedAt: number }
  | { data: T | undefined; error: null; status: 'pending'; updatedAt: number }
  | { data: T; error: null; status: 'success'; updatedAt: number }
  | { data: T | undefined; error: Error; status: 'error'; updatedAt: number }
);

export type MutationState<TData = unknown> = {
  readonly isError: boolean;
  readonly isIdle: boolean;
  readonly isPending: boolean;
  readonly isSuccess: boolean;
} & (
  | { data: undefined; error: null; status: 'idle'; updatedAt: number }
  | { data: undefined; error: null; status: 'pending'; updatedAt: number }
  | { data: TData; error: null; status: 'success'; updatedAt: number }
  | { data: undefined; error: Error; status: 'error'; updatedAt: number }
);

export type RetryOptions = {
  retry?: number | false;
  /**
   * Delay between retry attempts in ms, or a zero-based function where
   * `attempt` is the number of failures so far (0 = waiting before the 2nd try).
   * Defaults to exponential backoff: 1 s → 2 s → … capped at 30 s.
   */
  retryDelay?: number | ((attempt: number) => number);
};

export type MutationOptions<TData = unknown, TVariables = unknown> = RetryOptions & {
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  onSuccess?: (data: TData, variables: TVariables) => void;
};

export type QueryFnContext = {
  /** The cache key for the query that triggered this fetch. */
  key: QueryKey;
  signal: AbortSignal;
};

export type QueryOptions<T> = {
  enabled?: boolean;
  fn: (ctx: QueryFnContext) => Promise<T>;
  gcTime?: number;
  key: QueryKey;
  staleTime?: number;
} & RetryOptions;

export type ParamValue = string | number | boolean | undefined;
export type Params = Record<string, ParamValue>;

// Type-safe path params: extracts {param} placeholders from a path string
type ExtractPathParams<P extends string> = P extends `${string}{${infer K}}${infer R}`
  ? K | ExtractPathParams<R>
  : never;

type PathConfig<P extends string> = [ExtractPathParams<P>] extends [never]
  ? { params?: never }
  : { params: Record<ExtractPathParams<P>, string | number | boolean> };

export type HttpRequestConfig<P extends string = string> = Omit<RequestInit, 'body' | 'method'> &
  PathConfig<P> & {
    body?: unknown;
    dedupe?: boolean;
    query?: Params;
    timeout?: number;
  };

export type FetchContext = { init: RequestInit; url: string };

export type Interceptor = (ctx: FetchContext, next: (ctx: FetchContext) => Promise<Response>) => Promise<Response>;

export type ApiClientOptions = {
  baseUrl?: string;
  dedupe?: boolean;
  headers?: Record<string, string>;
  logger?: (level: 'info' | 'warn' | 'error', msg: string, meta?: unknown) => void;
  timeout?: number;
};

export type QueryClientOptions = {
  gcTime?: number;
  staleTime?: number;
} & RetryOptions;

/* -------------------- Constants -------------------- */

const DEFAULT_GC = 5 * 60_000;
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY = 1;
const CONTENT_TYPE_JSON = 'application/json';
const HEADER_CONTENT_TYPE = 'content-type';
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'DELETE']);

/* -------------------- Errors -------------------- */

export class HttpError extends Error {
  readonly name = 'HttpError';
  readonly url: string;
  readonly method: string;
  readonly status?: number;
  readonly data?: unknown;
  readonly response?: Response;
  /** True when the request failed due to a timeout (`AbortSignal.timeout`). */
  readonly isTimeout: boolean;
  /** True when the request was cancelled via an `AbortSignal`. */
  readonly isAborted: boolean;

  constructor(opts: {
    cause?: unknown;
    data?: unknown;
    message: string;
    method: string;
    response?: Response;
    status?: number;
    url: string;
  }) {
    super(opts.message, { cause: opts.cause });
    this.url = opts.url;
    this.method = opts.method;
    this.status = opts.status;
    this.data = opts.data;
    this.response = opts.response;

    const causeName = opts.cause instanceof Error ? opts.cause.name : undefined;

    this.isTimeout = causeName === 'TimeoutError';
    this.isAborted = causeName === 'AbortError';
  }

  static is(err: unknown, status?: number): err is HttpError {
    return err instanceof HttpError && (status === undefined || err.status === status);
  }
}

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

/* -------------------- URL & Body Utilities -------------------- */

function buildUrl(base: string, path: string, params?: Params, query?: Params) {
  const baseClean = base.replace(/\/+$/, '');
  let pathClean = path.replace(/^\/+/, '');

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        pathClean = pathClean.replaceAll(`{${key}}`, encodeURIComponent(String(value)));
      }
    }
  }

  const url = baseClean && pathClean ? `${baseClean}/${pathClean}` : baseClean || pathClean;

  if (!query) return url;

  const qs = Object.entries(query)
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
    ArrayBuffer.isView(value)
  );
}

function stableStringify(value: unknown): string {
  if (value === undefined) return 'undefined';

  if (value === null) return 'null';

  if (typeof value !== 'object') return JSON.stringify(value);

  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const rec = value as Record<string, unknown>;
  const keys = Object.keys(rec)
    .filter((k) => rec[k] !== undefined)
    .sort();

  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(rec[k])}`).join(',')}}`;
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
    // Circular / unserializable — fall through so JSON.stringify raises the real error
    return '[Object]';
  }
}

/* -------------------- Signal & Timeout -------------------- */

function timeoutSignal(timeoutMs: number, external?: AbortSignal | null): AbortSignal | undefined {
  if (timeoutMs === 0 || timeoutMs === Number.POSITIVE_INFINITY) {
    return external ?? undefined;
  }

  const t = AbortSignal.timeout(timeoutMs);

  return external ? AbortSignal.any([t, external]) : t;
}

/* -------------------- Response Parsing -------------------- */

async function parseResponse(res: Response): Promise<unknown> {
  if (res.status === 204) return;

  const contentType = res.headers.get(HEADER_CONTENT_TYPE) ?? '';

  if (contentType.includes(CONTENT_TYPE_JSON)) return res.json();

  if (contentType.startsWith('text/')) return res.text();

  return res.blob();
}

/* -------------------- Retry Config -------------------- */

function getRetryConfig(retryCount: number | false, userDelay: number | ((attempt: number) => number) | undefined) {
  const times = retryCount === false ? 1 : retryCount + 1;

  if (typeof userDelay === 'function') return { retryDelay: userDelay, times };

  if (typeof userDelay === 'number') return { delay: userDelay, times };

  // Default: exponential backoff 1 s → 2 s → … capped at 30 s
  return { backoff: (_a: number, cur: number) => Math.min(cur * 2, 30_000), delay: 1000, times };
}

/* -------------------- HTTP / API Client -------------------- */

export function createApi(opts: ApiClientOptions = {}) {
  const { baseUrl = '', dedupe = false, headers: initialHeaders = {}, logger, timeout = DEFAULT_TIMEOUT } = opts;

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

  async function handleResponse<T>(res: Response, m: string, full: string, start: number): Promise<T> {
    const parsed = await parseResponse(res);

    if (!res.ok) {
      logger?.(res.status >= 500 ? 'error' : 'warn', `${m} ${full} - ${res.status}`);
      throw new HttpError({
        data: parsed,
        message: res.statusText || 'Non-OK response',
        method: m,
        response: res,
        status: res.status,
        url: full,
      });
    }

    logger?.('info', `${m} ${full} - ${res.status} (${Date.now() - start}ms)`, { res: parsed });

    return parsed as T;
  }

  async function execute<T>(init: RequestInit, full: string, m: string, dedupeKey: string | undefined): Promise<T> {
    const start = Date.now();

    try {
      const res = await getPipeline()({ init, url: full });

      return await handleResponse<T>(res, m, full, start);
    } catch (err) {
      if (err instanceof HttpError) throw err;

      logger?.('error', `${m} ${full} - ERROR`, err);
      throw new HttpError({ cause: err, message: toError(err).message, method: m, url: full });
    } finally {
      if (dedupeKey) inFlight.delete(dedupeKey);
    }
  }

  async function request<T, P extends string = string>(
    method: string,
    url: P,
    config: HttpRequestConfig<P> = {} as HttpRequestConfig<P>,
  ) {
    if (_disposed) throw new Error('[fetchit] ApiClient has been disposed');

    const full = buildUrl(baseUrl, url, config.params as Params | undefined, config.query);
    const m = method.toUpperCase();
    const {
      body,
      dedupe: cfgDedupe,
      headers,
      params,
      query,
      signal: extSignal,
      timeout: cfgTimeout,
      ...rest
    } = config as HttpRequestConfig;

    // Dedupe idempotent methods by default; non-idempotent only when explicitly opted in
    const shouldDedupe = cfgDedupe === true || (cfgDedupe !== false && (dedupe || IDEMPOTENT_METHODS.has(m)));

    const mergedHeaders = { ...globalHeaders, ...(headers as Record<string, string> | undefined) };
    const dedupeKey = shouldDedupe
      ? `${m}:${full}:${stableStringify(mergedHeaders)}:${serializeBodyKey(body)}`
      : undefined;

    if (dedupeKey) {
      const existing = inFlight.get(dedupeKey);

      if (existing) return existing as Promise<T>;
    }

    const signal = timeoutSignal(cfgTimeout ?? timeout, extSignal ?? null);

    const init: RequestInit = {
      ...rest,
      headers: mergedHeaders,
      method: m,
      signal,
    };

    if (body !== undefined && !isBodyInit(body)) {
      init.body = JSON.stringify(body);
      init.headers = { [HEADER_CONTENT_TYPE]: CONTENT_TYPE_JSON, ...(init.headers as Record<string, string>) };
    } else if (body !== undefined) {
      init.body = body as BodyInit;
    }

    const p = execute<T>(init, full, m, dedupeKey);

    if (dedupeKey) inFlight.set(dedupeKey, p);

    return p as Promise<T>;
  }

  let _disposed = false;

  return {
    delete: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('DELETE', url, cfg),
    dispose(): void {
      _disposed = true;
      inFlight.clear();
      interceptors.length = 0;
      pipeline = null;
    },
    get disposed() {
      return _disposed;
    },
    get: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('GET', url, cfg),
    headers(updates: Record<string, string | undefined>) {
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) delete globalHeaders[key];
        else globalHeaders[key] = value;
      }
    },
    patch: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('PATCH', url, cfg),
    post: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('POST', url, cfg),
    put: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('PUT', url, cfg),
    request,
    [Symbol.dispose]() {
      this.dispose();
    },
    use,
  };
}

/* -------------------- Query Client -------------------- */

type CacheEntry<T = unknown> = {
  data: T | undefined;
  error: Error | null;
  gcTimer: ReturnType<typeof setTimeout> | undefined;
  inflight: { controller: AbortController; promise: Promise<T> } | null;
  key: QueryKey;
  observers: Set<(state: QueryState<T>) => void>;
  status: QueryStatus;
  updatedAt: number;
};

function makeState<T>(entry: {
  data: T | undefined;
  error: Error | null;
  status: QueryStatus;
  updatedAt: number;
}): QueryState<T> {
  const { data, error, status, updatedAt } = entry;

  return {
    data,
    error,
    isError: status === 'error',
    isIdle: status === 'idle',
    isPending: status === 'pending',
    isSuccess: status === 'success',
    status,
    updatedAt,
  } as unknown as QueryState<T>;
}

function dispatch<T>(observers: Set<(s: T) => void>, state: T) {
  observers.forEach((fn) => {
    try {
      fn(state);
    } catch (err) {
      console.error('[fetchit] observer threw', err);
    }
  });
}

export function createQuery(opts?: QueryClientOptions) {
  const staleTimeDefault = opts?.staleTime ?? 0;
  const gcTimeDefault = opts?.gcTime ?? DEFAULT_GC;
  const retryDefault = opts?.retry ?? DEFAULT_RETRY;
  const retryDelayDefault = opts?.retryDelay;

  const cache = new Map<string, CacheEntry>();

  function makeEntry<T>(key: QueryKey): CacheEntry<T> {
    return {
      data: undefined,
      error: null,
      gcTimer: undefined,
      inflight: null,
      key,
      observers: new Set(),
      status: 'idle',
      updatedAt: 0,
    };
  }

  function ensureEntry<T>(key: QueryKey): CacheEntry<T> {
    const id = stableStringify(key);
    let e = cache.get(id) as CacheEntry<T> | undefined;

    if (!e) {
      e = makeEntry<T>(key);
      cache.set(id, e as CacheEntry<unknown>);
    }

    return e;
  }

  function notify<T>(entry: CacheEntry<T>) {
    dispatch(entry.observers, makeState(entry));
  }

  function cancelGcTimer(entry: Pick<CacheEntry, 'gcTimer'>) {
    if (entry.gcTimer) {
      clearTimeout(entry.gcTimer);
      entry.gcTimer = undefined;
    }
  }

  function scheduleGc<T>(id: string, entry: CacheEntry<T>, gcTime: number) {
    cancelGcTimer(entry);

    if (gcTime === 0) {
      cache.delete(id);
    } else if (gcTime > 0 && gcTime !== Number.POSITIVE_INFINITY) {
      entry.gcTimer = setTimeout(() => {
        entry.gcTimer = undefined;
        cache.delete(id);
      }, gcTime);
    }
  }

  function cleanupEntry(entry: CacheEntry) {
    entry.inflight?.controller.abort();
    clearTimeout(entry.gcTimer);
    entry.gcTimer = undefined;
  }

  function isKeyOrPrefix(entryKey: QueryKey, prefix: QueryKey): boolean {
    if (prefix.length > entryKey.length) return false;

    return prefix.every((seg, i) => stableStringify(seg) === stableStringify(entryKey[i]));
  }

  async function fetchQuery<T>(options: QueryOptions<T> & { enabled: false }): Promise<T | undefined>;
  async function fetchQuery<T>(options: QueryOptions<T>): Promise<T>;
  async function fetchQuery<T>(options: QueryOptions<T>): Promise<T | undefined> {
    if (_disposed) throw new Error('[fetchit] QueryClient has been disposed');

    const {
      enabled = true,
      fn: queryFn,
      gcTime = gcTimeDefault,
      key: queryKey,
      retry: retryCount = retryDefault,
      retryDelay = retryDelayDefault,
      staleTime = staleTimeDefault,
    } = options;

    if (!enabled) return cache.get(stableStringify(queryKey))?.data as T | undefined;

    const id = stableStringify(queryKey);
    const entry = ensureEntry<T>(queryKey);

    if (entry.status === 'success' && Date.now() - entry.updatedAt < staleTime) {
      return entry.data as T;
    }

    if (entry.inflight) return entry.inflight.promise;

    const controller = new AbortController();

    entry.status = 'pending';
    notify(entry);

    const retryOpts = getRetryConfig(retryCount, retryDelay);

    const p = (async () => {
      try {
        const data = await retry(() => queryFn({ key: queryKey, signal: controller.signal }), {
          ...retryOpts,
          signal: controller.signal,
        });

        entry.data = data;
        entry.status = 'success';
        entry.updatedAt = Date.now();
        entry.error = null;
        entry.inflight = null;
        scheduleGc(id, entry, gcTime);
        notify(entry);

        return data;
      } catch (err) {
        const error = toError(err);
        const isAborted = controller.signal.aborted || error.name === 'AbortError';

        if (isAborted) {
          entry.status = 'idle';
          entry.error = null;
        } else {
          entry.status = 'error';
          entry.error = error;
          entry.updatedAt = Date.now();
        }

        entry.inflight = null;
        notify(entry);
        throw error;
      }
    })();

    entry.inflight = { controller, promise: p };

    return p;
  }

  async function prefetch<T>(options: Omit<QueryOptions<T>, 'enabled'>): Promise<T | undefined> {
    return fetchQuery<T>({ ...options, enabled: true }).catch(() => undefined);
  }

  function evictEntry(id: string, entry: CacheEntry) {
    cleanupEntry(entry);

    if (entry.observers.size > 0) {
      entry.status = 'idle';
      entry.data = undefined;
      entry.error = null;
      notify(entry);
    } else {
      cache.delete(id);
    }
  }

  function invalidate(key: QueryKey) {
    for (const [id, entry] of cache) {
      if (isKeyOrPrefix(entry.key, key)) evictEntry(id, entry);
    }
  }

  function clearCache() {
    for (const [id, entry] of cache) {
      evictEntry(id, entry);
    }
    // evictEntry intentionally keeps entries with active observers in the cache
    // (reset to idle). Do not call cache.clear() here — it would orphan live subscriptions.
  }

  function set<T>(key: QueryKey, data: T): void;
  function set<T>(key: QueryKey, updater: (old: T | undefined) => T): void;
  function set<T>(key: QueryKey, dataOrUpdater: T | ((old: T | undefined) => T)) {
    const id = stableStringify(key);
    const entry = ensureEntry<T>(key);

    entry.data =
      typeof dataOrUpdater === 'function' ? (dataOrUpdater as (old: T | undefined) => T)(entry.data) : dataOrUpdater;
    entry.updatedAt = Date.now();
    entry.status = 'success';
    scheduleGc(id, entry, gcTimeDefault);
    notify(entry);
  }

  function get<T>(key: QueryKey): T | undefined {
    return cache.get(stableStringify(key))?.data as T | undefined;
  }

  function getState<T>(key: QueryKey): QueryState<T> | null {
    const entry = cache.get(stableStringify(key)) as CacheEntry<T> | undefined;

    return entry ? makeState(entry) : null;
  }

  function subscribe<T = unknown>(key: QueryKey, listener: (state: QueryState<T>) => void): Unsubscribe {
    const id = stableStringify(key);
    const entry = ensureEntry<T>(key);

    cancelGcTimer(entry);
    entry.observers.add(listener);
    listener(makeState(entry));

    return () => {
      entry.observers.delete(listener);

      if (entry.observers.size === 0 && entry.status === 'idle') {
        cache.delete(id);
      }
    };
  }

  function cancel(key: QueryKey) {
    const id = stableStringify(key);
    const entry = cache.get(id);

    if (!entry) return;

    entry.inflight?.controller.abort();
    entry.inflight = null;

    if (entry.status === 'pending') {
      entry.status = entry.data !== undefined ? 'success' : 'idle';

      if (entry.status === 'success') scheduleGc(id, entry, gcTimeDefault);

      notify(entry);

      if (entry.status === 'idle' && entry.observers.size === 0) cache.delete(id);
    }
  }

  let _disposed = false;

  return {
    cancel,
    clear: clearCache,
    dispose(): void {
      _disposed = true;
      cache.forEach(cleanupEntry);
      cache.clear();
    },
    get disposed() {
      return _disposed;
    },
    get,
    getState,
    invalidate,
    prefetch,
    query: fetchQuery,
    set,
    subscribe,
    [Symbol.dispose]() {
      this.dispose();
    },
  };
}

/* -------------------- Standalone Mutation -------------------- */

export function createMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  mutOpts?: MutationOptions<TData, TVariables>,
) {
  const retryConfig = getRetryConfig(mutOpts?.retry ?? false, mutOpts?.retryDelay);
  let snap: { data: TData | undefined; error: Error | null; status: QueryStatus; updatedAt: number } = {
    data: undefined,
    error: null,
    status: 'idle',
    updatedAt: 0,
  };
  const observers = new Set<(state: MutationState<TData>) => void>();

  function notify() {
    dispatch(observers, makeState(snap) as unknown as MutationState<TData>);
  }

  return {
    getState(): MutationState<TData> {
      return makeState(snap) as unknown as MutationState<TData>;
    },

    async mutate(
      variables: TVariables,
      callOpts?: { retry?: number | false; retryDelay?: number | ((attempt: number) => number); signal?: AbortSignal },
    ): Promise<TData> {
      if (snap.status === 'pending') {
        throw new Error('[fetchit] mutation already in flight — await the previous call or call reset() first');
      }

      const retryOpts =
        callOpts?.retry !== undefined || callOpts?.retryDelay !== undefined
          ? getRetryConfig(callOpts.retry ?? mutOpts?.retry ?? false, callOpts.retryDelay ?? mutOpts?.retryDelay)
          : retryConfig;

      snap = { data: undefined, error: null, status: 'pending', updatedAt: 0 };
      notify();

      try {
        const data = await retry(() => mutationFn(variables), { ...retryOpts, signal: callOpts?.signal });

        snap = { data, error: null, status: 'success', updatedAt: Date.now() };
        notify();
        mutOpts?.onSuccess?.(data, variables);
        mutOpts?.onSettled?.(data, null, variables);

        return data;
      } catch (err) {
        const error = toError(err);

        snap = { data: undefined, error, status: 'error', updatedAt: Date.now() };
        notify();
        mutOpts?.onError?.(error, variables);
        mutOpts?.onSettled?.(undefined, error, variables);
        throw error;
      }
    },

    reset() {
      snap = { data: undefined, error: null, status: 'idle', updatedAt: 0 };
      notify();
    },

    subscribe(listener: (state: MutationState<TData>) => void): Unsubscribe {
      observers.add(listener);
      listener(makeState(snap) as unknown as MutationState<TData>);

      return () => observers.delete(listener);
    },
  };
}

export type ApiClient = ReturnType<typeof createApi>;
export type QueryClient = ReturnType<typeof createQuery>;
export type Mutation<TData, TVariables = void> = ReturnType<typeof createMutation<TData, TVariables>>;
export { stableStringify as serializeKey };
