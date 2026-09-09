import type { Middleware } from './transport.js';

/**
 * Attaches a Bearer token `Authorization` header to every request.
 * The token can be a static string or an async function (useful for refresh flows).
 * Nullish and empty results remove any existing authorization header.
 *
 * @example
 * ```ts
 * const courier = createCourier({
 *   baseUrl: 'https://api.example.com',
 *   middleware: [withBearerAuth(() => tokenStore.getAccessToken())],
 * });
 * ```
 */
export function withBearerAuth(
  token: string | (() => Promise<string | null | undefined> | string | null | undefined),
): Middleware {
  return async (ctx, next) => {
    const value = typeof token === 'function' ? await token() : token;

    return next(ctx.withHeaders({ authorization: value ? `Bearer ${value}` : undefined }));
  };
}

/**
 * Adds a unique request ID to every request as a header.
 *
 * Defaults to `x-request-id` populated with `crypto.randomUUID()`.
 *
 * @example
 * ```ts
 * const courier = createCourier({
 *   baseUrl: 'https://api.example.com',
 *   middleware: [withRequestId()],
 * });
 * ```
 */
export function withRequestId(opts?: { generate?: () => string; header?: string }): Middleware {
  const header = opts?.header ?? 'x-request-id';
  const generate = opts?.generate ?? (() => crypto.randomUUID());

  return (ctx, next) => next(ctx.withHeaders({ [header]: generate() }));
}

/**
 * Logs each request's method, URL, status code, and duration.
 *
 * Requires an explicit `logger` function — no default console output.
 *
 * **Security note:** The full URL is logged, including any query parameters.
 * If your URLs may contain sensitive data (tokens, PII), provide a custom
 * `logger` that sanitizes the URL before writing to persistent logs.
 *
 * @example
 * ```ts
 * const courier = createCourier({
 *   baseUrl: 'https://api.example.com',
 *   middleware: [withLogging({ logger: (msg) => console.log(msg) })],
 * });
 * ```
 */
export function withLogging(opts: {
  logger: (msg: string, meta: { duration: number; method: string; status: number; url: string }) => void;
}): Middleware {
  const log = opts.logger;
  const write = (message: string, meta: { duration: number; method: string; status: number; url: string }): void => {
    try {
      log(message, meta);
    } catch {}
  };

  return async (ctx, next) => {
    const start = performance.now();
    const method = (ctx.init.method ?? 'GET').toUpperCase();

    try {
      const res = await next(ctx);
      const duration = Math.round(performance.now() - start);

      write(`${method} ${ctx.url} ${res.status} (${duration}ms)`, {
        duration,
        method,
        status: res.status,
        url: ctx.url,
      });

      return res;
    } catch (err) {
      const duration = Math.round(performance.now() - start);

      write(`${method} ${ctx.url} ERR (${duration}ms)`, {
        duration,
        method,
        status: 0,
        url: ctx.url,
      });

      throw err;
    }
  };
}
