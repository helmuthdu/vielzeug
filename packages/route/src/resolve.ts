import type { RouteBranchDef, RouteRecord } from './router-internal';
import type {
  Middleware,
  NavigationStatus,
  QueryParams,
  ResolvedQueryParams,
  RouteContext,
  RouteLocation,
  RouteMatchBranch,
  RouteParams,
  RouteState,
  RouteTable,
  RouterErrorContext,
  Unsubscribe,
} from './types';

import { buildUrl, normalizePath } from './path';

// ─── Route state ──────────────────────────────────────────────────────────────

export function createRouteState<TMeta = unknown, TComponent = unknown>(input: {
  error?: unknown;
  location: RouteLocation;
  matches: RouteMatchBranch<TMeta, TComponent>;
  status: NavigationStatus;
}): RouteState<TMeta, TComponent> {
  return {
    ...(input.error !== undefined ? { error: input.error } : {}),
    location: {
      hash: input.location.hash,
      historyState: input.location.historyState,
      pathname: input.location.pathname,
      query: input.location.query,
    },
    matches: [...input.matches],
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

// ─── URL / location helpers ───────────────────────────────────────────────────

export function stripBase(pathname: string, base = '/'): string {
  const normalizedPath = normalizePath(pathname);
  const normalizedBase = normalizePath(base);

  if (normalizedBase === '/') return normalizedPath;

  if (normalizedPath === normalizedBase) return '/';

  const prefix = `${normalizedBase}/`;

  return normalizedPath.startsWith(prefix)
    ? normalizePath(normalizedPath.slice(normalizedBase.length))
    : normalizedPath;
}

export function readLocation(
  base: string,
  history: { location: { hash: string; pathname: string; search: string; state: unknown } },
): RouteLocation {
  return {
    hash: history.location.hash.replace(/^#/, ''),
    historyState: history.location.state,
    pathname: stripBase(history.location.pathname || '/', base),
    query: parseQueryRaw(history.location.search || ''),
  };
}

function parseQueryRaw(queryString: string): QueryParams {
  const search = new URLSearchParams(queryString);
  const out: QueryParams = {};

  for (const [key, value] of search.entries()) {
    const existing = out[key];

    if (existing === undefined) {
      out[key] = value;
      continue;
    }

    if (Array.isArray(existing)) {
      existing.push(value);
      continue;
    }

    out[key] = [existing, value];
  }

  return out;
}

// ─── Named route lookup ───────────────────────────────────────────────────────

export function getRouteByName<TRoutes extends RouteTable, TMeta, TComponent>(
  name: string,
  routesByName: ReadonlyMap<string, RouteRecord<TRoutes, TMeta, TComponent>>,
): RouteRecord<TRoutes, TMeta, TComponent> {
  const route = routesByName.get(name);

  if (route) return route;

  const available = [...routesByName.keys()].join(', ');

  throw new Error(
    available
      ? `[route] Unknown route name: ${name}. Available routes: ${available}`
      : `[route] Unknown route name: ${name}`,
  );
}

// ─── Navigation target resolution ─────────────────────────────────────────────

export function resolveTarget<TRoutes extends RouteTable, TMeta, TComponent>(
  target: { path: string } | { hash?: string; name: string; params?: RouteParams; query?: ResolvedQueryParams },
  routesByName: ReadonlyMap<string, RouteRecord<TRoutes, TMeta, TComponent>>,
): string {
  if ('path' in target) return target.path;

  const route = getRouteByName(target.name, routesByName);
  const path = buildUrl('/', route.path, target.params, target.query);

  return target.hash ? `${path}#${target.hash}` : path;
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
        if (called) throw new Error('[route] next() called multiple times');

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

// ─── Preload URL helper ───────────────────────────────────────────────────────

export function buildPreloadKey(base: string, path: string, params: RouteParams): string {
  return buildUrl(base, path, params);
}

// ─── Re-export Unsubscribe for convenience ────────────────────────────────────
export type { Unsubscribe };
