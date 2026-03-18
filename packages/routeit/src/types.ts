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

/** Handler may be sync or async — async return values are implicitly awaited by the router. */
export type RouteHandler<Params extends RouteParams = RouteParams, Meta = unknown> = (
  context: RouteContext<Params, Meta>,
) => void;

/** Middleware function. Call `next()` to continue the chain; return without calling it to block navigation. */
export type Middleware<Meta = unknown> = (
  context: RouteContext<RouteParams, Meta>,
  next: () => Promise<void>,
) => void | Promise<void>;

export type RouteContext<Params extends RouteParams = RouteParams, Meta = unknown> = {
  readonly hash: string;
  /** Mutable bag for passing data between middlewares */
  locals: Record<string, unknown>;
  readonly meta?: Meta;
  readonly navigate: (target: NavigationTarget, options?: NavigateOptions) => Promise<void>;
  readonly params: Params;
  readonly pathname: string;
  readonly query: QueryParams;
};

/** Options for `on()` route registration. */
export type RouteOptions<Meta = unknown> = {
  /** Static metadata passed to the route context */
  meta?: Meta;
  /** Route-specific middleware executed before the handler */
  middleware?: Middleware<Meta> | Middleware<Meta>[];
  /** Optional name for programmatic navigation and url()/isActive() lookups */
  name?: string;
};

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

/**
 * Navigation target — a path string or a named-route descriptor.
 * @example
 * router.navigate('/users/123')
 * router.navigate({ name: 'userDetail', params: { id: '123' } })
 */
export type NavigationTarget = string | { hash?: string; name: string; params?: RouteParams; query?: QueryParams };

export type RouterMode = 'history' | 'hash';
export type Unsubscribe = () => void;

export type RouterOptions = {
  /** Start listening and handle the current URL immediately after construction, without a separate start() call (default: false) */
  autoStart?: boolean;
  /** Base path for all routes (default: '/') */
  base?: string;
  /** Global middleware applied to every route */
  middleware?: Middleware | Middleware[];
  /** Router mode — 'history' uses the HTML5 History API, 'hash' uses URL hash (default: 'history') */
  mode?: RouterMode;
  /** Called when a route handler or middleware throws an error */
  onError?: (error: unknown, context: RouteContext) => void;
  /** Called when no route matches the current URL */
  onNotFound?: RouteHandler;
  /**
   * Wrap navigation in the View Transition API when available.
   * Falls back to plain execution in unsupported environments. (default: false)
   */
  viewTransition?: boolean;
};

export type GroupOptions = { middleware?: Middleware | Middleware[] };

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

/** Route registration interface provided to group() callbacks */
export type RouteGroup<Prefix extends string = ''> = {
  group<P extends string>(
    prefix: P,
    definer: (r: RouteGroup<`${Prefix}/${P}`>) => void,
    options?: GroupOptions,
  ): RouteGroup<Prefix>;
  on<Path extends string, Meta = unknown>(
    path: Path,
    handler: RouteHandler<PathParams<`${Prefix}/${Path}`>, Meta>,
    options?: RouteOptions<Meta>,
  ): RouteGroup<Prefix>;
  on<Path extends string, Meta = unknown>(path: Path, options?: RouteOptions<Meta>): RouteGroup<Prefix>;
};

/** -------------------- Internal Types -------------------- **/

export type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => { finished: Promise<void> };
};

export type RouteRecord = {
  handler?: RouteHandler;
  meta?: unknown;
  middleware: Middleware[];
  name?: string;
  paramNames: string[];
  path: string;
  prefixRegex: RegExp;
  regex: RegExp;
};
