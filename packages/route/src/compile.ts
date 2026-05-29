import type { RouteBranchDef, RouteRecord } from './router-internal';
import type { Middleware, RouteDefinition, RouteTable, RouterOptions } from './types';

import { compilePathMatcher, joinPaths, normalizePath } from './path';

export type CompiledRoutes<TRoutes extends RouteTable = RouteTable, TMeta = unknown, TComponent = unknown> = {
  records: readonly RouteRecord<TRoutes, TMeta, TComponent>[];
  routesByName: ReadonlyMap<string, RouteRecord<TRoutes, TMeta, TComponent>>;
};

export function compileRoutes<TRoutes extends RouteTable, TMeta, TComponent>(
  options: RouterOptions<TRoutes, TMeta, TComponent>,
): CompiledRoutes<TRoutes, TMeta, TComponent> {
  const globalMiddleware: Middleware<TRoutes>[] = [...(options.middleware ?? [])];
  const records: RouteRecord<TRoutes, TMeta, TComponent>[] = [];

  const compile = (
    name: string,
    route: RouteDefinition,
    ancestorPath: string,
    ancestorBranchDefs: RouteBranchDef<TMeta, TComponent>[],
    ancestorMiddleware: RouteRecord<TRoutes, TMeta, TComponent>['middleware'],
  ): void => {
    if (route.index && route.path !== undefined) {
      throw new Error(`[route] Route "${name}" cannot define both index and path`);
    }

    if (!route.index && route.path === undefined) {
      throw new Error(`[route] Route "${name}" must define path or set index: true`);
    }

    const ownPath = route.index
      ? ancestorPath
      : normalizePath(route.path ? joinPaths(ancestorPath, route.path) : ancestorPath);

    const branchDefs: RouteBranchDef<TMeta, TComponent>[] = [
      ...ancestorBranchDefs,
      {
        component: route.component as TComponent | undefined,
        dataFn: route.data,
        handler: route.handler,
        lazy: route.lazy as RouteBranchDef<TMeta, TComponent>['lazy'],
        meta: route.meta as TMeta | undefined,
        name,
        onLeave: route.onLeave,
      },
    ];

    const ownMiddleware: Middleware<TRoutes>[] = [
      ...ancestorMiddleware,
      ...((route.middleware ?? []) as unknown as Middleware<TRoutes>[]),
    ];

    if (route.children) {
      for (const [childName, childRoute] of Object.entries(route.children)) {
        compile(`${name}.${childName}`, childRoute, ownPath, branchDefs, ownMiddleware);
      }
    }

    if (route.handler !== undefined || route.lazy !== undefined || route.redirect !== undefined || !route.children) {
      const leaf = branchDefs[branchDefs.length - 1]!;

      records.push({
        branchDefs,
        coerceSearch: route.coerceSearch,
        leaf,
        matcher: compilePathMatcher(ownPath),
        middleware: [...globalMiddleware, ...ownMiddleware],
        path: ownPath,
        redirect: route.redirect,
      });
    }
  };

  for (const [name, route] of Object.entries(options.routes)) {
    compile(name, route, '/', [], []);
  }

  const namesSeen = new Set<string>();

  for (const record of records) {
    if (namesSeen.has(record.leaf.name)) {
      throw new Error(
        `[route] Duplicate route name: "${record.leaf.name}". A top-level route key must not coincide with a nested route's dot-notation name.`,
      );
    }

    namesSeen.add(record.leaf.name);
  }

  return {
    records,
    routesByName: new Map(records.map((r) => [r.leaf.name, r])),
  };
}
