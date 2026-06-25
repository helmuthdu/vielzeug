import type {
  MatchStatus,
  Middleware,
  NavigationStatus,
  ResolvedQueryParams,
  RouteBranchDef,
  RouteContext,
  RouteLocation,
  RouteMatchBranch,
  RouteParams,
  RouterErrorContext,
  RouteState,
  RouteTable,
} from './types';

import { issue } from './_warn';
import { WayfinderApiError } from './errors';

// ─── Route state ──────────────────────────────────────────────────────────────

/** R5: No defensive deep-copy — RouteState is typed readonly; callers always pass fresh objects. */
export function createRouteState<TMeta = unknown, TComponent = unknown>(input: {
  error?: unknown;
  location: RouteLocation;
  matches: RouteMatchBranch<TMeta, TComponent>;
  status: NavigationStatus;
}): RouteState<TMeta, TComponent> {
  return {
    error: input.error,
    location: input.location,
    matches: input.matches,
    status: input.status,
  };
}

/**
 * Build a RouteMatchBranch from compiled defs, data results, and optional per-node statuses.
 * F1: Each node carries its own `status` for fine-grained nested layout feedback.
 */
export function buildMatchBranch<TMeta = unknown, TComponent = unknown>(
  branchDefs: readonly RouteBranchDef<TMeta, TComponent>[],
  params: RouteParams,
  pathname: string,
  dataResults: unknown[],
  statuses?: readonly MatchStatus[],
): RouteMatchBranch<TMeta, TComponent> {
  return branchDefs.map((def, i): RouteMatchBranch<TMeta, TComponent>[number] => ({
    component: def.component as TComponent,
    data: dataResults[i],
    meta: def.meta as TMeta,
    name: def.name,
    params: { ...params },
    pathname,
    status: statuses?.[i] ?? 'idle',
  }));
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
): Promise<void> {
  async function dispatch(index: number): Promise<void> {
    if (index < middleware.length) {
      let called = false;

      await middleware[index]!(context, async () => {
        if (called) throw new WayfinderApiError('next() called multiple times');

        called = true;
        await dispatch(index + 1);
      });

      return;
    }

    await terminal();
  }

  await dispatch(0);
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

  issue('Unhandled router error. Provide an onError callback to handle errors explicitly:', error);
}
