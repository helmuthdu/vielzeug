import type {
  Middleware,
  NavigateOptions,
  NamedNavigationTarget,
  NavigationStatus,
  RawNavigationTarget,
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

export function buildMatchBranch<TMeta = unknown, TComponent = unknown>(
  branchDefs: readonly RouteBranchDef<TMeta, TComponent>[],
  params: RouteParams,
  pathname: string,
  dataResults: unknown[],
): RouteMatchBranch<TMeta, TComponent> {
  return branchDefs.map((def, i): RouteMatchBranch<TMeta, TComponent>[number] => ({
    component: def.component as TComponent,
    data: dataResults[i],
    meta: def.meta as TMeta,
    name: def.name,
    params: { ...params },
    pathname,
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

// ─── redirectTo middleware helper ─────────────────────────────────────────────

/** Build redirect middleware for common guard flows. */
export function redirectTo<TRoutes extends RouteTable = RouteTable>(
  target: NamedNavigationTarget<TRoutes> | RawNavigationTarget,
  options?: NavigateOptions,
): Middleware<TRoutes> {
  return async (context) => {
    await context.navigate(target, options);
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
        if (called) throw new Error('[wayfinder] next() called multiple times');

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

  queueMicrotask(() => {
    throw error;
  });
}
