import type {
  Middleware,
  NavigateOptions,
  NamedNavigationTarget,
  RawNavigationTarget,
  RouteContext,
  RouteHandler,
  RouteParams,
  RouteTable,
} from './types';

/** Build redirect middleware for common guard flows. */
export function redirect<TRoutes extends RouteTable = RouteTable>(
  target: NamedNavigationTarget<TRoutes> | RawNavigationTarget,
  options?: NavigateOptions,
): Middleware<TRoutes> {
  return async (context) => {
    await context.navigate(target, options);
  };
}

/** Executes a middleware stack and then the terminal route handler. */
export async function runMiddleware<TRoutes extends RouteTable = RouteTable>(
  context: RouteContext<RouteParams, TRoutes>,
  middleware: readonly Middleware<TRoutes>[],
  handler?: RouteHandler<RouteParams, TRoutes>,
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
