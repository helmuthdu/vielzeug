/** -------------------- Core Types -------------------- **/

export type RouteParams = Record<string, string>;
export type QueryParams = Record<string, string | string[]>;

export type RouteHandler<T = unknown> = (context: RouteContext<T>) => void | Promise<void>;

/**
 * Middleware function that can modify context or block navigation.
 * Does not call next() to prevent the handler from executing.
 *
 * @example
 * const authMiddleware: Middleware = async (ctx, next) => {
 *   if (!ctx.meta.user) {
 *     router.navigate('/login');
 *     return; // Don't call next()
 *   }
 *   await next();
 * };
 */
export type Middleware<T = unknown> = (context: RouteContext<T>, next: () => Promise<void>) => void | Promise<void>;

export type RouteContext<T = unknown> = {
  /** Route parameters extracted from path (e.g., /users/:id => { id: '123' }) */
  readonly params: RouteParams;
  /** Query parameters from URL search (e.g., ?name=alice => { name: 'alice' }) */
  readonly query: QueryParams;
  /** Full pathname */
  readonly pathname: string;
  /** Hash portion of URL (without #) */
  readonly hash: string;
  /** Custom route data */
  readonly data?: T;
  /** Custom metadata that can be passed between middlewares */
  meta: Record<string, unknown>;
};

export type RouteDefinition<T = unknown> = {
  /** Route path pattern (e.g., '/users/:id', '/posts/*') */
  path: string;
  /** Handler function to execute when route matches */
  handler?: RouteHandler<T>;
  /** Optional route name for programmatic navigation */
  name?: string;
  /** Optional custom data attached to route */
  data?: T;
  /** Route-specific middleware (executed before handler) */
  middleware?: Middleware<T> | Middleware<T>[];
};

export type NavigateOptions = {
  /** Replace current history entry instead of pushing */
  replace?: boolean;
  /** Additional state to store with history entry */
  state?: unknown;
  /**
   * Override the router-level `viewTransitions` setting for this navigation.
   * `true` opts in, `false` opts out even when globally enabled.
   */
  viewTransition?: boolean;
};

export type RouterMode = 'history' | 'hash';

export type RouterOptions = {
  /** Router mode - 'history' uses HTML5 History API, 'hash' uses URL hash */
  mode?: RouterMode;
  /** Base path for all routes (default: '/') */
  base?: string;
  /** Called when no route matches */
  onNotFound?: RouteHandler;
  /** Called when a route handler or middleware throws */
  onError?: (error: unknown, context: RouteContext) => void;
  /** Global middleware applied to all routes */
  middleware?: Middleware | Middleware[];
  /**
   * Wrap route handler execution in the View Transition API when available.
   * Falls back to plain execution when the API is not supported.
   * Can be overridden per navigation via `NavigateOptions.viewTransition`.
   * (default: false)
   */
  viewTransitions?: boolean;
};

/** Current route state */
export type RouteState = {
  readonly pathname: string;
  readonly params: RouteParams;
  readonly query: QueryParams;
  readonly hash: string;
  /** Name of the matched route, if registered with a name */
  readonly name?: string;
};

/** Route registration interface provided to group() callbacks */
export type GroupRouter = {
  on(path: string, handler: RouteHandler, extras?: Pick<RouteDefinition, 'name' | 'data' | 'middleware'>): GroupRouter;
  route<T = unknown>(definition: RouteDefinition<T>): GroupRouter;
  routes(definitions: RouteDefinition[]): GroupRouter;
};

/** -------------------- Internal Types -------------------- **/

// View Transition API — not yet included in all TS lib.dom versions
type ViewTransition = {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => ViewTransition;
};

type RouteRecord<T = unknown> = {
  def: RouteDefinition<T>;
  fullPath: string;
  regex: RegExp;
  paramNames: string[];
  middleware: Middleware[];
};

/** -------------------- Path Utilities -------------------- **/

function normalizePath(path: string): string {
  if (!path) return '/';
  const normalized = `/${path.trim()}`.replace(/\/+/g, '/');
  return normalized !== '/' && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function compilePattern(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const regexStr = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
  const anchored = pattern.endsWith('*') ? `^${regexStr}` : `^${regexStr}$`;
  return { paramNames, regex: new RegExp(anchored) };
}

function matchRecord(pathname: string, record: RouteRecord): RouteParams | null {
  const match = pathname.match(record.regex);
  if (!match) return null;

  const params: RouteParams = {};
  for (const [i, name] of record.paramNames.entries()) {
    params[name] = decodeURIComponent(match[i + 1] || '');
  }

  return params;
}

function parseQuery(search: string): QueryParams {
  const params: QueryParams = {};
  for (const [key, value] of new URLSearchParams(search)) {
    const existing = params[key];
    if (Array.isArray(existing)) existing.push(value);
    else params[key] = existing === undefined ? value : [existing, value];
  }
  return params;
}

function joinPaths(base: string, path: string): string {
  const a = normalizePath(base);
  const b = normalizePath(path);
  return a === '/' ? b : b === '/' ? a : `${a}${b}`;
}

function buildQueryString(query: QueryParams): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const v of value) searchParams.append(key, v);
    } else {
      searchParams.set(key, value);
    }
  }
  return searchParams.toString();
}

function buildUrlFromPattern(base: string, path: string, params?: RouteParams, query?: QueryParams): string {
  let url = path;

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(new RegExp(`:${key}\\b`, 'g'), encodeURIComponent(value));
    }
  }

  const unsubstituted = url.match(/:([\w]+)/g);
  if (unsubstituted) {
    throw new Error(`[Router] Missing URL params: ${unsubstituted.join(', ')}`);
  }

  if (query && Object.keys(query).length > 0) {
    url += `?${buildQueryString(query)}`;
  }

  return joinPaths(base, url);
}

/** -------------------- Router Implementation -------------------- **/

export class Router {
  private readonly mode: RouterMode;
  private readonly base: string;
  private readonly records: RouteRecord[] = [];
  private readonly routesByName = new Map<string, RouteRecord>();
  private readonly onNotFoundHandler?: RouteHandler;
  private readonly onErrorHandler?: (error: unknown, context: RouteContext) => void;
  private readonly globalMiddleware: Middleware[];
  private readonly viewTransitions: boolean;
  private readonly listeners = new Set<(state: RouteState) => void>();
  private isStarted = false;
  private currentState: RouteState = { hash: '', params: {}, pathname: '/', query: {} };
  private readonly handleRouteCallback = (): void => {
    void this.handleRoute();
  };

  constructor(options: RouterOptions = {}) {
    this.mode = options.mode ?? 'history';
    this.base = normalizePath(options.base ?? '/');
    this.onNotFoundHandler = options.onNotFound;
    this.onErrorHandler = options.onError;
    this.viewTransitions = options.viewTransitions ?? false;
    this.globalMiddleware = [options.middleware ?? []].flat() as Middleware[];
  }

  /** -------------------- Route Registration -------------------- **/

  /**
   * Registers a new route.
   */
  route<T = unknown>(definition: RouteDefinition<T>): this {
    this.registerRoute(definition as RouteDefinition<unknown>);
    return this;
  }

  private registerRoute(def: RouteDefinition<unknown>): void {
    const fullPath = normalizePath(def.path);
    const { regex, paramNames } = compilePattern(fullPath);
    const middleware = [def.middleware ?? []].flat() as Middleware[];

    const record: RouteRecord = { def, fullPath, middleware, paramNames, regex };
    this.records.push(record);

    if (def.name) {
      this.routesByName.set(def.name, record);
    }
  }

  /**
   * Registers multiple routes at once.
   */
  routes(definitions: RouteDefinition[]): this {
    for (const def of definitions) this.route(def);
    return this;
  }

  /**
   * Registers a route with a path and handler directly.
   * Optionally accepts a name, data, or middleware via extras.
   */
  on(path: string, handler: RouteHandler, extras?: Pick<RouteDefinition, 'name' | 'data' | 'middleware'>): this {
    return this.route({ ...extras, handler, path });
  }

  /**
   * Registers a group of routes sharing a common path prefix and optional middleware.
   */
  group(prefix: string, definer: (r: GroupRouter) => void): this;
  group(prefix: string, middleware: Middleware | Middleware[], definer: (r: GroupRouter) => void): this;
  group(
    prefix: string,
    middlewareOrDefiner: Middleware | Middleware[] | ((r: GroupRouter) => void),
    definer?: (r: GroupRouter) => void,
  ): this {
    const [groupMiddleware, define] =
      typeof middlewareOrDefiner === 'function' && !definer
        ? [[] as Middleware[], middlewareOrDefiner as (r: GroupRouter) => void]
        : [[middlewareOrDefiner as Middleware | Middleware[]].flat() as Middleware[], definer!];

    const self = this;
    const groupRouter: GroupRouter = {
      on(path, handler, extras) {
        return this.route({ ...extras, handler, path });
      },
      route(definition) {
        const fullPath = normalizePath(`${prefix}/${definition.path}`);
        const middleware = [...groupMiddleware, ...[definition.middleware ?? []].flat()] as Middleware[];
        self.registerRoute({ ...(definition as RouteDefinition<unknown>), middleware, path: fullPath });
        return this;
      },
      routes(definitions) {
        for (const def of definitions) this.route(def);
        return this;
      },
    };

    define(groupRouter);
    return this;
  }

  /** -------------------- Lifecycle -------------------- **/

  /**
   * Starts the router and begins listening to navigation events.
   */
  start(): this {
    if (this.isStarted) return this;
    this.isStarted = true;

    if (this.mode === 'history') {
      window.addEventListener('popstate', this.handleRouteCallback);
    } else {
      window.addEventListener('hashchange', this.handleRouteCallback);
    }

    void this.handleRoute();
    return this;
  }

  /**
   * Stops the router and removes event listeners.
   */
  stop(): this {
    if (!this.isStarted) return this;
    this.isStarted = false;

    if (this.mode === 'history') {
      window.removeEventListener('popstate', this.handleRouteCallback);
    } else {
      window.removeEventListener('hashchange', this.handleRouteCallback);
    }

    return this;
  }

  /** -------------------- Navigation -------------------- **/

  /**
   * Navigates to a path.
   *
   * @example
   * router.navigate('/users/123')
   * router.navigate('/users/123', { replace: true })
   */
  navigate(path: string, options: NavigateOptions = {}): Promise<void> {
    if (this.mode === 'history' && path.startsWith('http')) {
      window.location.href = path;
      return Promise.resolve();
    }

    const destination = joinPaths(this.base, path);

    if (this.mode === 'history') {
      if (options.replace) {
        window.history.replaceState(options.state ?? null, '', destination);
      } else {
        window.history.pushState(options.state ?? null, '', destination);
      }
    } else {
      if (options.replace) {
        window.location.replace(`#${destination}`);
      } else {
        window.location.hash = `#${destination}`;
      }
    }

    return this.handleRoute(options.viewTransition);
  }

  /**
   * Navigates to a named route with parameters.
   *
   * @example
   * router.navigateTo('userDetail', { id: '123' })
   * router.navigateTo('userDetail', { id: '123' }, { replace: true })
   */
  navigateTo(name: string, params?: RouteParams, options?: NavigateOptions): Promise<void> {
    return this.navigate(this.url(name, params), options);
  }

  /** -------------------- Current Route Info -------------------- **/

  private getCurrentPath(): string {
    if (this.mode === 'history') {
      const path = window.location.pathname || '/';
      if (this.base !== '/' && path.startsWith(this.base)) {
        return normalizePath(path.slice(this.base.length) || '/');
      }
      return normalizePath(path);
    }

    const hash = window.location.hash || '';
    const path = hash.startsWith('#') ? hash.slice(1).split('?')[0] : hash.split('?')[0];
    return normalizePath(path || '/');
  }

  private getCurrentQuery(): QueryParams {
    if (this.mode === 'history') return parseQuery(window.location.search);

    const hash = window.location.hash || '';
    const queryStart = hash.indexOf('?');
    return queryStart >= 0 ? parseQuery(hash.slice(queryStart)) : {};
  }

  private getCurrentHash(): string {
    if (this.mode === 'history') return window.location.hash.slice(1);
    return '';
  }

  /** -------------------- View Transitions -------------------- **/

  private async runWithTransition(useTransition: boolean | undefined, run: () => Promise<void>): Promise<void> {
    const shouldTransition =
      (useTransition ?? this.viewTransitions) &&
      typeof document !== 'undefined' &&
      typeof (document as ViewTransitionDocument).startViewTransition === 'function';

    if (shouldTransition) {
      await (document as ViewTransitionDocument).startViewTransition!(run).finished;
    } else {
      await run();
    }
  }

  /** -------------------- Route Handling -------------------- **/

  private buildContext(
    pathname: string,
    params: RouteParams,
    hash: string,
    query: QueryParams,
    data?: unknown,
  ): RouteContext {
    return { data, hash, meta: {}, params, pathname, query };
  }

  private async handleRoute(useTransition?: boolean): Promise<void> {
    const pathname = this.getCurrentPath();
    const hash = this.getCurrentHash();
    const query = this.getCurrentQuery();

    let matchedRecord: RouteRecord | undefined;
    let matchedParams: RouteParams = {};
    for (const record of this.records) {
      const params = matchRecord(pathname, record);
      if (params) {
        matchedRecord = record;
        matchedParams = params;
        break;
      }
    }

    this.currentState = { hash, name: matchedRecord?.def.name, params: matchedParams, pathname, query };

    try {
      await this.runWithTransition(useTransition, async () => {
        if (!matchedRecord) {
          if (this.onNotFoundHandler) await this.onNotFoundHandler(this.buildContext(pathname, {}, hash, query));
        } else {
          await this.executeMiddlewareChain(
            this.buildContext(pathname, matchedParams, hash, query, matchedRecord.def.data),
            matchedRecord,
          );
        }
      });
    } catch (error) {
      if (this.onErrorHandler) {
        this.onErrorHandler(error, this.buildContext(pathname, matchedParams, hash, query));
      } else {
        console.error('[Router] Route handling error:', error);
      }
    } finally {
      this.notifyListeners();
    }
  }

  private async executeMiddlewareChain(context: RouteContext, record: RouteRecord): Promise<void> {
    const allMiddleware = [...this.globalMiddleware, ...record.middleware];
    let index = 0;
    const next = async (): Promise<void> => {
      if (index < allMiddleware.length) {
        await allMiddleware[index++](context, next);
      } else if (record.def.handler) {
        await record.def.handler(context);
      }
    };
    await next();
  }

  /** -------------------- Subscriptions -------------------- **/

  /**
   * Subscribes to route changes. The listener receives the new route state.
   * Returns an unsubscribe function.
   */
  subscribe(listener: (state: RouteState) => void): () => void {
    this.listeners.add(listener);
    try {
      listener(this.getState());
    } catch {
      // Swallow listener errors
    }
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch {
        // Swallow listener errors
      }
    }
  }

  /** -------------------- Utilities -------------------- **/

  /**
   * Checks if a path pattern matches the current route.
   */
  isActive(patternOrName: string): boolean {
    const record = this.routesByName.get(patternOrName);
    const regex = record ? record.regex : compilePattern(patternOrName).regex;
    return regex.test(this.getCurrentPath());
  }

  /**
   * Generates a URL from a path pattern or named route, with optional params and query.
   *
   * @example
   * router.url('/users/:id', { id: '42' })
   * router.url('userDetail', { id: '42' }, { tab: 'profile' })
   */
  url(nameOrPattern: string, params?: RouteParams, query?: QueryParams): string {
    const record = this.routesByName.get(nameOrPattern);
    if (!record && !nameOrPattern.startsWith('/')) {
      throw new Error(`[Router] Route with name "${nameOrPattern}" not found`);
    }
    const pattern = record ? record.fullPath : nameOrPattern;
    return buildUrlFromPattern(this.base, pattern, params, query);
  }

  /**
   * Gets the current route state (pathname, params, query, hash).
   */
  getState(): RouteState {
    return { ...this.currentState };
  }
}

/** -------------------- Factory Function -------------------- **/

/**
 * Creates a new router instance.
 */
export function createRouter(options?: RouterOptions): Router {
  return new Router(options);
}
