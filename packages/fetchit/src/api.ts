import type { HttpRequestConfig, Params } from './url';

import { HttpError } from './errors';
import { CONTENT_TYPE_JSON, HEADER_CONTENT_TYPE, parseResponse } from './response';
import { isBodyInit, serializeBodyKey, stableStringify } from './serialize';
import { timeoutSignal } from './signals';
import { buildUrl } from './url';

export type FetchContext = { init: RequestInit; url: string };

export type Interceptor = (ctx: FetchContext, next: (ctx: FetchContext) => Promise<Response>) => Promise<Response>;

export type ApiClientOptions = {
  baseUrl?: string;
  dedupe?: boolean;
  headers?: Record<string, string>;
  logger?: (level: 'info' | 'warn' | 'error', msg: string, meta?: unknown) => void;
  timeout?: number;
};

const DEFAULT_TIMEOUT = 30_000;
// DELETE is HTTP-idempotent (repeating it produces the same server state), so it
// is included in auto-dedup by default. Pass `dedupe: false` per-request to opt out.
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'DELETE']);

export function createApi(opts: ApiClientOptions = {}) {
  const { baseUrl = '', dedupe = false, headers: initialHeaders = {}, logger, timeout = DEFAULT_TIMEOUT } = opts;

  const globalHeaders: Record<string, string> = Object.fromEntries(
    Object.entries(initialHeaders).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const inFlight = new Map<string, Promise<unknown>>();
  const activeControllers = new Set<AbortController>();
  const interceptors: Interceptor[] = [];
  let pipeline: ((ctx: FetchContext) => Promise<Response>) | null = null;
  let _disposed = false;

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

  async function execute<T>(
    init: RequestInit,
    full: string,
    m: string,
    dedupeKey: string | undefined,
    requestAc: AbortController,
  ): Promise<T> {
    const start = Date.now();

    try {
      const res = await getPipeline()({ init, url: full });
      const parsed = await parseResponse(res);

      if (!res.ok) {
        logger?.(res.status >= 500 ? 'error' : 'warn', `${m} ${full} - ${res.status}`);
        throw HttpError.fromResponse(res, parsed, m, full);
      }

      logger?.('info', `${m} ${full} - ${res.status} (${Date.now() - start}ms)`);

      return parsed as T;
    } catch (err) {
      if (err instanceof HttpError) throw err;

      logger?.('error', `${m} ${full} - ERROR`, err);
      throw HttpError.fromCause(err, m, full);
    } finally {
      if (dedupeKey) inFlight.delete(dedupeKey);

      activeControllers.delete(requestAc);
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
      params, // excluded from ...rest — already consumed by buildUrl above
      query, // excluded from ...rest — already consumed by buildUrl above
      signal: extSignal,
      timeout: cfgTimeout,
      ...rest // clean RequestInit passthrough
    } = config as HttpRequestConfig;

    // Dedupe idempotent methods by default; non-idempotent only when explicitly opted in
    const shouldDedupe = cfgDedupe === true || (cfgDedupe !== false && (dedupe || IDEMPOTENT_METHODS.has(m)));

    const perRequestHeaders = headers
      ? Object.fromEntries(Object.entries(headers as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]))
      : undefined;
    const mergedHeaders = { ...globalHeaders, ...perRequestHeaders };
    const dedupeKey = shouldDedupe
      ? `${m}:${full}:${stableStringify(mergedHeaders)}:${serializeBodyKey(body)}`
      : undefined;

    if (dedupeKey) {
      const existing = inFlight.get(dedupeKey);

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
      init.headers = { [HEADER_CONTENT_TYPE]: CONTENT_TYPE_JSON, ...(init.headers as Record<string, string>) };
    } else if (body !== undefined) {
      init.body = body as BodyInit;
    }

    const p = execute<T>(init, full, m, dedupeKey, requestAc);

    if (dedupeKey) inFlight.set(dedupeKey, p);

    return p as Promise<T>;
  }

  return {
    delete: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('DELETE', url, cfg),
    dispose(): void {
      _disposed = true;
      for (const ac of activeControllers) ac.abort();
      activeControllers.clear();
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
        const k = key.toLowerCase();

        if (value === undefined) delete globalHeaders[k];
        else globalHeaders[k] = value;
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

export type ApiClient = ReturnType<typeof createApi>;
