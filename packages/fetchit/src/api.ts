import type { HttpRequestConfig, Params } from './url';

import { HttpError } from './errors';
import { parseResponse } from './response';
import { isBodyInit, stableStringify } from './serialize';
import {
  buildTimeoutSignal,
  createTransportCore,
  validateTimeout,
  type FetchContext,
  type Interceptor,
  type TransportOptions,
} from './transport';
import { buildUrl } from './url';

export type { FetchContext, Interceptor };
export type ApiClientOptions = TransportOptions;

// DELETE is HTTP-idempotent (repeating it produces the same server state), so it
// is included in auto-dedup by default.
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'DELETE']);

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
  const transport = createTransportCore(opts);
  const inFlight = new Map<string, Promise<unknown>>();

  async function execute<T>(
    init: RequestInit,
    full: string,
    m: string,
    responseType: HttpRequestConfig['responseType'],
  ): Promise<T> {
    try {
      const res = await transport.dispatch({ init, url: full });
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
    if (transport.disposed) throw new Error('[fetchit] ApiClient has been disposed');

    const full = buildUrl(transport.baseUrl, url, config.params as Params | undefined, config.query);
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
    const mergedHeaders = { ...transport.globalHeaders, ...perRequestHeaders };
    const requestDedupeKey = getDedupeKey(m, full, mergedHeaders, responseType ?? 'auto', dedupeKey);

    if (requestDedupeKey) {
      const existing = inFlight.get(requestDedupeKey);

      if (existing) return existing as Promise<T>;
    }

    const requestAc = new AbortController();
    const untrack = transport.track(requestAc);
    const combinedExt = extSignal ? AbortSignal.any([extSignal, requestAc.signal]) : requestAc.signal;
    const signal = buildTimeoutSignal(cfgTimeout ?? transport.timeout, combinedExt);

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

      untrack();
    }
  }

  return {
    cancelAll(): void {
      // Note: narrow race — a request that starts after the abort signals fire but before
      // their in-flight promise settles may see an empty inFlight map and issue a redundant
      // request. This is an accepted trade-off for the simplicity of a synchronous clear.
      transport.cancelAll();
      inFlight.clear();
    },
    delete: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('DELETE', url, cfg),
    dispose(): void {
      transport.dispose();
      inFlight.clear();
    },
    get disposed() {
      return transport.disposed;
    },
    get: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('GET', url, cfg),
    headers: transport.headers,
    patch: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('PATCH', url, cfg),
    post: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('POST', url, cfg),
    put: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('PUT', url, cfg),
    request,
    [Symbol.dispose](): void {
      this.dispose();
    },
    use: transport.use,
  };
}

export type ApiClient = ReturnType<typeof createApi>;
