import type { Middleware, NamedNavigationTarget, NavigateOptions, RawNavigationTarget, RouteTable } from './types';

/**
 * Middleware helper that redirects navigation to another route.
 * Attach to a route's `middleware` array for declarative redirect patterns.
 *
 * Note: `next()` is intentionally not called — this middleware blocks the chain
 * and immediately navigates to the target.
 *
 * @example
 * // Redirect /old → /new
 * routes: {
 *   old: { middleware: [redirectTo({ path: '/new' })], path: '/old' },
 *   new: { path: '/new' },
 * }
 */
export function redirectTo<TRoutes extends RouteTable = RouteTable>(
  target: NamedNavigationTarget<TRoutes> | RawNavigationTarget,
  options?: NavigateOptions,
): Middleware<TRoutes> {
  return async (context) => {
    await context.navigate(target, options);
  };
}
