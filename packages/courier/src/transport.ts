import { CourierError, classifyRequestError } from './errors.js';

/**
 * Immutable request context passed through the middleware pipeline.
 *
 * **Never mutate `init` or `headers` directly.** Use `ctx.withHeaders(updates)` to
 * produce a new context with merged headers — this is the safe, idiomatic pattern
 * for middleware that needs to add or override headers.
 *
 * @example
 * ```ts
 * // Correct — returns a new context
 * return next(ctx.withHeaders({ authorization: `Bearer ${token}` }));
 *
 * // Wrong — mutates shared state, risks stomping other middleware
 * ctx.init.headers = { ...ctx.init.headers, authorization: `Bearer ${token}` };
 * ```
 */
export type FetchContext = {
  readonly headers: Readonly<Record<string, string>>;
  readonly init: Readonly<Omit<RequestInit, 'headers'>>;
  readonly url: string;
  /** Returns a new `FetchContext` with the given header overrides merged in (lowercase keys). */
  withHeaders(updates: Record<string, string | undefined>): FetchContext;
  /** Returns a new context with fetch-init overrides. */
  withInit(updates: Partial<Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>>): FetchContext;
};

function makeFetchContext(
  url: string,
  headers: Record<string, string>,
  init: Omit<RequestInit, 'headers'>,
): FetchContext {
  const immutableHeaders = Object.freeze({ ...headers });
  const immutableInit = Object.freeze({ ...init });
  const ctx: FetchContext = {
    headers: immutableHeaders,
    init: immutableInit,
    url,
    withHeaders(updates: Record<string, string | undefined>): FetchContext {
      const merged = { ...immutableHeaders };

      for (const [key, value] of Object.entries(updates)) {
        const normalized = key.toLowerCase();
        if (value === undefined) delete merged[normalized];
        else merged[normalized] = value;
      }

      return makeFetchContext(url, merged, immutableInit);
    },
    withInit(updates: Partial<Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>>): FetchContext {
      return makeFetchContext(url, immutableHeaders, { ...immutableInit, ...updates });
    },
  };

  return Object.freeze(ctx);
}

export function anySignal(...signals: ReadonlyArray<AbortSignal | null | undefined>): AbortSignal | undefined {
  const active = signals.filter((s): s is AbortSignal => s != null);

  if (active.length === 0) return undefined;

  if (active.length === 1) return active[0];

  return AbortSignal.any(active);
}

/** Middleware applied to every request. Compose policies like auth, logging, or tracing. */
export type Middleware = (ctx: FetchContext, next: (ctx: FetchContext) => Promise<Response>) => Promise<Response>;

export type TransportOptions = {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  headers?: HeadersInit;
  /** Immutable middleware chain. Configured once at construction; never mutated at runtime. */
  middleware?: readonly Middleware[];
  timeout?: number;
};

export const DEFAULT_TIMEOUT = 30_000;
const MAX_TIMEOUT = 2_147_483_647;

export function validateTimeout(timeoutMs: number): void {
  if (
    timeoutMs !== Number.POSITIVE_INFINITY &&
    (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_TIMEOUT)
  ) {
    throw new CourierError(`[courier] timeout must be an integer from 1 to ${MAX_TIMEOUT}, or Infinity`);
  }
}

export function buildTimeoutSignal(timeoutMs: number, external?: AbortSignal | null): AbortSignal | undefined {
  if (timeoutMs === Number.POSITIVE_INFINITY) {
    return external ?? undefined;
  }

  return anySignal(AbortSignal.timeout(timeoutMs), external);
}

/**
 * Shared transport core: immutable middleware pipeline, header defaults, AbortController lifecycle.
 * HTTP requests build on this. Middleware is fixed at construction — there is no runtime `use()`.
 */
export function createTransportCore(opts: TransportOptions = {}) {
  const {
    baseUrl = '',
    fetch: fetchFn = globalThis.fetch,
    headers: initialHeaders = {},
    middleware = [],
    timeout = DEFAULT_TIMEOUT,
  } = opts;

  validateTimeout(timeout);

  const globalHeaders: Record<string, string> = Object.fromEntries(new Headers(initialHeaders).entries());
  const activeControllers = new Set<AbortController>();
  const disposeController = new AbortController();
  let disposed = false;

  const base = async (ctx: FetchContext): Promise<Response> => {
    try {
      return await fetchFn(ctx.url, { ...ctx.init, headers: ctx.headers });
    } catch (error) {
      throw classifyRequestError(
        error,
        (ctx.init.method ?? 'GET').toUpperCase(),
        ctx.url,
        ctx.init.signal as AbortSignal | undefined,
      );
    }
  };

  const pipeline: (ctx: FetchContext) => Promise<Response> =
    middleware.length === 0
      ? base
      : middleware.reduceRight<(ctx: FetchContext) => Promise<Response>>((next, mw) => (ctx) => mw(ctx, next), base);

  /** Merge global headers with optional per-request headers (normalised to lowercase). */
  function mergeHeaders(perRequest?: HeadersInit): Record<string, string> {
    const normalized = perRequest ? Object.fromEntries(new Headers(perRequest).entries()) : undefined;

    return { ...globalHeaders, ...normalized };
  }

  /** Register an AbortController for lifecycle tracking (cancelAll / dispose). Returns an untrack fn. */
  function track(ac: AbortController): () => void {
    activeControllers.add(ac);

    return () => activeControllers.delete(ac);
  }

  /**
   * Dispatch a request through the middleware pipeline.
   * Accepts a plain `{ url, headers, init }` object and promotes it to a
   * full `FetchContext` with `withHeaders()` before entering the pipeline.
   */
  function dispatch(raw: {
    headers: Record<string, string>;
    init: Omit<RequestInit, 'headers'>;
    url: string;
  }): Promise<Response> {
    return pipeline(makeFetchContext(raw.url, raw.headers, raw.init));
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
    mergeHeaders,
    /** Configured request timeout in ms. */
    timeout,
    track,
  };
}

export type TransportCore = ReturnType<typeof createTransportCore>;
