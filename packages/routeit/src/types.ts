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
export type QueryParams = Record<string, string | string[]>;
export type MaybePromise<T> = T | Promise<T>;
export type NavigationStatus = 'idle' | 'loading' | 'error';

/** Return value from a `coerceSearch` function. Return a normalized/coerced search object. */
export type CoerceSearchFn<Q extends QueryParams = QueryParams> = (raw: QueryParams) => Q;

/** Blocker callback for `beforeLeave`. Return `true` to allow the navigation, `false` to cancel it. */
export type BeforeLeaveBlocker = () => MaybePromise<boolean>;

export type NavigateOptions = {
  /** Navigate even if the destination URL matches the current URL */
  force?: boolean;
  /** Replace the current history entry instead of pushing a new one */
  replace?: boolean;
  /** Additional state stored with the history entry */
  state?: unknown;
  /** Override the router-level `viewTransition` setting for this navigation */
  viewTransition?: boolean;
};

export type RawNavigationTarget = {
  path: string;
};

/** Named-route navigation target. */
export type UntypedNamedNavigationTarget = {
  hash?: string;
  name: string;
  params?: RouteParams;
  query?: QueryParams;
};

export type NavigationTarget = UntypedNamedNavigationTarget | RawNavigationTarget;

export type RouteContext<Params extends RouteParams = RouteParams, TRoutes extends RouteTable = RouteTable> = {
  /** Result from the route's `data()` function. Available in the handler; undefined in middleware. */
  readonly data?: unknown;
  readonly hash: string;
  /** State stored on the history entry that triggered this navigation. */
  readonly historyState: unknown;
  /** Mutable bag for passing data between middlewares */
  locals: Record<string, unknown>;
  /** Matched branch for the current navigation. Leaf node is the active route. */
  readonly matches: RouteMatchBranch;
  readonly navigate: (
    target: NamedNavigationTarget<TRoutes> | RawNavigationTarget,
    options?: NavigateOptions,
  ) => Promise<void>;
  readonly params: Params;
  readonly pathname: string;
  readonly query: QueryParams;
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

/** Handler may be sync or async - async return values are implicitly awaited by the router. */
export type RouteHandler<Params extends RouteParams = RouteParams, TRoutes extends RouteTable = RouteTable> = (
  context: RouteContext<Params, TRoutes>,
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

export type RouteChildren = Record<string, RouteDefinition<string>>;

export type RouteDefinition<Path extends string = string> = {
  /** Nested child routes. Keys become part of the compound route name (e.g. `dashboard.settings`). */
  children?: RouteChildren;
  /** Normalize/coerce search params for this route. Throwing keeps the original search params unchanged. */
  coerceSearch?: CoerceSearchFn;
  /** Data loader. Runs after middleware; result is available as `ctx.data` in the handler. */
  data?: DataFn<PathParams<Path>>;
  handler?: RouteHandler<PathParams<Path>>;
  /** When true the route inherits the parent path (acts as the default child). */
  index?: boolean;
  /** Lazy-load the route module. The resolved export replaces handler/data/meta. */
  lazy?: () => Promise<Pick<RouteDefinition<Path>, 'data' | 'handler' | 'meta'>>;
  meta?: unknown;
  /** Use `middleware` for auth guards, analytics, and error boundaries. */
  middleware?: Middleware[];
  /** Path segment. Absolute for top-level routes, relative for children. Omit when `index: true`. */
  path?: Path;
  /** Declarative redirect. Resolved before middleware runs. */
  redirect?: UntypedNamedNavigationTarget | RawNavigationTarget;
};

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
    query?: QueryParams;
  };
}[RouteName<TRoutes>];

export type Unsubscribe = () => void;

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

/** A single node in the matched route branch (root → leaf). */
export type RouteMatch = {
  /** Result of the route's `data()` function, or `undefined` if none was defined. */
  readonly data: unknown;
  readonly meta: unknown;
  readonly name: string;
  readonly params: RouteParams;
  readonly pathname: string;
};

/** Ordered array of matched route nodes from the root layout down to the active leaf. */
export type RouteMatchBranch = readonly RouteMatch[];

export type RouteLocation = {
  readonly hash: string;
  /** State object stored on the history entry (mirrors `history.state`). */
  readonly historyState: unknown;
  readonly pathname: string;
  readonly query: QueryParams;
};

export type RouterOptions<TRoutes extends RouteTable = RouteTable> = {
  /** Base path for all routes (default: '/') */
  base?: string;
  /** Custom history driver. Defaults to `createBrowserHistory()`. */
  history?: HistoryDriver;
  /** Global middleware applied to every route. Use this to implement authentication, analytics, and error boundaries. */
  middleware?: Middleware<TRoutes>[];
  /** Declarative route table. Object key order determines match precedence - place specific routes before wildcards. */
  routes: TRoutes;
  /** Called after every successful navigation with the scroll position to restore, or null to scroll to top. */
  scroll?: (to: RouteState, from: RouteState | null) => { x: number; y: number } | null | undefined;
  /** Wrap navigation in the View Transition API when available. Falls back to plain execution in unsupported environments. */
  viewTransition?: boolean;
};

export type RouteState = {
  /** The error thrown by a `data()` function. Only set when `status === 'error'`. */
  readonly error?: unknown;
  readonly location: RouteLocation;
  /** Matched route branch from root to leaf, including per-node data loader results. */
  readonly matches: RouteMatchBranch;
  /** `idle` after a successful navigation, `error` when a data loader threw. */
  readonly status: NavigationStatus;
};
