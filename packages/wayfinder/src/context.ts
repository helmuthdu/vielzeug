import { error as logError } from './_dev';
import { WayfinderApiError } from './errors';
import type {
  Middleware,
  NavigationStatus,
  ResolvedQueryParams,
  RouteBranchDef,
  RouteContext,
  RouteLocation,
  RouteMatch,
  RouteMatchBranch,
  RouteParams,
  RouterErrorContext,
  RouteState,
  RouteTable,
} from './types';

// ─── Route state ──────────────────────────────────────────────────────────────

/** No defensive deep-copy — RouteState is typed readonly; callers always pass fresh objects. */
export function createRouteState(input: {
  error?: unknown;
  location: RouteLocation;
  matches: RouteMatchBranch;
  status: NavigationStatus;
}): RouteState {
  return {
    error: input.error,
    location: input.location,
    matches: input.matches,
    status: input.status,
  };
}

/**
 * Build a RouteMatchBranch from compiled defs and data results.
 */
export function buildMatchBranch(
  branchDefs: readonly RouteBranchDef[],
  params: RouteParams,
  pathname: string,
  dataResults: unknown[],
): RouteMatchBranch {
  return branchDefs.map(
    (def, i): RouteMatch => ({
      data: dataResults[i],
      name: def.name,
      params: { ...params },
      pathname,
    }),
  );
}

// ─── Context factory ──────────────────────────────────────────────────────────

export function createRouteContext<TRoutes extends RouteTable>(
  location: RouteLocation,
  resolvedQuery: ResolvedQueryParams,
  params: RouteParams,
  matches: RouteMatchBranch,
  navigate: RouteContext<RouteParams, TRoutes>['navigate'],
): RouteContext<RouteParams, TRoutes> {
  return {
    hash: location.hash,
    historyState: location.historyState,
    locals: {},
    matches,
    navigate,
    params,
    pathname: location.pathname,
    query: resolvedQuery,
  };
}

// ─── Middleware pipeline ──────────────────────────────────────────────────────

export async function executeMiddlewarePipeline<TRoutes extends RouteTable>(
  context: RouteContext<RouteParams, TRoutes>,
  middleware: readonly Middleware<TRoutes>[],
  terminal: () => Promise<void>,
  wrapMiddlewareError?: (error: unknown) => unknown,
): Promise<boolean> {
  let terminalRan = false;

  async function dispatch(index: number): Promise<void> {
    if (index < middleware.length) {
      let called = false;

      try {
        await middleware[index]?.(context, async () => {
          if (called) throw new WayfinderApiError('next() called multiple times');

          called = true;
          await dispatch(index + 1);
        });
      } catch (error) {
        throw wrapMiddlewareError?.(error) ?? error;
      }

      return;
    }

    terminalRan = true;
    await terminal();
  }

  await dispatch(0);

  return terminalRan;
}

// ─── Error reporting ──────────────────────────────────────────────────────────

export function reportError(
  error: unknown,
  context: RouterErrorContext,
  onError?: (e: unknown, ctx: RouterErrorContext) => void,
): void {
  if (onError) {
    onError(error, context);

    return;
  }

  logError('Unhandled router error. Provide an onError callback to handle errors explicitly:', error);
}
