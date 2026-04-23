import type {
  NavigateOptions,
  NavigationTarget,
  PathNavigateOptions,
  QueryParams,
  RouteContext,
  RouteParams,
  RouteRecord,
  RouteState,
  ViewTransitionDocument,
} from './types';

import { runMiddleware } from './middleware';
import { buildUrl, matchRoute, normalizePath, parseQuery } from './path';

function availableRouteNames(routesByName: ReadonlyMap<string, RouteRecord>): string {
  return [...routesByName.keys()].join(', ');
}

export function getRouteByName(name: string, routesByName: ReadonlyMap<string, RouteRecord>): RouteRecord {
  const route = routesByName.get(name);

  if (route) return route;

  const available = availableRouteNames(routesByName);

  throw new Error(
    available
      ? `[routeit] Unknown route name: ${name}. Available routes: ${available}`
      : `[routeit] Unknown route name: ${name}`,
  );
}

function freezeQuery(query: QueryParams): QueryParams {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(query).map(([key, value]) => [key, Array.isArray(value) ? Object.freeze([...value]) : value]),
    ),
  ) as QueryParams;
}

export function createRouteState(input: {
  hash: string;
  meta?: unknown;
  name?: string;
  params: RouteParams;
  pathname: string;
  query: QueryParams;
}): RouteState {
  return Object.freeze({
    hash: input.hash,
    meta: input.meta,
    name: input.name,
    params: Object.freeze({ ...input.params }),
    pathname: input.pathname,
    query: freezeQuery(input.query),
  });
}

/** Build a destination path from a named target and route table. */
export function resolveTarget(target: NavigationTarget, routesByName: ReadonlyMap<string, RouteRecord>): string {
  const route = getRouteByName(target.name, routesByName);
  const path = buildUrl('/', route.path, target.params, target.query);

  return target.hash ? `${path}#${target.hash}` : path;
}

/** Resolve an incoming path against the configured base path. */
export function resolvePath(path: string, base = '/'): string {
  return normalizePath(path.startsWith('/') ? path : joinRelativePath(base, path));
}

function joinRelativePath(base: string, path: string): string {
  return normalizePath(`${normalizePath(base)}/${path}`);
}

/** Removes the base prefix from a full path so matching occurs against route definitions only. */
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

/** Reads the current browser location and returns normalized router state parts. */
export function readLocation(base = '/'): {
  hash: string;
  pathname: string;
  query: QueryParams;
} {
  return {
    hash: window.location.hash.replace(/^#/, ''),
    pathname: stripBase(window.location.pathname || '/', base),
    query: parseQuery(window.location.search || ''),
  };
}

type HandleRouteOptions = {
  base: string;
  isNavigationCurrent: () => boolean;
  navigate: (target: NavigationTarget, options?: NavigateOptions) => Promise<void>;
  notifyListeners: () => void;
  pushPath: (path: string, options?: PathNavigateOptions) => Promise<void>;
  records: readonly RouteRecord[];
  replacePath: (path: string, options?: PathNavigateOptions) => Promise<void>;
  setCurrentState: (state: RouteState) => void;
  useTransition?: boolean;
  useViewTransition: boolean;
};

/** Executes the currently matched route and updates the current router state snapshot. */
export async function handleRoute({
  base,
  isNavigationCurrent,
  navigate,
  notifyListeners,
  pushPath,
  records,
  replacePath,
  setCurrentState,
  useTransition,
  useViewTransition,
}: HandleRouteOptions): Promise<void> {
  const { hash, pathname, query } = readLocation(base);
  const { params, record } = matchRoute(pathname, records);

  if (!isNavigationCurrent()) return;

  setCurrentState(
    createRouteState({
      hash,
      meta: record?.meta,
      name: record?.name,
      params,
      pathname,
      query,
    }),
  );

  const run = async (): Promise<void> => {
    if (!record || !isNavigationCurrent()) return;

    const context: RouteContext = {
      hash,
      locals: {},
      meta: record.meta,
      navigate,
      params,
      pathname,
      pushPath,
      query,
      replacePath,
    };

    await runMiddleware(context, record.middleware, record.handler);
  };

  const documentWithTransition = document as ViewTransitionDocument;
  const shouldUseTransition = useTransition ?? useViewTransition;

  try {
    if (shouldUseTransition && documentWithTransition.startViewTransition) {
      await documentWithTransition.startViewTransition(run).finished;
    } else {
      await run();
    }
  } finally {
    if (isNavigationCurrent()) notifyListeners();
  }
}
