import type { HttpRequestConfig, Params } from './url';

import { HttpError } from './errors';
import { parseResponse } from './response';
import { isBodyInit, stableStringify } from './serialize';
import { buildUrl } from './url';

export type FetchContext = { init: RequestInit; url: string };

export type Interceptor = (ctx: FetchContext, next: (ctx: FetchContext) => Promise<Response>) => Promise<Response>;

export type ApiClientOptions = {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  headers?: Record<string, string>;
  timeout?: number;
};

const DEFAULT_TIMEOUT = 30_000;
// DELETE is HTTP-idempotent (repeating it produces the same server state), so it
// is included in auto-dedup by default.
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'DELETE']);

function validateTimeout(timeoutMs: number): void {
  if ((timeoutMs <= 0 || !Number.isFinite(timeoutMs)) && timeoutMs !== Number.POSITIVE_INFINITY) {
    throw new TypeError('[fetchit] timeout must be a positive number or Infinity');
  }
}

function timeoutSignal(timeoutMs: number, external?: AbortSignal | null): AbortSignal | undefined {
  if (timeoutMs === Number.POSITIVE_INFINITY) {
    return external ?? undefined;
  }

  const t = AbortSignal.timeout(timeoutMs);

  return external ? AbortSignal.any([t, external]) : t;
}

function getDedupeKey(
  method: string,
  url: string,
  mergedHeaders: Record<string, string>,
  responseType: string,
  dedupeKey: HttpRequestConfig['dedupeKey'],
): string | undefined {
  if (IDEMPOTENT_METHODS.has(method)) {
    // Include merged headers and responseType so requests with different effective
    // response shapes (e.g. different Accept, Authorization, or responseType) are
    // never collapsed into a shared in-flight promise.
    return `${method}:${url}:${stableStringify(mergedHeaders)}:${responseType}`;
  }

  if (dedupeKey === undefined) {
    return undefined;
  }

  return `${method}:${url}:${stableStringify(dedupeKey)}`;
}

export function createApi(opts: ApiClientOptions = {}) {
  const {
    baseUrl = '',
    fetch: fetchFn = globalThis.fetch,
    headers: initialHeaders = {},
    timeout = DEFAULT_TIMEOUT,
  } = opts;

  validateTimeout(timeout);

  const globalHeaders: Record<string, string> = Object.fromEntries(
    Object.entries(initialHeaders).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const inFlight = new Map<string, Promise<unknown>>();
  const activeControllers = new Set<AbortController>();
  const interceptors: Interceptor[] = [];
  let disposed = false;
  let cachedPipeline: ((ctx: FetchContext) => Promise<Response>) | null = null;

  function use(interceptor: Interceptor): () => void {
    interceptors.push(interceptor);
    cachedPipeline = null;

    return () => {
      const i = interceptors.indexOf(interceptor);

      if (i !== -1) {
        interceptors.splice(i, 1);
        cachedPipeline = null;
      }
    };
  }

  function getPipeline(): (ctx: FetchContext) => Promise<Response> {
    const base: (ctx: FetchContext) => Promise<Response> = (ctx) => fetchFn(ctx.url, ctx.init);

    if (cachedPipeline) return cachedPipeline;

    cachedPipeline =
      interceptors.length === 0
        ? base
        : interceptors.reduceRight<(ctx: FetchContext) => Promise<Response>>(
            (next, interceptor) => (ctx) => interceptor(ctx, next),
            base,
          );

    return cachedPipeline;
  }

  async function execute<T>(
    init: RequestInit,
    full: string,
    m: string,
    responseType: HttpRequestConfig['responseType'],
  ): Promise<T> {
    try {
      const res = await getPipeline()({ init, url: full });
      const parsed = await parseResponse(res, responseType ?? 'auto', { throwOnUnknownContentType: res.ok });

      if (!res.ok) {
        throw HttpError.fromResponse(res, parsed, m, full);
      }

      return parsed as T;
    } catch (err) {
      if (err instanceof HttpError) throw err;

      throw HttpError.fromCause(err, m, full, { aborted: init.signal?.aborted, signalReason: init.signal?.reason });
    }
  }

  async function request<T, P extends string = string>(
    method: string,
    url: P,
    config: HttpRequestConfig<P> = {} as HttpRequestConfig<P>,
  ) {
    if (disposed) throw new Error('[fetchit] ApiClient has been disposed');

    const full = buildUrl(baseUrl, url, config.params as Params | undefined, config.query);
    const m = method.toUpperCase();
    const {
      body,
      dedupeKey,
      headers,
      params, // excluded from ...rest — already consumed by buildUrl above
      query, // excluded from ...rest — already consumed by buildUrl above
      responseType,
      signal: extSignal,
      timeout: cfgTimeout,
      ...rest // clean RequestInit passthrough
    } = config as HttpRequestConfig;

    if (cfgTimeout !== undefined) validateTimeout(cfgTimeout);

    const perRequestHeaders = headers
      ? Object.fromEntries(Object.entries(headers as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]))
      : undefined;
    const mergedHeaders = { ...globalHeaders, ...perRequestHeaders };
    const requestDedupeKey = getDedupeKey(m, full, mergedHeaders, responseType ?? 'auto', dedupeKey);

    if (requestDedupeKey) {
      const existing = inFlight.get(requestDedupeKey);

      if (existing) return existing as Promise<T>;
    }

    const requestAc = new AbortController();

    activeControllers.add(requestAc);

    const combinedExt = extSignal ? AbortSignal.any([extSignal, requestAc.signal]) : requestAc.signal;
    const signal = timeoutSignal(cfgTimeout ?? timeout, combinedExt);

    const init: RequestInit = {
      ...rest,
      headers: mergedHeaders,
      method: m,
      signal,
    };

    if (body !== undefined && !isBodyInit(body)) {
      init.body = JSON.stringify(body);
      init.headers = { 'content-type': 'application/json', ...(init.headers as Record<string, string>) };
    } else if (body !== undefined) {
      init.body = body as BodyInit;
    }

    const p = execute<T>(init, full, m, responseType);

    if (requestDedupeKey) inFlight.set(requestDedupeKey, p);

    try {
      return (await p) as T;
    } finally {
      if (requestDedupeKey) inFlight.delete(requestDedupeKey);

      activeControllers.delete(requestAc);
    }
  }

  return {
    cancelAll(): void {
      // Note: narrow race — a request that starts after the abort signals fire but before
      // their in-flight promise settles may see an empty inFlight map and issue a redundant
      // request. This is an accepted trade-off for the simplicity of a synchronous clear.
      for (const ac of [...activeControllers]) ac.abort();
      activeControllers.clear();
      inFlight.clear();
    },
    delete: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('DELETE', url, cfg),
    dispose(): void {
      disposed = true;
      for (const ac of activeControllers) ac.abort();
      activeControllers.clear();
      inFlight.clear();
      interceptors.length = 0;
      cachedPipeline = null;
    },
    get disposed() {
      return disposed;
    },
    get: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('GET', url, cfg),
    headers(updates: Record<string, string | undefined>) {
      for (const [key, value] of Object.entries(updates)) {
        const k = key.toLowerCase();

        if (value === undefined) delete globalHeaders[k];
        else globalHeaders[k] = value;
      }
    },
    patch: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('PATCH', url, cfg),
    post: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('POST', url, cfg),
    put: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('PUT', url, cfg),
    request,
    [Symbol.dispose](): void {
      this.dispose();
    },
    use,
  };
}

export type ApiClient = ReturnType<typeof createApi>;
