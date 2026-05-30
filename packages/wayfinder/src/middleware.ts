import type { Middleware, NavigateOptions, NamedNavigationTarget, RawNavigationTarget, RouteTable } from './types';

/** Build redirect middleware for common guard flows. */
export function redirectTo<TRoutes extends RouteTable = RouteTable>(
  target: NamedNavigationTarget<TRoutes> | RawNavigationTarget,
  options?: NavigateOptions,
): Middleware<TRoutes> {
  return async (context) => {
    await context.navigate(target, options);
  };
}
