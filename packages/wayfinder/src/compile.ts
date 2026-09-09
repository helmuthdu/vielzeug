import { warn } from './_dev';
import { WayfinderRouteError } from './errors';
import { compilePathMatcher, joinPaths, normalizePath } from './path';
import type { Middleware, RouteBranchDef, RouteDefinition, RouteRecord, RouterOptions, RouteTable } from './types';

export type CompiledRoutes = {
  records: readonly RouteRecord[];
  routesByName: ReadonlyMap<string, RouteRecord>;
};

export function compileRoutes<TRoutes extends RouteTable>(options: RouterOptions<TRoutes>): CompiledRoutes {
  const records: RouteRecord[] = [];

  const compile = (
    name: string,
    route: RouteDefinition,
    ancestorPath: string,
    ancestorBranchDefs: RouteBranchDef[],
    ancestorMiddleware: RouteRecord['ownMiddleware'],
  ): void => {
    if (route.index && route.path !== undefined) {
      throw new WayfinderRouteError(`Route "${name}" cannot define both index and path`);
    }

    if (!route.index && route.path === undefined) {
      throw new WayfinderRouteError(`Route "${name}" must define path or set index: true`);
    }

    const ownPath = route.index
      ? ancestorPath
      : normalizePath(route.path ? joinPaths(ancestorPath, route.path) : ancestorPath);

    const branchDefs: RouteBranchDef[] = [
      ...ancestorBranchDefs,
      {
        dataFn: route.data,
        name,
        onError: route.onError as RouteBranchDef['onError'],
      },
    ];

    const ownMiddleware: Middleware[] = [
      ...ancestorMiddleware,
      ...((route.middleware ?? []) as unknown as Middleware[]),
    ];

    if (route.children) {
      for (const [childName, childRoute] of Object.entries(route.children)) {
        compile(`${name}.${childName}`, childRoute, ownPath, branchDefs, ownMiddleware);
      }
    }

    // Emit a record for leaf routes (no children) and routes with data or redirect.
    // A bare parent-only route (children but no data/redirect) is not emitted as a leaf.
    if (route.redirect !== undefined || !route.children || route.data !== undefined) {
      const leaf = branchDefs[branchDefs.length - 1]!;

      records.push({
        branchDefs,
        coerceSearch: route.coerceSearch,
        leaf,
        matcher: compilePathMatcher(ownPath),
        ownMiddleware,
        path: ownPath,
        redirect: route.redirect,
      });
    }
  };

  for (const [name, route] of Object.entries(options.routes)) {
    compile(name, route, '/', [], []);
  }

  // Validate duplicate names.
  const namesSeen = new Set<string>();

  for (const record of records) {
    if (namesSeen.has(record.leaf.name)) {
      throw new WayfinderRouteError(
        `Duplicate route name: "${record.leaf.name}". A top-level route key must not coincide with a nested route's dot-notation name.`,
      );
    }

    namesSeen.add(record.leaf.name);
  }

  // Warn when a catch-all or wildcard-param route precedes more specific routes.
  // Routes match in array order (object key order), so a wildcard placed too early silently shadows later routes.
  let wildcardSeen = false;

  for (const record of records) {
    const isCatchAll =
      record.path === '/*' || record.path.endsWith('/*') || (record.path.includes(':') && record.path.endsWith('*'));

    if (wildcardSeen && !isCatchAll) {
      warn(
        `Route "${record.leaf.name}" (${record.path}) is defined after a wildcard/catch-all route and will never match. Move specific routes before wildcards.`,
      );
    }

    if (isCatchAll) wildcardSeen = true;
  }

  return {
    records,
    routesByName: new Map(records.map((r) => [r.leaf.name, r])),
  };
}
