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
export type NavigationStatus = 'idle' | 'loading' | 'error';
export type IsActiveOptions = {
  /** Require an exact pathname match. Defaults to prefix matching. */
  exact?: boolean;
};
export type ScrollPosition = { x: number; y: number };
export type ScrollDecision = ScrollPosition | 'preserve' | 'top';
export type RouterErrorSource = 'initial-navigation' | 'history-listener' | 'preload';
export type RouterErrorContext = {
  readonly source: RouterErrorSource;
};

/**
 * Per-route search-param coercion function.
 * Receives raw parsed strings and returns typed values (e.g. numbers, booleans).
 * Throwing inside this function falls back to the original raw query.
 */
export type CoerceSearchFn<Q extends ResolvedQueryParams = ResolvedQueryParams> = (raw: QueryParams) => Q;

/** Blocker callback for `beforeLeave` and route-level `onLeave`. Return `true` to allow, `false` to cancel. */
export type BeforeLeaveBlocker = () => MaybePromise<boolean>;

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
 * `query` reflects the coerced output of `coerceSearch` when defined, otherwise raw URL strings widened to ResolvedQueryParams.
 */
export type RouteContext<Params extends RouteParams = RouteParams, TRoutes extends RouteTable = RouteTable> = {
  readonly hash: string;
  /** State stored on the history entry that triggered this navigation. */
  readonly historyState: unknown;
  /** Mutable bag for passing values between middleware functions. */
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

/**
 * Context passed to route `handler` functions. Extends RouteContext with the resolved
 * data loader result. Available only inside handlers; not present during middleware.
 */
export type HandlerContext<
  Params extends RouteParams = RouteParams,
  TRoutes extends RouteTable = RouteTable,
> = RouteContext<Params, TRoutes> & {
  readonly data: unknown;
};

/** Handler may be sync or async. Async return values are awaited by the router. */
export type RouteHandler<Params extends RouteParams = RouteParams, TRoutes extends RouteTable = RouteTable> = (
  context: HandlerContext<Params, TRoutes>,
) => MaybePromise<void>;

/**
 * Data loader for a route. Runs after all middleware allows navigation.
 * Cannot redirect — use middleware for auth/guard logic.
 * Receives an AbortSignal that cancels when a newer navigation starts.
 */
export type DataFn<Params extends RouteParams = RouteParams, TRoutes extends RouteTable = RouteTable> = (
  context: DataContext<Params, TRoutes>,
) => MaybePromise<unknown>;

/** Middleware function. Call `next()` to continue the chain; return without calling it to block navigation. */
export type Middleware<TRoutes extends RouteTable = RouteTable> = (
  context: RouteContext<RouteParams, TRoutes>,
  next: () => Promise<void>,
) => void | Promise<void>;

// ─── Route Definition Types ───────────────────────────────────────────────────

type RouteCommon = {
  /** Nested child routes. Keys become part of the compound route name (e.g. `dashboard.settings`). */
  children?: RouteChildren;
  /** Optional view payload for framework-level RouterView rendering. */
  component?: unknown;
  meta?: unknown;
  /** Middleware for auth guards, analytics, and error boundaries. */
  middleware?: Middleware[];
  /**
   * Per-route leave guard. Called before navigating away from this matched route.
   * Return `false` to block navigation. Unlike global `beforeLeave`, only fires when this specific route is active.
   */
  onLeave?: BeforeLeaveBlocker;
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
    /** Normalize/coerce raw search params for this route. Throwing falls back to raw strings. */
    coerceSearch?: CoerceSearchFn;
    /** Data loader. Runs after middleware; result is available as `ctx.data` in the handler. */
    data?: DataFn<PathParams<Path>>;
    handler?: RouteHandler<PathParams<Path>>;
    /** Lazy-load the route module. The resolved export replaces handler/data/component/meta. */
    lazy?: () => Promise<Pick<ContentRouteDefinition<Path>, 'component' | 'data' | 'handler' | 'meta'>>;
    redirect?: never;
  };

type RedirectRouteDefinition<Path extends string = string> = RouteCommon &
  RoutePathShape<Path> & {
    coerceSearch?: never;
    data?: never;
    handler?: never;
    lazy?: never;
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
 * `TMeta` and `TComponent` are router-level type parameters set at `createRouter` call.
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
   * For coerced values (numbers, booleans), access `ctx.query` inside middleware or handlers.
   */
  readonly query: QueryParams;
};

export type RouteState<TMeta = unknown, TComponent = unknown> = {
  /** The error thrown by a `data()` function. Only set when `status === 'error'`. */
  readonly error?: unknown;
  readonly location: RouteLocation;
  /** Matched route branch from root to leaf, including per-node data loader results. */
  readonly matches: RouteMatchBranch<TMeta, TComponent>;
  /** `idle` after a successful navigation, `loading` while data is in-flight, `error` when a data loader threw. */
  readonly status: NavigationStatus;
};

// ─── Router configuration ──────────────────────────────────────────────────────

export type RouterOptions<TRoutes extends RouteTable = RouteTable, TMeta = unknown, TComponent = unknown> = {
  /** Base path for all routes (default: '/'). */
  base?: string;
  /** Custom history driver. Defaults to `createBrowserHistory()`. */
  history?: HistoryDriver;
  /** Global middleware applied to every route. Use for authentication, analytics, and error boundaries. */
  middleware?: Middleware<TRoutes>[];
  /** Optional sink for non-awaited/background router errors (initial navigation, popstate, preload). */
  onError?: (error: unknown, context: RouterErrorContext) => void;
  /** Declarative route table. Object key order determines match precedence — place specific routes before wildcards. */
  routes: TRoutes;
  /** Called after every successful navigation. Return `top`, `preserve`, or explicit coordinates. */
  scroll?: (to: RouteState<TMeta, TComponent>, from: RouteState<TMeta, TComponent>) => ScrollDecision;
  /** Wrap navigation in the View Transition API when available. Falls back to plain execution in unsupported environments. */
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
  push(url: string, state?: unknown): void;
  replace(url: string, state?: unknown): void;
  /** Subscribe to location changes (e.g. popstate). Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

export type Unsubscribe = () => void;
