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
 *   if (!ctx.user) {
 *     router.navigate('/login');
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
  /** User object (can be set by auth middleware) */
  user?: unknown;
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
};

/** Current route state */
export type RouteState = {
  pathname: string;
  params: RouteParams;
  query: QueryParams;
  hash: string;
};

/** -------------------- Internal Types -------------------- **/

type RouteRecord<T = unknown> = {
  def: RouteDefinition<T>;
  fullPath: string;
  regex: RegExp;
  paramNames: string[];
};

/** -------------------- Path Utilities -------------------- **/

/**
 * Normalizes a path by removing trailing slashes and ensuring leading slash.
 */
function normalizePath(path: string): string {
  if (!path) return '/';
  let normalized = path.trim();

  // Ensure leading slash
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  // Replace multiple consecutive slashes with single slash
  normalized = normalized.replace(/\/+/g, '/');

  // Remove trailing slashes except for root
  if (normalized !== '/' && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Compiles a route pattern to a regex and extracts parameter names.
 * Supports: '/users/:id' and '/docs/*' (wildcard)
 */
function compilePattern(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];

  // Escape special regex characters except : and *
  let regexPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*'); // Wildcard matches anything

  // Replace :param with named capture group
  regexPattern = regexPattern.replace(/:(\w+)/g, (_, paramName) => {
    paramNames.push(paramName);
    return '([^/]+)'; // Match anything except slash
  });

  // Exact match (unless ends with wildcard)
  const anchored = pattern.endsWith('*') ? `^${regexPattern}` : `^${regexPattern}$`;

  return { paramNames, regex: new RegExp(anchored) };
}

/**
 * Attempts to match a pathname against a compiled route record.
 */
function matchRecord(pathname: string, record: RouteRecord): { params: RouteParams } | null {
  const match = pathname.match(record.regex);
  if (!match) return null;

  const params: RouteParams = {};
  record.paramNames.forEach((name, index) => {
    params[name] = decodeURIComponent(match[index + 1] || '');
  });

  return { params };
}

/**
 * Parses query string into object.
 * Supports array values (multiple same-name params).
 */
function parseQuery(search: string): QueryParams {
  const params: QueryParams = {};
  if (!search) return params;

  const queryString = search.startsWith('?') ? search.slice(1) : search;
  const urlParams = new URLSearchParams(queryString);

  for (const [key, value] of urlParams.entries()) {
    const existing = params[key];
    if (existing === undefined) {
      params[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      params[key] = [existing, value];
    }
  }

  return params;
}

/**
 * Combines base path with a route path.
 */
function joinPaths(base: string, path: string): string {
  const normalizedBase = normalizePath(base);
  const normalizedPath = normalizePath(path);

  if (normalizedBase === '/') return normalizedPath;
  if (normalizedPath === '/') return normalizedBase;

  return (normalizedBase + normalizedPath).replace(/\/+/g, '/');
}

/** -------------------- Router Implementation -------------------- **/

export class Router {
  private readonly mode: RouterMode;
  private readonly base: string;
  private readonly records: RouteRecord[] = [];
  private readonly routesByName = new Map<string, RouteRecord>();
  private readonly notFoundHandler?: RouteHandler;
  private readonly globalMiddleware: Middleware[] = [];
  private readonly listeners = new Set<() => void>();
  private isStarted = false;
  private readonly handleRouteCallback: () => void;

  constructor(options: RouterOptions = {}) {
    this.mode = options.mode ?? 'history';
    this.base = normalizePath(options.base ?? '/');
    this.notFoundHandler = options.notFound;

    // Store global middleware
    if (options.middleware) {
      this.globalMiddleware = Array.isArray(options.middleware) ? options.middleware : [options.middleware];
    }

    // Bind the handler once to avoid creating new functions
    this.handleRouteCallback = () => void this.handleRoute();
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

  /**
   * Compiles a route definition into route records (recursive for children)
   */
  // biome-ignore lint/suspicious/noExplicitAny: Internal method needs type flexibility for recursive compilation
  private compileRoute(def: RouteDefinition<any>, parentPath = ''): void {
    const fullPath = normalizePath(`${parentPath}/${def.path}`);
    const { regex, paramNames } = compilePattern(fullPath);

    const record: RouteRecord = {
      def,
      fullPath,
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
      const hash = destination.startsWith('#') ? destination : `#${destination}`;
      if (options.replace) {
        window.location.replace(hash);
      } else {
        window.location.hash = hash;
      }
    }

    this.handleRoute();
  }

  /**
   * Goes back in history.
   */
  back(): void {
    window.history.back();
  }

  /**
   * Goes forward in history.
   */
  forward(): void {
    window.history.forward();
  }

  /**
   * Goes to a specific position in history.
   */
  go(delta: number): void {
    window.history.go(delta);
  }

  /** -------------------- Current Route Info -------------------- **/

  /**
   * Gets the current pathname.
   */
  getCurrentPath(): string {
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

  /**
   * Gets current query parameters.
   */
  getCurrentQuery(): QueryParams {
    if (this.mode === 'history') {
      return parseQuery(window.location.search);
    }

    // Hash mode - extract query from hash
    const hash = window.location.hash || '';
    const queryStart = hash.indexOf('?');
    return queryStart >= 0 ? parseQuery(hash.slice(queryStart)) : {};
  }

  /**
   * Gets current hash (without #).
   */
  getCurrentHash(): string {
    if (this.mode === 'history') {
      return window.location.hash.slice(1);
    }
    return '';
  }

  /** -------------------- Route Handling -------------------- **/

  /**
   * Handles the current route by matching and executing handlers.
   */
  private async handleRoute(): Promise<void> {
    const pathname = this.getCurrentPath();

    // Find a matching route record
    const matchingRecord = this.records.find((record) => matchRecord(pathname, record));

    if (!matchingRecord) {
      // No route matched - call notFound handler
      if (this.notFoundHandler) {
        const context: RouteContext = {
          hash: this.getCurrentHash(),
          meta: {},
          navigate: (path, opts) => this.navigate(path, opts),
          params: {},
          pathname,
          query: this.getCurrentQuery(),
        };
        await this.notFoundHandler(context);
      }
      this.notifyListeners();
      return;
    }

    // Extract params
    const match = matchRecord(pathname, matchingRecord);
    if (!match) return; // Should never happen

    const context: RouteContext = {
      data: matchingRecord.def.data,
      hash: this.getCurrentHash(),
      meta: {},
      navigate: (path, opts) => this.navigate(path, opts),
      params: match.params,
      pathname,
      query: this.getCurrentQuery(),
    };

    try {
      // Execute middleware chain
      await this.executeMiddlewareChain(context, matchingRecord);
      this.notifyListeners();
    } catch (error) {
      // Middleware or handler threw an error
      console.error('[Router] Route handling error:', error);
      this.notifyListeners();
    }
  }

  /**
   * Executes the middleware chain for a route.
   */
  private async executeMiddlewareChain(context: RouteContext, record: RouteRecord): Promise<void> {
    // Collect all middleware: global + route-specific
    const routeMiddleware = record.def.middleware
      ? Array.isArray(record.def.middleware)
        ? record.def.middleware
        : [record.def.middleware]
      : [];

    const allMiddleware = [...this.globalMiddleware, ...routeMiddleware];

    // Build middleware execution chain
    let index = 0;

    const next = async (): Promise<void> => {
      if (index < allMiddleware.length) {
        const middleware = allMiddleware[index++];
        await middleware(context, next);
      } else {
        // All middleware executed - run the handler
        await record.def.handler(context);
      }
    };

    // Start the chain
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
    const pathname = this.getCurrentPath();
    const matchingRecord = this.records.find((record) => matchRecord(pathname, record));
    const params = matchingRecord ? (matchRecord(pathname, matchingRecord)?.params ?? {}) : {};

    return {
      hash: this.getCurrentHash(),
      params,
      pathname,
      query: this.getCurrentQuery(),
    };
  }

  /**
   * Gets current route parameters.
   */
  getParams(): RouteParams {
    return this.getState().params;
  }

  /**
   * Navigates to a named route with parameters.
   *
   * @example
   * router.navigateTo('userDetail', { id: '123' }, { tab: 'profile' });
   */
  navigateTo(name: string, params?: RouteParams, query?: QueryParams): void {
    const record = this.routesByName.get(name);
    if (!record) {
      throw new Error(`[Router] Route with name "${name}" not found`);
    }

    const url = this.buildUrl(record.fullPath, params, query);
    this.navigate(url);
  }

  /**
   * Generates a URL for a named route.
   *
   * @example
   * const url = router.urlFor('userDetail', { id: '123' });
   */
  urlFor(name: string, params?: RouteParams, query?: QueryParams): string {
    const record = this.routesByName.get(name);
    if (!record) {
      throw new Error(`[Router] Route with name "${name}" not found`);
    }

    return this.buildUrl(record.fullPath, params, query);
  }

  /**
   * Creates an anchor element for a route.
   *
   * @example
   * const link = router.link('/users/123', 'View User');
   * document.body.appendChild(link);
   */
  link(path: string, text: string, attributes?: Record<string, string>): HTMLAnchorElement {
    const anchor = document.createElement('a');
    anchor.href = joinPaths(this.base, path);
    anchor.textContent = text;

    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        anchor.setAttribute(key, value);
      }
    }

    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigate(path);
    });

    return anchor;
  }

  /**
   * Creates an anchor element for a named route.
   *
   * @example
   * const link = router.linkTo('userDetail', { id: '123' }, 'View User');
   */
  linkTo(
    name: string,
    params?: RouteParams,
    text?: string,
    query?: QueryParams,
    attributes?: Record<string, string>,
  ): HTMLAnchorElement {
    const url = this.urlFor(name, params, query);
    return this.link(url, text ?? name, attributes);
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
