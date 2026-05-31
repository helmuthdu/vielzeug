/** -------------------- Path Param Types -------------------- **/

type ParseParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? (Param extends `${infer P}*` ? P : Param) | ParseParams<Rest>
  : T extends `${string}:${infer Param}`
    ? Param extends `${infer P}*`
      ? P
      : Param
    : never;

/** Extracts typed route params from a path pattern literal (e.g. PathParams<'/users/:id'> = { id: string }). */
export type PathParams<T extends string> = [ParseParams<T>] extends [never]
  ? RouteParams
  : { readonly [K in ParseParams<T>]: string };

/** -------------------- Core Types -------------------- **/

export type RouteParams = Record<string, string>;

/** Raw URL query object parsed from the location search string. Values are always strings. */
export type QueryParams = Record<string, string | string[]>;

/** Query object after route-level coercion via `coerceSearch`. Values may be numbers or booleans. */
export type ResolvedQueryValue = boolean | number | string;
export type ResolvedQueryParams = Record<string, ResolvedQueryValue | ResolvedQueryValue[]>;

export type MaybePromise<T> = T | Promise<T>;

/**
 * An async generator used as a streaming data loader.
 * Each `yield` emits a partial result (status: `'streaming'`).
 * The `return` value becomes the final settled data (status: `'idle'`).
 */
export type DataStream<T = unknown> = AsyncGenerator<T, T>;

/** Navigation status for the whole router. */
export type NavigationStatus = 'error' | 'idle' | 'loading' | 'streaming';

/** Per-route match status (F1). Reflects whether this specific branch node is still loading. */
export type MatchStatus = 'error' | 'idle' | 'loading' | 'streaming';

export type IsActiveOptions = {
  /** Require an exact pathname match. Defaults to prefix matching. */
  exact?: boolean;
};
export type ScrollPosition = { x: number; y: number };
export type ScrollDecision = ScrollPosition | 'preserve' | 'top';

/**
 * Discriminated error context passed to `onError` (R3).
 * Each variant carries enough information to distinguish where the error originated.
 */
export type RouterErrorContext =
  | {
      /** Route name where the data loader failed. */
      routeName: string;
      source: 'data-loader';
    }
  | {
      /** Route name where middleware threw. */
      routeName: string;
      source: 'middleware';
    }
  | { source: 'coerce-search' | 'history-listener' | 'initial-navigation' | 'preload' };

export type RouterErrorSource = RouterErrorContext['source'];

/**
 * Per-route search-param coercion function.
 * Receives raw parsed strings and returns typed values (e.g. numbers, booleans).
 * Throwing inside this function falls back to the original raw query and is reported via `onError`.
 */
export type CoerceSearchFn<Q extends ResolvedQueryParams = ResolvedQueryParams> = (raw: QueryParams) => Q;

/**
 * Destination info passed to `beforeLeave` blockers (R4).
 * Gives guards enough context to make an informed allow/block decision.
 */
export type NavigationDestination = {
  readonly name?: string;
  readonly params: RouteParams;
  readonly pathname: string;
  readonly query: QueryParams;
};

/** Blocker callback passed to `router.beforeLeave()`. Return `true` to allow navigation, `false` to cancel. */
export type BeforeLeaveBlocker = (destination: NavigationDestination) => MaybePromise<boolean>;

/**
 * Options for `router.beforeLeave()`.
 * When `routes` is specified the guard only fires when navigating away from a matched route
 * whose name appears in the array (any node in the active branch, not just the leaf).
 * Omit to create a global guard that fires on every navigation.
 */
export type BeforeLeaveOptions<TRoutes extends RouteTable = RouteTable> = {
  routes?: RouteName<TRoutes>[];
};

export type NavigateOptions = {
  /** Navigate even if the destination URL matches the current URL. */
  force?: boolean;
  /** Replace the current history entry instead of pushing a new one. */
  replace?: boolean;
  /** Additional state stored with the history entry. */
  state?: unknown;
  /** Override the router-level `viewTransition` setting for this navigation. */
  viewTransition?: boolean;
};

export type RawNavigationTarget = {
  path: string;
};

/** Named-route navigation target (untyped). Prefer `NamedNavigationTarget<TRoutes>` when the route table is available. */
export type UntypedNamedNavigationTarget = {
  hash?: string;
  name: string;
  params?: RouteParams;
  query?: ResolvedQueryParams;
};

export type NavigationTarget = UntypedNamedNavigationTarget | RawNavigationTarget;

// ─── Route Context Types ──────────────────────────────────────────────────────

/**
 * Context available in middleware and data loaders.
 *
 * R7: `TLocals` has been removed. Use `locals: Record<string, unknown>` and cast
 * inside your middleware when you need typed access (e.g. `ctx.locals as AuthCtx`).
 */
export type RouteContext<Params extends RouteParams = RouteParams, TRoutes extends RouteTable = RouteTable> = {
  readonly hash: string;
  /** State stored on the history entry that triggered this navigation. */
  readonly historyState: unknown;
  /** Mutable bag for passing values between middleware functions in a navigation. */
  locals: Record<string, unknown>;
  /** Matched branch for the current navigation. Leaf node is the active route. */
  readonly matches: RouteMatchBranch;
  readonly navigate: (
    target: NamedNavigationTarget<TRoutes> | RawNavigationTarget,
    options?: NavigateOptions,
  ) => Promise<void>;
  readonly params: Params;
  readonly pathname: string;
  readonly query: ResolvedQueryParams;
};

/**
 * Context passed to `data()` functions. Extends RouteContext with an AbortSignal
 * that is cancelled automatically when a newer navigation supersedes this one.
 */
export type DataContext<
  Params extends RouteParams = RouteParams,
  TRoutes extends RouteTable = RouteTable,
> = RouteContext<Params, TRoutes> & {
  readonly signal: AbortSignal;
};

/** Data loader function. May return a plain value/Promise or an AsyncGenerator for streaming. */
export type DataFn<Params extends RouteParams = RouteParams, TRoutes extends RouteTable = RouteTable> = (
  context: DataContext<Params, TRoutes>,
) => DataStream | MaybePromise<unknown>;

/**
 * Global middleware function. Call `next()` to continue the chain; return without calling it to block navigation.
 */
export type Middleware<TRoutes extends RouteTable = RouteTable> = (
  context: RouteContext<RouteParams, TRoutes>,
  next: () => Promise<void>,
) => void | Promise<void>;

/**
 * Per-route middleware with typed path params.
 * The `params` on `context` will be typed to match the route's path pattern.
 *
 * @example
 * const guard: RouteMiddleware<'/users/:id'> = (ctx, next) => {
 *   console.log(ctx.params.id); // string, not Record<string,string>
 *   return next();
 * };
 */
export type RouteMiddleware<Path extends string = string, TRoutes extends RouteTable = RouteTable> = (
  context: RouteContext<PathParams<Path>, TRoutes>,
  next: () => Promise<void>,
) => void | Promise<void>;

// ─── Route Definition Types ───────────────────────────────────────────────────

type RouteCommon = {
  /** Nested child routes. Keys become part of the compound route name (e.g. `dashboard.settings`). */
  children?: RouteChildren;
  /** Optional view payload for framework-level RouterView rendering. */
  component?: unknown;
  meta?: unknown;
};

type PathRouteShape<Path extends string = string> = {
  index?: false;
  /** Path segment. Absolute for top-level routes, relative for children. */
  path: Path;
};

type IndexRouteShape = {
  /** When true the route inherits the parent path (acts as the default child). */
  index: true;
  path?: never;
};

type RoutePathShape<Path extends string = string> = PathRouteShape<Path> | IndexRouteShape;

type ContentRouteDefinition<Path extends string = string> = RouteCommon &
  RoutePathShape<Path> & {
    /** Normalize/coerce raw search params for this route. Throwing falls back to raw strings and is reported via `onError`. */
    coerceSearch?: CoerceSearchFn;
    /**
     * Data loader. Runs after middleware; result is available as `match.data` in the matched branch.
     * Supports streaming via AsyncGenerator. May also perform side effects directly
     * (rendering, state hydration) — replaces the former `handler` concept (F4).
     */
    data?: DataFn<PathParams<Path>>;
    /** Lazy-load the route module. The resolved export replaces data/component/meta. */
    lazy?: () => Promise<Pick<ContentRouteDefinition<Path>, 'component' | 'data' | 'meta'>>;
    /**
     * Per-route middleware with typed params. Use `RouteMiddleware<Path>` for inline type safety.
     * Runs after parent middleware, before this route's data loader.
     */
    middleware?: Array<Middleware | RouteMiddleware<Path>>;
    /**
     * Route-level error boundary for data loader failures.
     * Called when this route's `data()` throws. The returned value becomes `match.data`
     * so the route can render a degraded state. If `onError` itself throws, the router
     * falls through to `status: 'error'` as usual.
     */
    onError?: (error: unknown, context: DataContext<PathParams<Path>>) => MaybePromise<unknown>;
    redirect?: never;
  };

type RedirectRouteDefinition<Path extends string = string> = RouteCommon &
  RoutePathShape<Path> & {
    coerceSearch?: never;
    data?: never;
    lazy?: never;
    middleware?: never;
    onError?: never;
    /** Declarative redirect. Resolved before middleware runs. */
    redirect: UntypedNamedNavigationTarget | RawNavigationTarget;
  };

export type RouteChildren = Record<string, RouteDefinition<string>>;

export type RouteDefinition<Path extends string = string> =
  | ContentRouteDefinition<Path>
  | RedirectRouteDefinition<Path>;

// ─── Type-safe route traversal ─────────────────────────────────────────────────

type JoinPath<Parent extends string, Child extends string> = Child extends `/${string}`
  ? Child
  : Parent extends '/'
    ? `/${Child}`
    : `${Parent}/${Child}`;

type BuildPath<Parent extends string, Def extends RouteDefinition<string>> = Def extends { index: true }
  ? Parent
  : Def extends { path: infer Path extends string }
    ? JoinPath<Parent, Path>
    : Parent;

type RouteEntry<Name extends string, Path extends string> = {
  name: Name;
  path: Path;
};

type ChildEntries<Children extends RouteChildren, Prefix extends string, ParentPath extends string> = {
  [ChildName in keyof Children & string]:
    | RouteEntry<`${Prefix}.${ChildName}`, BuildPath<ParentPath, Children[ChildName]>>
    | (Children[ChildName] extends { children: infer Nested extends RouteChildren }
        ? ChildEntries<Nested, `${Prefix}.${ChildName}`, BuildPath<ParentPath, Children[ChildName]>>
        : never);
}[keyof Children & string];

type RouteEntries<TRoutes extends RouteTable> = {
  [Name in keyof TRoutes & string]:
    | RouteEntry<Name, BuildPath<'/', TRoutes[Name]>>
    | (TRoutes[Name] extends { children: infer Children extends RouteChildren }
        ? ChildEntries<Children, Name, BuildPath<'/', TRoutes[Name]>>
        : never);
}[keyof TRoutes & string];

export type RoutePathByName<TRoutes extends RouteTable, Name extends string> =
  Extract<RouteEntries<TRoutes>, { name: Name }> extends {
    path: infer Path extends string;
  }
    ? Path
    : string;

export type RouteTable = Record<string, RouteDefinition<string>>;

export type RouteName<TRoutes extends RouteTable> = RouteEntries<TRoutes>['name'];

export type NamedNavigationTarget<TRoutes extends RouteTable> = {
  [Name in RouteName<TRoutes>]: {
    hash?: string;
    name: Name;
    params?: PathParams<RoutePathByName<TRoutes, Name>>;
    query?: ResolvedQueryParams;
  };
}[RouteName<TRoutes>];

// ─── Route state types ─────────────────────────────────────────────────────────

/**
 * A single node in the matched route branch (root → leaf).
 *
 * F1: Each match node carries its own `status` so nested layouts can reflect
 * per-slot loading/streaming state without polling the router-level status.
 */
export type RouteMatch<TMeta = unknown, TComponent = unknown> = {
  /** Optional view payload copied from route `component` or lazy module output. */
  readonly component: TComponent;
  /** Result of the route's `data()` function, or `undefined` if none was defined. */
  readonly data: unknown;
  readonly meta: TMeta;
  readonly name: string;
  readonly params: RouteParams;
  readonly pathname: string;
  /** F1: Per-node loading status. Reflects individual loader state in nested layouts. */
  readonly status: MatchStatus;
};

/** Ordered array of matched route nodes from the root layout down to the active leaf. */
export type RouteMatchBranch<TMeta = unknown, TComponent = unknown> = readonly RouteMatch<TMeta, TComponent>[];

export type RouteLocation = {
  readonly hash: string;
  /** State object stored on the history entry (mirrors `history.state`). */
  readonly historyState: unknown;
  readonly pathname: string;
  /**
   * Raw parsed query params — always string values from URL parsing.
   * For coerced values (numbers, booleans), access `ctx.query` inside middleware or data loaders.
   */
  readonly query: QueryParams;
};

export type RouteState<TMeta = unknown, TComponent = unknown> = {
  /** The error thrown by a `data()` function. Only set when `status === 'error'`. */
  readonly error?: unknown;
  readonly location: RouteLocation;
  /** Matched route branch from root to leaf, including per-node data loader results. */
  readonly matches: RouteMatchBranch<TMeta, TComponent>;
  /**
   * `idle` — navigation settled successfully.
   * `loading` — data loaders are in-flight.
   * `streaming` — at least one data loader is an AsyncGenerator still yielding partial results.
   * `error` — a data loader threw and no route-level `onError` handled it.
   */
  readonly status: NavigationStatus;
};

// ─── Router configuration ──────────────────────────────────────────────────────

export type RouterOptions<TRoutes extends RouteTable = RouteTable, TMeta = unknown, TComponent = unknown> = {
  /** Base path for all routes (default: '/'). */
  base?: string;
  /** Custom history driver. Defaults to `createBrowserHistory()`. */
  history?: HistoryDriver;
  /** Global middleware applied to every route. */
  middleware?: Middleware<TRoutes>[];
  /**
   * F5: Fallback route rendered when no route matches.
   * Declared explicitly and matched last after all routes.
   * The `data` function receives the unmatched pathname via `ctx.pathname`.
   */
  notFound?: Pick<ContentRouteDefinition, 'component' | 'data' | 'meta' | 'middleware'>;
  /** Optional sink for non-awaited/background router errors. */
  onError?: (error: unknown, context: RouterErrorContext) => void;
  /** Declarative route table. Object key order determines match precedence. */
  routes: TRoutes;
  /** Called after every successful navigation. Return `top`, `preserve`, or explicit coordinates. */
  scroll?: (to: RouteState<TMeta, TComponent>, from: RouteState<TMeta, TComponent>) => ScrollDecision;
  /** Wrap navigation in the View Transition API when available. */
  viewTransition?: boolean;
};

// ─── History driver ────────────────────────────────────────────────────────────

/** Pluggable history driver. Use `createBrowserHistory()` for standard SPAs, `createMemoryHistory()` for SSR/tests. */
export interface HistoryDriver {
  readonly location: {
    readonly hash: string;
    readonly pathname: string;
    readonly search: string;
    readonly state: unknown;
  };
  /** Navigate one entry back in history, equivalent to the browser back button. */
  back(): void;
  push(url: string, state?: unknown): void;
  replace(url: string, state?: unknown): void;
  /**
   * Subscribe to backwards/forwards navigation (popstate-equivalent).
   * `push()` and `replace()` are silent — they do not notify subscribers.
   * Only `back()` (and browser popstate events) trigger notifications.
   * Returns an unsubscribe function.
   */
  subscribe(listener: () => void): () => void;
}

export type Unsubscribe = () => void;

// ─── Internal compiled route types ───────────────────────────────────────────

/** @internal Regex-based matcher produced by compilePathMatcher. */
export type RouteMatcher = {
  paramNames: readonly string[];
  pattern: RegExp;
  prefixPattern: RegExp;
};

/** @internal Static per-node definition stored on a compiled RouteRecord (root → leaf). */
export type RouteBranchDef<TMeta = unknown, TComponent = unknown> = {
  readonly component?: TComponent;
  readonly dataFn?: DataFn;
  readonly lazy?: () => Promise<
    Pick<
      {
        component?: TComponent;
        data?: DataFn;
        meta?: TMeta;
      },
      'component' | 'data' | 'meta'
    >
  >;
  readonly meta?: TMeta;
  readonly name: string;
  /**
   * Route-level error boundary for data loader failures.
   * Called when this route's `data()` throws. The returned value becomes `match.data`.
   */
  readonly onError?: (error: unknown, context: DataContext) => MaybePromise<unknown>;
};

/**
 * @internal Compiled route record. Produced by `compileRoutes`.
 */
export type RouteRecord<TMeta = unknown, TComponent = unknown> = {
  readonly branchDefs: readonly RouteBranchDef<TMeta, TComponent>[];
  readonly coerceSearch?: CoerceSearchFn;
  readonly leaf: RouteBranchDef<TMeta, TComponent>;
  readonly matcher: RouteMatcher;
  /** Global + per-route middleware merged at compile time. TRoutes is erased. */
  readonly middleware: readonly Middleware[];
  readonly path: string;
  readonly redirect?: NavigationTarget;
};
