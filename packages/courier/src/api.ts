import { CourierDisposedError, CourierHttpError, CourierSchemaValidationError, classifyRequestError } from './errors';
import { parseResponse } from './response';
import { buildRequestInit } from './serialize';
import {
  anySignal,
  buildTimeoutSignal,
  createTransportCore,
  type TransportCore,
  type TransportOptions,
  validateTimeout,
} from './transport';
import type { HttpRequestConfig, Params } from './url';
import { buildUrl } from './url';

export type { FetchContext, Interceptor } from './transport';

/**
 * Creates a typed REST client — `get`/`post`/`put`/`patch`/`delete`/`request`, all backed by a
 * shared interceptor pipeline, header management, and `AbortController` lifecycle.
 *
 * @example
 * ```ts
 * const api = createApi({ baseUrl: 'https://api.example.com', timeout: 10_000 });
 *
 * const user = await api.get<User>('/users/{id}', { params: { id: '1' } });
 * const created = await api.post<User>('/users', { body: { name: 'Ada' } });
 *
 * api.use(async (ctx, next) => next(ctx.withHeaders({ authorization: `Bearer ${token}` })));
 *
 * // later:
 * api.dispose();
 * ```
 */
export function createApi(opts?: TransportOptions & { transport?: TransportCore }) {
  const { transport: sharedTransport, ...transportOpts } = opts ?? {};
  const transport = sharedTransport ?? createTransportCore(transportOpts);
  const ownTransport = !sharedTransport;

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
      // Error bodies are read once as text, then JSON-parsed if the content-type
      // says so — a binary success config (`responseType: 'blob'`) must not trap
      // the server's error message in an unreadable wrapper, and a failed
      // parseResponse-then-fallback double-read loses the body entirely.
      // `res.text` is missing on minimal custom-fetch fakes — fall back to
      // parseResponse there.
      const isJson = res.headers.get('content-type')?.includes('json') ?? false;
      let body: unknown;

      if (typeof res.text === 'function') {
        const text = await res.text().catch(() => '');

        body = text;

        if (text && isJson) {
          try {
            body = JSON.parse(text);
          } catch {
            // Malformed JSON error body — keep the raw text, not ''.
          }
        }
      } else {
        body = await parseResponse(res, isJson ? 'json' : 'auto').catch(() => '');
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
    if (transport.disposed) throw new CourierDisposedError('Courier');

    const m = method.toUpperCase();

    let full: string;

    try {
      full = buildUrl(transport.baseUrl, url, config.params as Params | undefined, config.query);
    } catch (err) {
      throw classifyRequestError(err, m, url);
    }

    const {
      body,
      fetchInit,
      headers,
      responseType,
      schema,
      signal: extSignal,
      timeout: cfgTimeout,
    } = config as HttpRequestConfig;

    if (cfgTimeout !== undefined) validateTimeout(cfgTimeout);

    const requestAc = new AbortController();
    const untrack = transport.track(requestAc);
    const signal = buildTimeoutSignal(cfgTimeout ?? transport.getTimeout(), anySignal(extSignal, requestAc.signal));
    const { headers: initHeaders, ...restInit } = buildRequestInit(
      m,
      transport.mergeHeaders(headers),
      body,
      signal,
      fetchInit ?? {},
    );

    try {
      return await execute<T>(
        initHeaders as Record<string, string>,
        restInit,
        full,
        m,
        responseType,
        schema as { parse(data: unknown): T } | undefined,
      );
    } finally {
      untrack();
    }
  }

  return {
    cancelAll: transport.cancelAll,
    delete: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('DELETE', url, cfg),
    get disposalSignal() {
      return transport.disposalSignal;
    },
    dispose(): void {
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
