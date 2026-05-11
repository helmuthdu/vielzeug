import type { CoerceSearchFn, DataFn, Middleware, NavigationTarget, RouteHandler } from './types';

export type RouteMatcher = {
  paramNames: readonly string[];
  pattern: RegExp;
  prefixPattern: RegExp;
};

/** Static per-node definition stored on a compiled RouteRecord (root -> leaf). */
export type RouteBranchDef = {
  dataFn?: DataFn;
  handler?: RouteHandler;
  lazy?: () => Promise<Pick<{ data?: DataFn; handler?: RouteHandler; meta?: unknown }, 'data' | 'handler' | 'meta'>>;
  meta?: unknown;
  name: string;
};

export type RouteRecord = {
  /** Ordered branch definitions from root to this leaf, used to build RouteMatchBranch at match time. */
  branchDefs: readonly RouteBranchDef[];
  coerceSearch?: CoerceSearchFn;
  hasData: boolean;
  hasLazy: boolean;
  leaf: RouteBranchDef;
  matcher: RouteMatcher;
  middleware: Middleware[];
  path: string;
  /** Declarative redirect resolved before middleware. */
  redirect?: NavigationTarget;
};
