/**
 * Immutable request context passed through the interceptor pipeline.
 *
 * **Never mutate `init` or `headers` directly.** Use `ctx.withHeaders(updates)` to
 * produce a new context with merged headers — this is the safe, idiomatic pattern
 * for interceptors that need to add or override headers.
 *
 * @example
 * ```ts
 * // Correct — returns a new context
 * return next(ctx.withHeaders({ authorization: `Bearer ${token}` }));
 *
 * // Wrong — mutates shared state, risks stomping other interceptors
 * ctx.init.headers = { ...ctx.init.headers, authorization: `Bearer ${token}` };
 * ```
 */
export type FetchContext = {
  readonly headers: Readonly<Record<string, string>>;
  readonly init: Readonly<Omit<RequestInit, 'headers'>>;
  readonly url: string;
  /** Returns a new `FetchContext` with the given header overrides merged in (lowercase keys). */
  withHeaders(updates: Record<string, string>): FetchContext;
};

function makeFetchContext(
  url: string,
  headers: Record<string, string>,
  init: Omit<RequestInit, 'headers'>,
): FetchContext {
  const ctx: FetchContext = {
    headers,
    init,
    url,
    withHeaders(updates: Record<string, string>): FetchContext {
      const merged = { ...headers };

      for (const [k, v] of Object.entries(updates)) merged[k.toLowerCase()] = v;

      return makeFetchContext(url, merged, init);
    },
  };

  return ctx;
}

export function anySignal(...signals: ReadonlyArray<AbortSignal | null | undefined>): AbortSignal | undefined {
  const active = signals.filter((s): s is AbortSignal => s != null);

  if (active.length === 0) return undefined;

  if (active.length === 1) return active[0];

  return AbortSignal.any(active);
}
export type Interceptor = (ctx: FetchContext, next: (ctx: FetchContext) => Promise<Response>) => Promise<Response>;

export type TransportOptions = {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  headers?: Record<string, string>;
  timeout?: number;
};

export const DEFAULT_TIMEOUT = 30_000;

export function validateTimeout(timeoutMs: number): void {
  if ((timeoutMs <= 0 || !Number.isFinite(timeoutMs)) && timeoutMs !== Number.POSITIVE_INFINITY) {
    throw new TypeError('[courier] timeout must be a positive number or Infinity');
  }
}

export function buildTimeoutSignal(timeoutMs: number, external?: AbortSignal | null): AbortSignal | undefined {
  if (timeoutMs === Number.POSITIVE_INFINITY) {
    return external ?? undefined;
  }

  return anySignal(AbortSignal.timeout(timeoutMs), external);
}

/**
 * Shared transport core: interceptor pipeline, header management, AbortController lifecycle.
 * Both `createApi` and `createStream` build on this to avoid duplicating infrastructure.
 */
export function createTransportCore(opts: TransportOptions = {}) {
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
  const activeControllers = new Set<AbortController>();
  const disposeController = new AbortController();
  const interceptors: Interceptor[] = [];
  let cachedPipeline: ((ctx: FetchContext) => Promise<Response>) | null = null;
  let disposed = false;

  function getPipeline(): (ctx: FetchContext) => Promise<Response> {
    if (cachedPipeline) return cachedPipeline;

    const base: (ctx: FetchContext) => Promise<Response> = (ctx) =>
      fetchFn(ctx.url, { ...ctx.init, headers: ctx.headers });

    cachedPipeline =
      interceptors.length === 0
        ? base
        : interceptors.reduceRight<(ctx: FetchContext) => Promise<Response>>(
            (next, interceptor) => (ctx) => interceptor(ctx, next),
            base,
          );

    return cachedPipeline;
  }

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

  function headers(updates: Record<string, string | undefined>): void {
    for (const [key, value] of Object.entries(updates)) {
      const k = key.toLowerCase();

      if (value === undefined) delete globalHeaders[k];
      else globalHeaders[k] = value;
    }
  }

  /** Returns a read-only snapshot of the current global headers. */
  function getHeaders(): Readonly<Record<string, string>> {
    return { ...globalHeaders };
  }

  /**
   * Merge global headers with optional per-request and extra headers.
   * Per-request keys are normalised to lowercase.
   */
  function mergeHeaders(perRequest?: Record<string, string>, extra?: Record<string, string>): Record<string, string> {
    const normalized = perRequest
      ? Object.fromEntries(Object.entries(perRequest).map(([k, v]) => [k.toLowerCase(), v]))
      : undefined;

    return { ...globalHeaders, ...normalized, ...extra };
  }

  /** Register an AbortController for lifecycle tracking (cancelAll / dispose). Returns an untrack fn. */
  function track(ac: AbortController): () => void {
    activeControllers.add(ac);

    return () => activeControllers.delete(ac);
  }

  /**
   * Dispatch a request through the interceptor pipeline.
   * Accepts a plain `{ url, headers, init }` object and promotes it to a
   * full `FetchContext` with `withHeaders()` before entering the pipeline.
   */
  function dispatch(raw: {
    headers: Record<string, string>;
    init: Omit<RequestInit, 'headers'>;
    url: string;
  }): Promise<Response> {
    return getPipeline()(makeFetchContext(raw.url, raw.headers, raw.init));
  }

  function cancelAll(): void {
    for (const ac of [...activeControllers]) ac.abort();
    activeControllers.clear();
  }

  function dispose(): void {
    if (disposed) return;

    disposed = true;
    disposeController.abort();

    for (const ac of activeControllers) ac.abort();

    activeControllers.clear();
    interceptors.length = 0;
    cachedPipeline = null;
  }

  return {
    baseUrl,
    cancelAll,
    dispatch,
    get disposalSignal() {
      return disposeController.signal;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    getHeaders,
    /** Returns the configured request timeout in ms. */
    getTimeout(): number {
      return timeout;
    },
    headers,
    mergeHeaders,
    track,
    use,
  };
}

export type TransportCore = ReturnType<typeof createTransportCore>;
