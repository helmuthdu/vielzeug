import type { Middleware, RouteContext, RouteHandler } from './types';

/** Executes a middleware stack and then the terminal route handler. */
export async function runMiddleware(
  context: RouteContext,
  middleware: readonly Middleware[],
  handler?: RouteHandler,
): Promise<void> {
  async function dispatch(index: number): Promise<void> {
    if (index < middleware.length) {
      let called = false;

      await middleware[index]!(context, async () => {
        if (called) throw new Error('[routeit] next() called multiple times');

        called = true;
        await dispatch(index + 1);
      });

      return;
    }

    if (handler) await handler(context);
  }

  await dispatch(0);
}
