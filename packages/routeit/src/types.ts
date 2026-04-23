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

export type PathNavigateOptions = Omit<NavigateOptions, 'replace'>;

/** Named-route navigation target. Routeit v3 does not accept raw path strings here. */
export type NavigationTarget = {
  hash?: string;
  name: string;
  params?: RouteParams;
  query?: QueryParams;
};

export type RouteContext<Params extends RouteParams = RouteParams, Meta = unknown> = {
  readonly hash: string;
  /** Mutable bag for passing data between middlewares */
  locals: Record<string, unknown>;
  readonly meta?: Meta;
  readonly navigate: (target: NavigationTarget, options?: NavigateOptions) => Promise<void>;
  readonly params: Params;
  readonly pathname: string;
  readonly pushPath: (path: string, options?: PathNavigateOptions) => Promise<void>;
  readonly query: QueryParams;
  readonly replacePath: (path: string, options?: PathNavigateOptions) => Promise<void>;
};

/** Handler may be sync or async — async return values are implicitly awaited by the router. */
export type RouteHandler<Params extends RouteParams = RouteParams, Meta = unknown> = (
  context: RouteContext<Params, Meta>,
) => MaybePromise<void>;

/** Middleware function. Call `next()` to continue the chain; return without calling it to block navigation. */
export type Middleware<Meta = unknown> = (
  context: RouteContext<RouteParams, Meta>,
  next: () => Promise<void>,
) => void | Promise<void>;

export type RouteDefinition<Path extends string = string, Meta = unknown> = {
  handler?: RouteHandler<PathParams<Path>, Meta>;
  meta?: Meta;
  middleware?: Middleware<Meta> | Middleware<Meta>[];
  path: Path;
};

type RouteTableShape = Record<string, { meta?: unknown; path: string }>;

export type RouteTable = Record<string, RouteDefinition<string, unknown>>;

export type RouteName<TRoutes extends RouteTable> = keyof TRoutes & string;

export type NamedNavigationTarget<TRoutes extends RouteTable> = {
  [Name in RouteName<TRoutes>]: {
    hash?: string;
    name: Name;
    params?: PathParams<TRoutes[Name]['path']>;
    query?: QueryParams;
  };
}[RouteName<TRoutes>];

export type DefinedRouteTable<TRoutes extends RouteTableShape> = {
  [Name in keyof TRoutes]: RouteDefinition<
    TRoutes[Name] extends { path: infer Path extends string } ? Path : never,
    TRoutes[Name] extends { meta?: infer Meta } ? Meta : unknown
  >;
};

export type Unsubscribe = () => void;

export type RouterOptions<TRoutes extends RouteTable = RouteTable> = {
  /** Start listening and handle the current URL immediately after construction, without a separate start() call (default: false) */
  autoStart?: boolean;
  /** Base path for all routes (default: '/') */
  base?: string;
  /** Global middleware applied to every route. Use this to implement authentication, analytics, and error boundaries. */
  middleware?: Middleware | Middleware[];
  /** Declarative route table. Object key order is preserved and determines match precedence. */
  routes: TRoutes;
  /** Wrap navigation in the View Transition API when available. Falls back to plain execution in unsupported environments. */
  viewTransition?: boolean;
};

export type RouteState = {
  readonly hash: string;
  readonly meta?: unknown;
  readonly name?: string;
  readonly params: RouteParams;
  readonly pathname: string;
  readonly query: QueryParams;
};

export type ResolvedRoute = {
  readonly meta?: unknown;
  readonly name?: string;
  readonly params: RouteParams;
};

/** -------------------- Internal Types -------------------- **/

export type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => { finished: Promise<void> };
};

export type RouteSegment =
  | { kind: 'param'; name: string }
  | { kind: 'param-splat'; name: string }
  | { kind: 'splat' }
  | { kind: 'static'; value: string };

export type RouteRecord = {
  handler?: RouteHandler;
  meta?: unknown;
  middleware: Middleware[];
  name: string;
  path: string;
  segments: RouteSegment[];
};
