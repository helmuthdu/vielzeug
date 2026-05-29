import type { Interceptor } from './transport';

function flattenHeaders(h: HeadersInit | undefined | null): Record<string, string> {
  if (!h) return {};

  if (h instanceof Headers) return Object.fromEntries(h.entries());

  if (Array.isArray(h)) return Object.fromEntries(h as [string, string][]);

  return h as Record<string, string>;
}

/**
 * Attaches a Bearer token `Authorization` header to every request.
 * The token can be a static string or an async function (useful for refresh flows).
 *
 * @example
 * ```ts
 * client.use(withBearerAuth(() => tokenStore.getAccessToken()));
 * ```
 */
export function withBearerAuth(token: string | (() => string | Promise<string>)): Interceptor {
  return async (ctx, next) => {
    const t = typeof token === 'function' ? await token() : token;

    ctx.init.headers = { ...flattenHeaders(ctx.init.headers), authorization: `Bearer ${t}` };

    return next(ctx);
  };
}

/**
 * Adds a unique request ID to every request as a header.
 *
 * Defaults to `x-request-id` populated with `crypto.randomUUID()`.
 *
 * @example
 * ```ts
 * client.use(withRequestId());
 * client.use(withRequestId({ header: 'x-trace-id' }));
 * ```
 */
export function withRequestId(opts?: { generate?: () => string; header?: string }): Interceptor {
  const header = opts?.header ?? 'x-request-id';
  const generate = opts?.generate ?? (() => crypto.randomUUID());

  return async (ctx, next) => {
    ctx.init.headers = { ...flattenHeaders(ctx.init.headers), [header]: generate() };

    return next(ctx);
  };
}

/**
 * Logs each request's method, URL, status code, and duration.
 *
 * Defaults to `console.debug`. Supply a custom `logger` for structured logging.
 *
 * @example
 * ```ts
 * client.use(withLogging());
 * client.use(withLogging({ logger: (msg, meta) => logger.info(meta) }));
 * ```
 */
export function withLogging(opts?: {
  logger?: (msg: string, meta: { duration: number; method: string; status: number; url: string }) => void;
}): Interceptor {
  const log =
    opts?.logger ??
    ((msg, meta) => {
      console.debug(msg, meta);
    });

  return async (ctx, next) => {
    const start = performance.now();
    const method = (ctx.init.method ?? 'GET').toUpperCase();

    try {
      const res = await next(ctx);
      const duration = Math.round(performance.now() - start);

      log(`${method} ${ctx.url} ${res.status} (${duration}ms)`, {
        duration,
        method,
        status: res.status,
        url: ctx.url,
      });

      return res;
    } catch (err) {
      const duration = Math.round(performance.now() - start);

      log(`${method} ${ctx.url} ERR (${duration}ms)`, {
        duration,
        method,
        status: 0,
        url: ctx.url,
      });

      throw err;
    }
  };
}
