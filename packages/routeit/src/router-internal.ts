import type { DataFn, Middleware, RouteHandler } from './types';

export type RouteMatcher = {
  paramNames: readonly string[];
  pattern: RegExp;
  prefixPattern: RegExp;
};

/** Static per-node definition stored on a compiled RouteRecord (root -> leaf). */
export type RouteBranchDef = {
  dataFn?: DataFn;
  handler?: RouteHandler;
  meta?: unknown;
  name: string;
};

export type RouteRecord = {
  /** Ordered branch definitions from root to this leaf, used to build RouteMatchBranch at match time. */
  branchDefs: readonly RouteBranchDef[];
  hasData: boolean;
  leaf: RouteBranchDef;
  matcher: RouteMatcher;
  middleware: Middleware[];
  path: string;
};
