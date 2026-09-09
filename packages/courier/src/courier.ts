import { createReadCache } from './_cache.js';
import {
  CourierAbortError,
  CourierDisposedError,
  CourierError,
  CourierHttpError,
  CourierNetworkError,
  CourierParseError,
  CourierSchemaValidationError,
  CourierTimeoutError,
  classifyRequestError,
} from './errors.js';
import { parseResponse, trackRawResponse } from './response.js';
import { buildRequestInit } from './serialize.js';
import {
  anySignal,
  buildTimeoutSignal,
  createTransportCore,
  type TransportOptions,
  validateTimeout,
} from './transport.js';
import type {
  CourierCacheKey,
  CourierCacheOptions,
  GetRequestConfig,
  HttpRequestConfig,
  Params,
  PrefetchConfig,
  RequestConfig,
} from './url.js';
import { buildUrl } from './url.js';

export type CourierOptions = TransportOptions & {
  cache?: CourierCacheOptions;
};

export type Courier = ReturnType<typeof createCourier>;

export type CourierEvent =
  | { readonly method: string; readonly type: 'request-start'; readonly url: string }
  | {
      readonly duration: number;
      readonly method: string;
      readonly status: number;
      readonly type: 'request-success';
      readonly url: string;
    }
  | { readonly error: unknown; readonly method: string; readonly type: 'request-error'; readonly url: string }
  | { readonly type: 'dispose' };

export {
  CourierAbortError,
  CourierDisposedError,
  CourierError,
  CourierHttpError,
  CourierNetworkError,
  CourierParseError,
  CourierSchemaValidationError,
  CourierTimeoutError,
};

/** One client owns HTTP transport, explicit cached reads, middleware, and cancellation. */
export function createCourier(options: CourierOptions = {}) {
  const { cache: cacheOptions, ...transportOptions } = options;
  const transport = createTransportCore(transportOptions);
  const readCache = createReadCache(cacheOptions);
  const tapCleanups = new Set<() => void>();
  const tappers = new Set<(event: CourierEvent) => void>();

  function emit(event: CourierEvent): void {
    if (tappers.size === 0) return;
    const snapshot = Object.freeze(event);

    for (const tapper of [...tappers]) {
      try {
        tapper(snapshot);
      } catch {}
    }
  }

  function tap(handler: (event: CourierEvent) => void, options?: { signal?: AbortSignal }): () => void {
    if (transport.disposed || options?.signal?.aborted) return () => {};

    tappers.add(handler);
    const remove = (): void => {
      tappers.delete(handler);
      tapCleanups.delete(remove);
      options?.signal?.removeEventListener('abort', remove);
    };

    if (options?.signal) {
      tapCleanups.add(remove);
      options.signal.addEventListener('abort', remove, { once: true });
    }
    return remove;
  }

  async function execute<T>(
    headers: Record<string, string>,
    init: Omit<RequestInit, 'headers'>,
    full: string,
    m: string,
    responseType: HttpRequestConfig['responseType'],
    schema?: { parse(data: unknown): T },
  ): Promise<{ result: T; status: number }> {
    const signal = init.signal as AbortSignal | undefined;
    const res = await transport.dispatch({ headers, init, url: full });

    if (!res.ok) {
      // Error bodies are read once as text, then JSON-parsed if the content-type
      // says so — a binary success config (`responseType: 'blob'`) must not trap
      // the server's error message in an unreadable wrapper, and a failed
      // parseResponse-then-fallback double-read loses the body entirely.
      const isJson = res.headers.get('content-type')?.includes('json') ?? false;
      let text: string;

      try {
        text = await res.text();
      } catch (error) {
        if (signal?.aborted) throw classifyRequestError(error, m, full, signal);
        throw new CourierParseError(error instanceof Error ? error.message : String(error), { cause: error });
      }

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
    } catch (error) {
      if (signal?.aborted) throw classifyRequestError(error, m, full, signal);
      if (error instanceof CourierError) throw error;
      throw new CourierParseError(error instanceof Error ? error.message : String(error), { cause: error });
    }

    if (schema) {
      try {
        return { result: schema.parse(raw), status: res.status };
      } catch (err) {
        throw new CourierSchemaValidationError(err, raw);
      }
    }

    return { result: raw as T, status: res.status };
  }

  function resolveUrl<T, P extends string>(path: P, config: RequestConfig<P, T> | GetRequestConfig<P, T>): string {
    try {
      return buildUrl(transport.baseUrl, path, config.params as Params | undefined, config.query);
    } catch (error) {
      if (error instanceof CourierError) throw error;
      throw new CourierParseError(error instanceof Error ? error.message : String(error), { cause: error });
    }
  }

  async function request<T, P extends string = string>(
    path: P,
    config: RequestConfig<P, T> = {} as RequestConfig<P, T>,
  ): Promise<T> {
    if (transport.disposed) throw new CourierDisposedError('Courier');

    const m = (config.method ?? 'GET').toUpperCase();
    const full = resolveUrl(path, config);
    const { body, fetchInit, headers, responseType, schema, signal: extSignal, timeout: cfgTimeout } = config;

    if ((m === 'GET' || m === 'HEAD') && body !== undefined) {
      throw new CourierParseError(`${m} requests cannot include a body`);
    }
    if (responseType === 'raw' && schema !== undefined) {
      throw new CourierParseError('Raw responses cannot use a schema');
    }
    if (cfgTimeout !== undefined) validateTimeout(cfgTimeout);

    const requestAc = new AbortController();
    const untrack = transport.track(requestAc);
    const signal = buildTimeoutSignal(cfgTimeout ?? transport.timeout, anySignal(extSignal, requestAc.signal));
    const started = performance.now();
    let rawResponseOwned = false;

    emit({ method: m, type: 'request-start', url: full });

    try {
      let requestInit: RequestInit;

      try {
        requestInit = buildRequestInit(m, transport.mergeHeaders(headers), body, signal, fetchInit ?? {});
      } catch (error) {
        throw new CourierParseError(error instanceof Error ? error.message : String(error), { cause: error });
      }

      const { headers: initHeaders, ...restInit } = requestInit;
      const { result, status } = await execute<T>(
        initHeaders as Record<string, string>,
        restInit,
        full,
        m,
        responseType,
        schema as { parse(data: unknown): T } | undefined,
      );

      if (responseType === 'raw' && result instanceof Response) {
        const tracked = trackRawResponse(result, signal, untrack);
        rawResponseOwned = true;
        emit({ duration: performance.now() - started, method: m, status, type: 'request-success', url: full });
        return tracked as T;
      }

      emit({ duration: performance.now() - started, method: m, status, type: 'request-success', url: full });
      return result;
    } catch (error) {
      emit({ error, method: m, type: 'request-error', url: full });
      throw error;
    } finally {
      if (!rawResponseOwned) untrack();
    }
  }

  const requestWithMethod = <T, P extends string>(method: string, path: P, config?: HttpRequestConfig<P, T>) =>
    request<T, P>(path, { ...config, method } as RequestConfig<P, T>);

  function get<T, P extends string = string>(path: P, config?: GetRequestConfig<P, T>): Promise<T> {
    try {
      const resolved = config ?? ({} as GetRequestConfig<P, T>);
      const { cache, signal, timeout, ...sharedConfig } = resolved;
      if (!cache) {
        return requestWithMethod<T, P>('GET', path, {
          ...sharedConfig,
          signal,
          timeout,
        } as HttpRequestConfig<P, T>);
      }

      const url = resolveUrl(path, resolved);
      return readCache.read({
        cache,
        load: (internalSignal) =>
          requestWithMethod<T, P>('GET', path, {
            ...sharedConfig,
            signal: internalSignal,
          } as HttpRequestConfig<P, T>),
        signal,
        timeout: timeout ?? transport.timeout,
        url,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function prefetch<T, P extends string = string>(path: P, config: PrefetchConfig<P, T>): Promise<void> {
    if (transport.disposed) throw new CourierDisposedError('Courier');
    const { cache, ...sharedConfig } = config;
    resolveUrl(path, config);
    return readCache.prefetch({
      cache,
      load: (internalSignal) =>
        requestWithMethod<T, P>('GET', path, {
          ...sharedConfig,
          signal: internalSignal,
        } as HttpRequestConfig<P, T>),
    });
  }

  return {
    cancelAll() {
      readCache.cancelAll();
      transport.cancelAll();
    },
    clearCache() {
      readCache.clear();
    },
    /** Convenience for `request(path, { ...config, method: 'DELETE' })`. */
    delete: <T, P extends string = string>(path: P, config?: HttpRequestConfig<P, T>) =>
      requestWithMethod<T, P>('DELETE', path, config),
    get disposalSignal() {
      return transport.disposalSignal;
    },
    dispose() {
      if (transport.disposed) return;
      emit({ type: 'dispose' });
      for (const cleanup of [...tapCleanups]) cleanup();
      tappers.clear();
      readCache.dispose();
      transport.dispose();
    },
    get disposed() {
      return transport.disposed;
    },
    /** Convenience for `request(path, { ...config, method: 'GET' })`, with explicit opt-in caching. */
    get,
    invalidateCache(prefix: CourierCacheKey) {
      readCache.invalidate(prefix);
    },
    /** Convenience for `request(path, { ...config, method: 'PATCH' })`. */
    patch: <T, P extends string = string>(path: P, config?: HttpRequestConfig<P, T>) =>
      requestWithMethod<T, P>('PATCH', path, config),
    /** Convenience for `request(path, { ...config, method: 'POST' })`. */
    post: <T, P extends string = string>(path: P, config?: HttpRequestConfig<P, T>) =>
      requestWithMethod<T, P>('POST', path, config),
    prefetch,
    /** Convenience for `request(path, { ...config, method: 'PUT' })`. */
    put: <T, P extends string = string>(path: P, config?: HttpRequestConfig<P, T>) =>
      requestWithMethod<T, P>('PUT', path, config),
    request,
    tap,
    [Symbol.dispose]() {
      this.dispose();
    },
  };
}
