import type { Middleware, RouteContext, RouteHandler } from './types';

/** -------------------- Middleware Execution -------------------- **/

export async function runMiddleware(
  context: RouteContext,
  globalMiddleware: Middleware[],
  routeMiddleware: Middleware[],
  handler?: RouteHandler,
): Promise<void> {
  let i = 0;

  const next = async (): Promise<void> => {
    if (i < globalMiddleware.length) {
      await globalMiddleware[i++](context, next);
    } else {
      const li = i++ - globalMiddleware.length;

      if (li < routeMiddleware.length) await routeMiddleware[li](context, next);
      else if (handler) await handler(context);
    }
  };

  await next();
}
