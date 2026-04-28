import type {
  HistoryDriver,
  NavigateOptions,
  NavigationStatus,
  NavigationTarget,
  QueryParams,
  RouteLocation,
  RouteContext,
  RouteMatch,
  RouteMatchBranch,
  RouteBranchDef,
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

export function createRouteState(input: {
  location: RouteLocation;
  matches: RouteMatchBranch;
  status: NavigationStatus;
}): RouteState {
  return {
    location: {
      hash: input.location.hash,
      pathname: input.location.pathname,
      query: input.location.query,
    },
    matches: [...input.matches],
    status: input.status,
  };
}

function buildMatchBranch(
  branchDefs: readonly RouteBranchDef[],
  params: RouteParams,
  pathname: string,
  dataResults: unknown[],
): RouteMatchBranch {
  return branchDefs.map(
    (def, i): RouteMatch => ({
      data: dataResults[i],
      meta: def.meta,
      name: def.name,
      params: { ...params },
      pathname,
    }),
  );
}

export function resolveMatch(
  pathname: string,
  records: readonly RouteRecord[],
): {
  branch: RouteMatchBranch;
  params: RouteParams;
  record?: RouteRecord;
} {
  const { params, record } = matchRoute(pathname, records);

  if (!record) {
    return {
      branch: [],
      params,
    };
  }

  const branch = buildMatchBranch(
    record.branchDefs,
    params,
    pathname,
    record.branchDefs.map(() => undefined),
  );

  return {
    branch,
    params,
    record,
  };
}

/** Build a destination path from a named target and route table. */
export function resolveTarget(target: NavigationTarget, routesByName: ReadonlyMap<string, RouteRecord>): string {
  if ('path' in target) return target.path;

  const route = getRouteByName(target.name, routesByName);
  const path = buildUrl('/', route.path, target.params, target.query);

  return target.hash ? `${path}#${target.hash}` : path;
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

/** Reads the current location from the history driver and returns normalized router state parts. */
export function readLocation(
  base: string,
  history: HistoryDriver,
): {
  hash: string;
  pathname: string;
  query: QueryParams;
} {
  return {
    hash: history.location.hash.replace(/^#/, ''),
    pathname: stripBase(history.location.pathname || '/', base),
    query: parseQuery(history.location.search || ''),
  };
}

type HandleRouteOptions = {
  base: string;
  history: HistoryDriver;
  isNavigationCurrent: () => boolean;
  navigate: (target: NavigationTarget, options?: NavigateOptions) => Promise<void>;
  notifyListeners: () => void;
  records: readonly RouteRecord[];
  setCurrentState: (state: RouteState) => void;
  signal: AbortSignal;
  useTransition?: boolean;
  useViewTransition: boolean;
};

/** Executes the currently matched route and updates the current router state snapshot. */
export async function handleRoute({
  base,
  history,
  isNavigationCurrent,
  navigate,
  notifyListeners,
  records,
  setCurrentState,
  signal,
  useTransition,
  useViewTransition,
}: HandleRouteOptions): Promise<void> {
  const location = readLocation(base, history);
  const { branch: initialBranch, params, record } = resolveMatch(location.pathname, records);

  if (!isNavigationCurrent()) return;

  setCurrentState(
    createRouteState({
      location,
      matches: initialBranch,
      status: record?.branchDefs.some((def) => def.dataFn) ? 'loading' : 'idle',
    }),
  );

  const run = async (): Promise<void> => {
    if (!record || !isNavigationCurrent()) return;

    const context: RouteContext = {
      hash: location.hash,
      locals: {},
      matches: initialBranch,
      navigate,
      params,
      pathname: location.pathname,
      query: location.query,
    };

    // Terminal step in the middleware chain: run data loaders then the handler.
    const terminalHandler = async (ctx: RouteContext): Promise<void> => {
      if (!isNavigationCurrent()) return;

      let dataResults: unknown[] = record.branchDefs.map(() => undefined);
      let status: NavigationStatus = 'idle';

      if (record.branchDefs.some((def) => def.dataFn)) {
        try {
          dataResults = await Promise.all(
            record.branchDefs.map((def) => (def.dataFn ? def.dataFn({ ...ctx, signal }) : undefined)),
          );
        } catch (err) {
          status = 'error';
          setCurrentState(
            createRouteState({
              location,
              matches: buildMatchBranch(record.branchDefs, params, location.pathname, dataResults),
              status,
            }),
          );
          throw err;
        }
      }

      if (!isNavigationCurrent()) return;

      const finalBranch = buildMatchBranch(record.branchDefs, params, location.pathname, dataResults);

      // Commit final state with data results and idle status.
      setCurrentState(
        createRouteState({
          location,
          matches: finalBranch,
          status,
        }),
      );

      const leafDef = record.branchDefs.at(-1);

      if (leafDef?.handler) {
        const leafData = dataResults[dataResults.length - 1];

        await leafDef.handler({ ...ctx, data: leafData, matches: finalBranch });
      }
    };

    await runMiddleware(context, record.middleware, terminalHandler);
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
