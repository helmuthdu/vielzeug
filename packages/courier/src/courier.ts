import { CourierDisposedError, CourierHttpError, CourierSchemaValidationError, classifyRequestError } from './errors';
import { createQueryCache } from './query';
import { parseResponse } from './response';
import { buildRequestInit } from './serialize';
import { createStreams } from './stream';
import {
  anySignal,
  buildTimeoutSignal,
  createTransportCore,
  type TransportOptions,
  validateTimeout,
} from './transport';
import type { MutationOptions, QueryCache } from './types';
import type { HttpRequestConfig, Params } from './url';
import { buildUrl } from './url';

export type CourierOptions = TransportOptions & {
  query?: { staleTime?: number };
};

export type Courier = ReturnType<typeof createCourier>;

/** One application client owns transport, queries, mutations, and streams. */
export function createCourier(options: CourierOptions = {}) {
  const { query: queryOptions, ...transportOptions } = options;
  const transport = createTransportCore(transportOptions);
  const queryCache = createQueryCache({ ...queryOptions, signal: transport.disposalSignal });
  const queries: QueryCache = queryCache;
  const streams = createStreams(transport);
  const mutations = new Set<AbortController>();

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
      const isJson = res.headers.get('content-type')?.includes('json') ?? false;
      const text = await res.text().catch(() => '');
      let body: unknown = text;

      if (text && isJson) {
        try {
          body = JSON.parse(text);
        } catch {
          // Malformed JSON error body — keep the raw text, not ''.
        }
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

  const mutate = async <T>(options: MutationOptions<T>): Promise<T> => {
    if (transport.disposed) throw new CourierDisposedError('Courier');

    const controller = new AbortController();

    mutations.add(controller);

    const signal = anySignal(options.signal, controller.signal, transport.disposalSignal) ?? controller.signal;

    try {
      const data = await options.request({ signal });

      await options.onSuccess?.(data, queries);

      return data;
    } finally {
      mutations.delete(controller);
    }
  };

  return {
    cancelAll() {
      transport.cancelAll();
      queryCache.cancelAll();
      for (const controller of mutations) controller.abort();
    },
    delete: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('DELETE', url, cfg),
    get disposalSignal() {
      return transport.disposalSignal;
    },
    dispose() {
      for (const controller of mutations) controller.abort();
      mutations.clear();
      queries.clear();
      transport.dispose();
    },
    get disposed() {
      return transport.disposed;
    },
    events: streams.events,
    get: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('GET', url, cfg),
    getHeaders: transport.getHeaders,
    headers: transport.headers,
    mutate,
    patch: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('PATCH', url, cfg),
    post: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('POST', url, cfg),
    put: <T, P extends string = string>(url: P, cfg?: HttpRequestConfig<P>) => request<T, P>('PUT', url, cfg),
    queries,
    read: streams.read,
    request,
    [Symbol.dispose]() {
      this.dispose();
    },
    use: transport.use,
  };
}
