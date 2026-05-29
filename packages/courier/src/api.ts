import type { HttpRequestConfig, Params } from './url';

import { HttpError } from './errors';
import { parseResponse } from './response';
import { buildRequestInit, stableStringify } from './serialize';
import {
  buildTimeoutSignal,
  createTransportCore,
  validateTimeout,
  type FetchContext,
  type Interceptor,
  type TransportCore,
  type TransportOptions,
} from './transport';
import { buildUrl } from './url';

export type { FetchContext, Interceptor };

// DELETE is HTTP-idempotent (repeating it produces the same server state), so it
// is included in auto-dedup by default.
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'DELETE']);

function getDedupeKey(
  method: string,
  url: string,
  responseType: string,
  dedupeKey: HttpRequestConfig['dedupeKey'],
): string | undefined {
  if (IDEMPOTENT_METHODS.has(method)) {
    // Key on method + URL + responseType only. Headers are uniform within a
    // single client instance and should not prevent deduplication when a token
    // refresh updates globalHeaders mid-flight.
    return `${method}:${url}:${responseType}`;
  }

  if (dedupeKey === undefined) {
    return undefined;
  }

  return `${method}:${url}:${stableStringify(dedupeKey)}`;
}

export function createApi(opts?: TransportOptions, sharedTransport?: TransportCore) {
  const ownTransport = !sharedTransport;
  const transport = sharedTransport ?? createTransportCore(opts);
  const inFlight = new Map<string, Promise<unknown>>();

  async function execute<T>(
    init: RequestInit,
    full: string,
    m: string,
    responseType: HttpRequestConfig['responseType'],
  ): Promise<T> {
    const signal = init.signal as AbortSignal | undefined;
    let res: Response;

    try {
      res = await transport.dispatch({ init, url: full });
    } catch (err) {
      throw HttpError.fromCause(err, m, full, signal);
    }

    if (!res.ok) {
      // For error responses: parse body using normal content-type detection,
      // fall back to text for unknown content-types (better than blob for debugging).
      let body: unknown;

      try {
        body = await parseResponse(res, responseType ?? 'auto');
      } catch {
        body = await res.text().catch(() => '');
      }

      throw HttpError.fromResponse(res, body, m, full);
    }

    try {
      return (await parseResponse(res, responseType ?? 'auto')) as T;
    } catch (err) {
      throw HttpError.fromCause(err, m, full, signal);
    }
  }

  async function request<T, P extends string = string>(
    method: string,
    url: P,
    config: HttpRequestConfig<P> = {} as HttpRequestConfig<P>,
  ) {
    if (transport.disposed) throw new Error('[courier] ApiClient has been disposed');

    const full = buildUrl(transport.baseUrl, url, config.params as Params | undefined, config.query);
    const m = method.toUpperCase();
    const {
      body,
      dedupe = true,
      dedupeKey,
      headers,
      params, // consumed by buildUrl
      query, // consumed by buildUrl
      responseType,
      signal: extSignal,
      timeout: cfgTimeout,
      ...rest // clean RequestInit passthrough
    } = config as HttpRequestConfig;

    if (cfgTimeout !== undefined) validateTimeout(cfgTimeout);

    const mergedHeaders = transport.mergeHeaders(headers);
    const requestDedupeKey = dedupe ? getDedupeKey(m, full, responseType ?? 'auto', dedupeKey) : undefined;

    if (requestDedupeKey) {
      const existing = inFlight.get(requestDedupeKey);

      if (existing) return existing as Promise<T>;
    }

    const requestAc = new AbortController();
    const untrack = transport.track(requestAc);
    const combinedExt = extSignal ? AbortSignal.any([extSignal, requestAc.signal]) : requestAc.signal;
    const signal = buildTimeoutSignal(cfgTimeout ?? transport.timeout, combinedExt);

    const init = buildRequestInit(m, mergedHeaders, body, signal, rest);
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
      inFlight.clear();

      if (ownTransport) transport.dispose();
    },
    get disposed() {
      return transport.disposed;
    },
    get: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('GET', url, cfg),
    getHeaders: transport.getHeaders,
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
