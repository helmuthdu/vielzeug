import type { Middleware, RouteBranchDef, RouteDefinition, RouteRecord, RouterOptions, RouteTable } from './types';

import { warn } from './_warn';
import { compilePathMatcher, joinPaths, normalizePath } from './path';

export type CompiledRoutes<TMeta = unknown, TComponent = unknown> = {
  records: readonly RouteRecord<TMeta, TComponent>[];
  routesByName: ReadonlyMap<string, RouteRecord<TMeta, TComponent>>;
};

export function compileRoutes<TRoutes extends RouteTable, TMeta, TComponent>(
  options: RouterOptions<TRoutes, TMeta, TComponent>,
): CompiledRoutes<TMeta, TComponent> {
  const records: RouteRecord<TMeta, TComponent>[] = [];

  const compile = (
    name: string,
    route: RouteDefinition,
    ancestorPath: string,
    ancestorBranchDefs: RouteBranchDef<TMeta, TComponent>[],
    ancestorMiddleware: RouteRecord<TMeta, TComponent>['ownMiddleware'],
  ): void => {
    if (route.index && route.path !== undefined) {
      throw new Error(`[wayfinder] Route "${name}" cannot define both index and path`);
    }

    if (!route.index && route.path === undefined) {
      throw new Error(`[wayfinder] Route "${name}" must define path or set index: true`);
    }

    const ownPath = route.index
      ? ancestorPath
      : normalizePath(route.path ? joinPaths(ancestorPath, route.path) : ancestorPath);

    const branchDefs: RouteBranchDef<TMeta, TComponent>[] = [
      ...ancestorBranchDefs,
      {
        component: route.component as TComponent | undefined,
        dataFn: route.data,
        lazy: route.lazy as RouteBranchDef<TMeta, TComponent>['lazy'],
        meta: route.meta as TMeta | undefined,
        name,
        onError: route.onError as RouteBranchDef<TMeta, TComponent>['onError'],
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

    // R9: emit a record for leaf routes (no children), redirects, lazy routes, and routes with data.
    // A bare parent-only route (children but no data/lazy/redirect) is not emitted as a leaf.
    if (route.lazy !== undefined || route.redirect !== undefined || !route.children || route.data !== undefined) {
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
      throw new Error(
        `[wayfinder] Duplicate route name: "${record.leaf.name}". A top-level route key must not coincide with a nested route's dot-notation name.`,
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
