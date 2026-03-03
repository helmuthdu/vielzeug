/** -------------------- Core Types -------------------- **/

export type RouteParams = Record<string, string>;
export type QueryParams = Record<string, string | string[]>;

export type RouteHandler<T = unknown> = (context: RouteContext<T>) => void | Promise<void>;

/**
 * Middleware function that can modify context or block navigation.
 * Return false or throw to prevent route handler execution.
 *
 * @example
 * const authMiddleware: Middleware = async (ctx, next) => {
 *   if (!ctx.meta?.user) {
 *     ctx.navigate('/login');
 *     return; // Don't call next()
 *   }
 *   await next(); // Continue to next middleware or handler
 * };
 */
export type Middleware<T = unknown> = (context: RouteContext<T>, next: () => Promise<void>) => void | Promise<void>;

export type RouteContext<T = unknown> = {
  /** Route parameters extracted from path (e.g., /users/:id => { id: '123' }) */
  params: RouteParams;
  /** Query parameters from URL search (e.g., ?name=alice => { name: 'alice' }) */
  query: QueryParams;
  /** Full pathname */
  pathname: string;
  /** Hash portion of URL (without #) */
  hash: string;
  /** Custom route data */
  data?: T;
  /** Custom metadata that can be passed between middlewares */
  meta?: Record<string, unknown>;
  /** Navigate to a new path */
  navigate: (path: string, options?: NavigateOptions) => void;
};

export type RouteDefinition<T = unknown> = {
  /** Route path pattern (e.g., '/users/:id', '/posts/*') */
  path: string;
  /** Handler function to execute when route matches */
  handler: RouteHandler<T>;
  /** Optional route name for easier navigation */
  name?: string;
  /** Optional custom data attached to route */
  data?: T;
  /** Route-specific middleware (executed before handler) */
  middleware?: Middleware<T> | Middleware<T>[];
  /** Optional child routes */
  children?: RouteDefinition[];
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
  notFound?: RouteHandler;
  /** Global middleware applied to all routes */
  middleware?: Middleware | Middleware[];
  /**
   * Wrap route handler execution in the View Transition API when available.
   * Falls back to a plain execution when the API is not supported by the browser.
   * Can be overridden per navigation via `NavigateOptions.viewTransition`.
   * (default: false)
   */
  viewTransitions?: boolean;
};

/** Current route state */
export type RouteState = {
  pathname: string;
  params: RouteParams;
  query: QueryParams;
  hash: string;
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

/** -------------------- Router Implementation -------------------- **/

export class Router {
  private readonly mode: RouterMode;
  private readonly base: string;
  private readonly records: RouteRecord[] = [];
  private readonly routesByName = new Map<string, RouteRecord>();
  private readonly notFoundHandler?: RouteHandler;
  private readonly globalMiddleware: Middleware[];
  private readonly viewTransitions: boolean;
  private readonly listeners = new Set<() => void>();
  private isStarted = false;
  private currentState: RouteState = { hash: '', params: {}, pathname: '/', query: {} };
  private readonly handleRouteCallback = (): void => {
    void this.handleRoute();
  };

  constructor(options: RouterOptions = {}) {
    this.mode = options.mode ?? 'history';
    this.base = normalizePath(options.base ?? '/');
    this.notFoundHandler = options.notFound;
    this.viewTransitions = options.viewTransitions ?? false;
    this.globalMiddleware = [options.middleware ?? []].flat() as Middleware[];
  }

  /** -------------------- Route Registration -------------------- **/

  /**
   * Registers a new route.
   * Automatically compiles nested child routes.
   */
  route<T = unknown>(definition: RouteDefinition<T>): this {
    // biome-ignore lint/suspicious/noExplicitAny: RouteDefinition needs type flexibility for recursive compilation
    this.compileRoute(definition as RouteDefinition<any>);
    return this;
  }

  // biome-ignore lint/suspicious/noExplicitAny: RouteDefinition needs type flexibility for recursive compilation
  private compileRoute(def: RouteDefinition<any>, parentPath = ''): void {
    const fullPath = normalizePath(`${parentPath}/${def.path}`);
    const { regex, paramNames } = compilePattern(fullPath);
    const middleware = [def.middleware ?? []].flat() as Middleware[];

    const record: RouteRecord = {
      def,
      fullPath,
      middleware,
      paramNames,
      regex,
    };

    this.records.push(record);

    // Store by name for quick lookup
    if (def.name) {
      if (this.routesByName.has(def.name)) {
        console.warn(`[Router] Route name "${def.name}" is already registered. Overwriting.`);
      }
      this.routesByName.set(def.name, record);
    }

    // Compile children
    if (def.children?.length) {
      for (const child of def.children) {
        this.compileRoute(child, fullPath);
      }
    }
  }

  /**
   * Registers multiple routes at once.
   */
  routes(definitions: RouteDefinition[]): this {
    for (const def of definitions) {
      this.route(def);
    }
    return this;
  }

  /**
   * Convenience method to register a GET-like route.
   */
  get(path: string, handler: RouteHandler): this {
    return this.route({ handler, path });
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

    // Handle initial route
    this.handleRoute();
    return this;
  }

  /**
   * Stops the router and removes event listeners.
   */
  stop(): void {
    if (!this.isStarted) return;
    this.isStarted = false;

    if (this.mode === 'history') {
      window.removeEventListener('popstate', this.handleRouteCallback);
    } else {
      window.removeEventListener('hashchange', this.handleRouteCallback);
    }
  }

  /** -------------------- Navigation -------------------- **/

  /**
   * Navigates to a new path.
   */
  navigate(path: string, options: NavigateOptions = {}): void {
    const destination = path.startsWith('http') ? path : joinPaths(this.base, path);

    if (this.mode === 'history') {
      if (options.replace) {
        window.history.replaceState(options.state ?? null, '', destination);
      } else {
        window.history.pushState(options.state ?? null, '', destination);
      }
    } else {
      // Hash mode
      const hash = `#${destination}`;
      if (options.replace) {
        window.location.replace(hash);
      } else {
        window.location.hash = hash;
      }
    }

    void this.handleRoute(options.viewTransition);
  }

  /** -------------------- Current Route Info -------------------- **/

  private getCurrentPath(): string {
    if (this.mode === 'history') {
      const path = window.location.pathname || '/';
      // Remove base path if present
      if (this.base !== '/' && path.startsWith(this.base)) {
        return normalizePath(path.slice(this.base.length) || '/');
      }
      return normalizePath(path);
    }

    // Hash mode - extract path from hash
    const hash = window.location.hash || '';
    const path = hash.startsWith('#') ? hash.slice(1).split('?')[0] : hash.split('?')[0];
    return normalizePath(path || '/');
  }

  private getCurrentQuery(): QueryParams {
    if (this.mode === 'history') {
      return parseQuery(window.location.search);
    }

    // Hash mode - extract query from hash
    const hash = window.location.hash || '';
    const queryStart = hash.indexOf('?');
    return queryStart >= 0 ? parseQuery(hash.slice(queryStart)) : {};
  }

  private getCurrentHash(): string {
    if (this.mode === 'history') {
      return window.location.hash.slice(1);
    }
    return '';
  }

  /** -------------------- Route Handling -------------------- **/

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

  /**
   * Handles the current route by matching and executing handlers.
   */
  private buildContext(
    pathname: string,
    params: RouteParams,
    hash: string,
    query: QueryParams,
    data?: unknown,
  ): RouteContext {
    return {
      data,
      hash,
      meta: {},
      navigate: (path, opts) => this.navigate(path, opts),
      params,
      pathname,
      query,
    };
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

    this.currentState = { hash, params: matchedParams, pathname, query };

    try {
      await this.runWithTransition(useTransition, async () => {
        if (!matchedRecord) {
          if (this.notFoundHandler) await this.notFoundHandler(this.buildContext(pathname, {}, hash, query));
        } else {
          await this.executeMiddlewareChain(
            this.buildContext(pathname, matchedParams, hash, query, matchedRecord.def.data),
            matchedRecord,
          );
        }
      });
    } catch (error) {
      console.error('[Router] Route handling error:', error);
    } finally {
      this.notifyListeners();
    }
  }

  /**
   * Executes the middleware chain for a route.
   */
  private async executeMiddlewareChain(context: RouteContext, record: RouteRecord): Promise<void> {
    const allMiddleware = [...this.globalMiddleware, ...record.middleware];
    let index = 0;
    const next = async (): Promise<void> => {
      if (index < allMiddleware.length) {
        await allMiddleware[index++](context, next);
      } else {
        await record.def.handler(context);
      }
    };
    await next();
  }

  /** -------------------- Subscriptions -------------------- **/

  /**
   * Subscribes to route changes.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // Swallow listener errors
      }
    }
  }

  /** -------------------- Utilities -------------------- **/

  /**
   * Checks if a path matches the current route.
   */
  isActive(pattern: string): boolean {
    const currentPath = this.getCurrentPath();
    const { regex } = compilePattern(pattern);
    return regex.test(currentPath);
  }

  /**
   * Generates a URL from a path pattern and parameters.
   */
  buildUrl(path: string, params?: RouteParams, query?: QueryParams): string {
    let url = path;

    // Replace parameters
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url = url.replace(`:${key}`, encodeURIComponent(value));
      }
    }

    // Add query parameters
    if (query && Object.keys(query).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) {
          for (const v of value) {
            searchParams.append(key, v);
          }
        } else {
          searchParams.set(key, value);
        }
      }
      url += `?${searchParams.toString()}`;
    }

    return joinPaths(this.base, url);
  }

  /**
   * Gets the current route state (pathname, params, query, hash).
   */
  getState(): RouteState {
    return { ...this.currentState };
  }

  /**
   * Navigates to a named route with parameters.
   *
   * @example
   * router.navigateTo('userDetail', { id: '123' }, { tab: 'profile' });
   */
  navigateTo(name: string, params?: RouteParams, query?: QueryParams): void {
    this.navigate(this.urlFor(name, params, query));
  }

  /**
   * Generates a URL for a named route.
   *
   * @example
   * const url = router.urlFor('userDetail', { id: '123' });
   */
  urlFor(name: string, params?: RouteParams, query?: QueryParams): string {
    const record = this.routesByName.get(name);
    if (!record) throw new Error(`[Router] Route with name "${name}" not found`);
    return this.buildUrl(record.fullPath, params, query);
  }

  /**
   * Debug helper to inspect compiled routes.
   */
  debug(): { routes: Array<{ name?: string; path: string; params: string[] }>; mode: RouterMode; base: string } {
    return {
      base: this.base,
      mode: this.mode,
      routes: this.records.map((record) => ({
        name: record.def.name,
        params: record.paramNames,
        path: record.fullPath,
      })),
    };
  }
}

/** -------------------- Factory Function -------------------- **/

/**
 * Creates a new router instance.
 */
export function createRouter(options?: RouterOptions): Router {
  return new Router(options);
}
