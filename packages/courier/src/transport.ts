import { anySignal } from '@vielzeug/arsenal';

export type FetchContext = { init: RequestInit; url: string };
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
  const interceptors: Interceptor[] = [];
  let cachedPipeline: ((ctx: FetchContext) => Promise<Response>) | null = null;
  let disposed = false;

  function getPipeline(): (ctx: FetchContext) => Promise<Response> {
    if (cachedPipeline) return cachedPipeline;

    const base: (ctx: FetchContext) => Promise<Response> = (ctx) => fetchFn(ctx.url, ctx.init);

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
    return globalHeaders;
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

  /** Dispatch a request through the interceptor pipeline. */
  function dispatch(ctx: FetchContext): Promise<Response> {
    return getPipeline()(ctx);
  }

  function cancelAll(): void {
    for (const ac of [...activeControllers]) ac.abort();
    activeControllers.clear();
  }

  function dispose(): void {
    disposed = true;

    for (const ac of activeControllers) ac.abort();

    activeControllers.clear();
    interceptors.length = 0;
    cachedPipeline = null;
  }

  return {
    baseUrl,
    cancelAll,
    dispatch,
    dispose,
    get disposed() {
      return disposed;
    },
    getHeaders,
    headers,
    mergeHeaders,
    timeout,
    track,
    use,
  };
}

export type TransportCore = ReturnType<typeof createTransportCore>;
