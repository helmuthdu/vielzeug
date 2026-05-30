import type {
  BeforeLeaveBlocker,
  CoerceSearchFn,
  DataFn,
  Middleware,
  NavigationTarget,
  RouteHandler,
  RouteTable,
} from './types';

export type RouteMatcher = {
  paramNames: readonly string[];
  pattern: RegExp;
  prefixPattern: RegExp;
};

/** Static per-node definition stored on a compiled RouteRecord (root → leaf). */
export type RouteBranchDef<TMeta = unknown, TComponent = unknown> = {
  readonly component?: TComponent;
  readonly dataFn?: DataFn;
  readonly handler?: RouteHandler;
  readonly lazy?: () => Promise<
    Pick<
      { component?: TComponent; data?: DataFn; handler?: RouteHandler; meta?: TMeta },
      'component' | 'data' | 'handler' | 'meta'
    >
  >;
  readonly meta?: TMeta;
  readonly name: string;
  /** Per-route leave guard. Called before navigating away from this matched route. */
  readonly onLeave?: BeforeLeaveBlocker;
};

export type RouteRecord<TRoutes extends RouteTable = RouteTable, TMeta = unknown, TComponent = unknown> = {
  /** Ordered branch definitions from root to this leaf, used to build RouteMatchBranch at match time. */
  readonly branchDefs: readonly RouteBranchDef<TMeta, TComponent>[];
  readonly coerceSearch?: CoerceSearchFn;
  readonly leaf: RouteBranchDef<TMeta, TComponent>;
  readonly matcher: RouteMatcher;
  readonly middleware: readonly Middleware<TRoutes>[];
  readonly path: string;
  /** Declarative redirect resolved before middleware. */
  readonly redirect?: NavigationTarget;
};
