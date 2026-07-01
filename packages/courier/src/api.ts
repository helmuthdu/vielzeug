import type { HttpRequestConfig, Params } from './url';

import { classifyRequestError, CourierDisposedError, CourierHttpError, CourierSchemaValidationError } from './errors';
import { parseResponse } from './response';
import { buildRequestInit, hash } from './serialize';
import {
  anySignal,
  buildTimeoutSignal,
  createTransportCore,
  type FetchContext,
  type Interceptor,
  type TransportCore,
  type TransportOptions,
  validateTimeout,
} from './transport';
import { buildUrl } from './url';

export type { FetchContext, Interceptor };

// Only safe + idempotent methods are auto-deduplicated. DELETE is idempotent but
// not safe (it produces a side-effect), so it must opt-in via explicit dedupeKey
// to avoid silently coalescing concurrent destructive requests.
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

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

  return `${method}:${url}:${hash(dedupeKey)}`;
}

export function createApi(opts?: TransportOptions & { transport?: TransportCore }) {
  const { transport: sharedTransport, ...transportOpts } = opts ?? {};
  const transport = sharedTransport ?? createTransportCore(transportOpts);
  const ownTransport = !sharedTransport;
  const inFlight = new Map<string, Promise<unknown>>();

  async function execute<T>(
    headers: Record<string, string>,
    init: Omit<RequestInit, 'headers'>,
    full: string,
    m: string,
    responseType: HttpRequestConfig['responseType'],
    schema?: { parse(data: unknown): T },
  ): Promise<T> {
    const signal = init.signal as AbortSignal | undefined;
    let res: Response;

    try {
      res = await transport.dispatch({ headers, init, url: full });
    } catch (err) {
      throw classifyRequestError(err, m, full, signal);
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

      throw CourierHttpError.fromResponse(res, body, m, full);
    }

    let raw: unknown;

    try {
      raw = await parseResponse(res, responseType ?? 'auto');
    } catch (err) {
      throw classifyRequestError(err, m, full, signal);
    }

    if (schema) {
      try {
        return schema.parse(raw);
      } catch (err) {
        throw new CourierSchemaValidationError(err, raw);
      }
    }

    return raw as T;
  }

  async function request<T, P extends string = string>(
    method: string,
    url: P,
    config: HttpRequestConfig<P> = {} as HttpRequestConfig<P>,
  ) {
    if (transport.disposed) throw new CourierDisposedError('ApiClient');

    const m = method.toUpperCase();

    let full: string;

    try {
      full = buildUrl(transport.baseUrl, url, config.params as Params | undefined, config.query);
    } catch (err) {
      throw classifyRequestError(err, m, url);
    }

    const {
      body,
      dedupe = true,
      dedupeKey,
      fetchInit,
      headers,
      responseType,
      schema,
      signal: extSignal,
      timeout: cfgTimeout,
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
    const combinedExt = anySignal(extSignal, requestAc.signal) ?? requestAc.signal;
    const signal = buildTimeoutSignal(cfgTimeout ?? transport.getTimeout(), combinedExt);

    const { headers: initHeaders, ...restInit } = buildRequestInit(m, mergedHeaders, body, signal, fetchInit ?? {});
    const p = execute<T>(
      initHeaders as Record<string, string>,
      restInit,
      full,
      m,
      responseType,
      schema as { parse(data: unknown): T } | undefined,
    );

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
      // their in-flight promise settles may see an empty inFlight map and error a redundant
      // request. This is an accepted trade-off for the simplicity of a synchronous clear.
      transport.cancelAll();
      inFlight.clear();
    },
    delete: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('DELETE', url, cfg),
    get disposalSignal() {
      return transport.disposalSignal;
    },
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
