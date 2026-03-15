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

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => { finished: Promise<void> };
};

type RouteRecord = {
  handler?: RouteHandler;
  meta?: unknown;
  middleware: Middleware[];
  name?: string;
  paramNames: string[];
  path: string;
  prefixRegex: RegExp;
  regex: RegExp;
};

/** -------------------- Path Utilities -------------------- **/

function normalizePath(path: string): string {
  if (!path) return '/';

  const normalized = `/${path.trim()}`.replace(/\/+/g, '/');

  return normalized !== '/' && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function buildRegexStr(pattern: string): { paramNames: string[]; regexStr: string } {
  const paramNames: string[] = [];
  const regexStr = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\/:([\w]+)\*/g, (_, name) => {
      paramNames.push(name);

      return '(?:/(.*)|$)';
    })
    .replace(/:([\w]+)\*/g, (_, name) => {
      paramNames.push(name);

      return '(.*)';
    })
    .replace(/\*/g, '.*')
    .replace(/:([\w]+)/g, (_, name) => {
      paramNames.push(name);

      return '([^/]+)';
    });

  return { paramNames, regexStr };
}

function compilePattern(pattern: string, exact = true): { paramNames: string[]; regex: RegExp } {
  const { paramNames, regexStr } = buildRegexStr(pattern);
  // Wildcard patterns never need a $ anchor; exact patterns do; prefix patterns use (/.*)?$
  const anchor = pattern.endsWith('*') ? '' : exact ? '$' : '(/.*)?$';

  return { paramNames, regex: new RegExp(`^${regexStr}${anchor}`) };
}

function matchRecord(pathname: string, record: RouteRecord): RouteParams | null {
  const match = pathname.match(record.regex);

  if (!match) return null;

  return Object.fromEntries(record.paramNames.map((name, i) => [name, decodeURIComponent(match[i + 1] ?? '')]));
}

const E = '[routeit]';

function parseQuery(search: string): QueryParams {
  const params: QueryParams = {};

  for (const [key, value] of new URLSearchParams(search)) {
    const existing = params[key];

    if (existing === undefined) params[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else params[key] = [existing, value];
  }

  return params;
}

function joinPaths(base: string, path: string): string {
  const a = normalizePath(base);
  const b = normalizePath(path);

  return a === '/' ? b : b === '/' ? a : `${a}${b}`;
}

function buildUrl(base: string, path: string, params?: RouteParams, query?: QueryParams): string {
  const url = path.replace(/:(\w+)(\*)?/g, (_, k, star) => {
    const value = params?.[k];

    if (value === undefined) throw new Error(`${E} Missing URL param: "${k}"`);

    // Wildcard params may contain '/' — don't encode them, and the trailing * is stripped implicitly
    return star ? value : encodeURIComponent(value);
  });

  if (query && Object.keys(query).length > 0) {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) for (const v of value) search.append(key, v);
      else search.set(key, value);
    }

    return joinPaths(base, `${url}?${search}`);
  }

  return joinPaths(base, url);
}

/** -------------------- Router -------------------- **/

export class Router {
  readonly #mode: RouterMode;
  readonly #base: string;
  readonly #records: RouteRecord[] = [];
  readonly #routesByName = new Map<string, RouteRecord>();
  readonly #routesByPath = new Map<string, RouteRecord>();
  readonly #onNotFound?: RouteHandler;
  readonly #onError?: (error: unknown, context: RouteContext) => void;
  readonly #globalMiddleware: Middleware[];
  readonly #useViewTransition: boolean;
  readonly #listeners = new Set<(state: RouteState) => void>();
  #isStarted = false;
  #lastHref = '';
  #navId = 0;
  #pendingViewTransition: boolean | undefined;
  #currentState: RouteState = { hash: '', params: {}, pathname: '/', query: {} };
  readonly #navigate: RouteContext['navigate'] = (target, options) => this.navigate(target, options);
  readonly #onPopState = (): void => {
    this.#lastHref =
      this.#mode === 'history' ? window.location.pathname + window.location.search : window.location.hash.slice(1);

    void this.#handleRoute(this.#pendingViewTransition);
    this.#pendingViewTransition = undefined;
  };

  constructor(options: RouterOptions = {}) {
    this.#mode = options.mode ?? 'history';
    this.#base = normalizePath(options.base ?? '/');
    this.#onNotFound = options.onNotFound;
    this.#onError = options.onError;
    this.#useViewTransition = options.viewTransition ?? false;
    this.#globalMiddleware = ([] as Middleware[]).concat(options.middleware ?? []);

    if (options.autoStart) queueMicrotask(() => this.start());
  }

  /** -------------------- Route Registration -------------------- **/

  /**
   * Registers a route with a path and handler.
   * Path params are typed from the path literal (e.g., '/users/:id' => ctx.params.id).
   * Omit the handler (or pass only options) for middleware-only routes.
   */
  on<Path extends string, Meta = unknown>(
    path: Path,
    handler: RouteHandler<PathParams<Path>, Meta>,
    options?: RouteOptions<Meta>,
  ): this;
  on<Path extends string, Meta = unknown>(path: Path, options?: RouteOptions<Meta>): this;
  on<Path extends string, Meta = unknown>(
    path: Path,
    handlerOrOptions?: RouteHandler<PathParams<Path>, Meta> | RouteOptions<Meta>,
    options?: RouteOptions<Meta>,
  ): this {
    if (typeof handlerOrOptions === 'function') {
      this.#register(path, handlerOrOptions as RouteHandler, options as RouteOptions);
    } else {
      this.#register(path, undefined, (handlerOrOptions ?? options) as RouteOptions);
    }

    return this;
  }

  /** Adds one or more global middleware after construction. */
  use(...middleware: Middleware[]): this {
    this.#globalMiddleware.push(...middleware);

    return this;
  }

  /** Registers a group of routes sharing a common path prefix and optional middleware. */
  group<Prefix extends string>(prefix: Prefix, definer: (r: RouteGroup<Prefix>) => void, options?: GroupOptions): this {
    this.#buildGroup(normalizePath(prefix), ([] as Middleware[]).concat(options?.middleware ?? []), definer);

    return this;
  }

  #buildGroup(prefix: string, inherited: Middleware[], definer: (r: RouteGroup<string>) => void): void {
    const r: RouteGroup<string> = {
      group: (nestedPrefix, nestedDefiner, nestedOptions) => {
        const fullPrefix = normalizePath(`${prefix}/${nestedPrefix}`);
        const nestedMiddleware = [...inherited, ...([] as Middleware[]).concat(nestedOptions?.middleware ?? [])];

        this.#buildGroup(fullPrefix, nestedMiddleware, nestedDefiner);

        return r;
      },
      on: (path, handlerOrOptions?, opts?) => {
        if (typeof handlerOrOptions === 'function') {
          this.#register(`${prefix}/${path}`, handlerOrOptions as RouteHandler, opts as RouteOptions, inherited);
        } else {
          this.#register(`${prefix}/${path}`, undefined, (handlerOrOptions ?? opts) as RouteOptions, inherited);
        }

        return r;
      },
    };

    definer(r);
  }

  #register(
    path: string,
    handler: RouteHandler | undefined,
    options?: RouteOptions,
    inherited: Middleware[] = [],
  ): void {
    const fullPath = normalizePath(path);
    const isWildcard = fullPath.endsWith('*');
    const { paramNames, regexStr } = buildRegexStr(fullPath);
    const routeMiddleware = ([] as Middleware[]).concat(options?.middleware ?? []);
    const record: RouteRecord = {
      handler,
      meta: options?.meta,
      middleware: [...inherited, ...routeMiddleware],
      name: options?.name,
      paramNames,
      path: fullPath,
      prefixRegex: new RegExp(`^${regexStr}${isWildcard ? '' : '(/.*)?$'}`),
      regex: new RegExp(`^${regexStr}${isWildcard ? '' : '$'}`),
    };

    this.#records.push(record);
    this.#routesByPath.set(fullPath, record);

    if (options?.name) {
      if (this.#routesByName.has(options.name)) {
        console.warn(`${E} Duplicate route name "${options.name}" — overwriting previous registration.`);
      }

      this.#routesByName.set(options.name, record);
    }
  }

  /** -------------------- Lifecycle -------------------- **/

  start(): this {
    if (this.#isStarted) return this;

    this.#isStarted = true;
    this.#lastHref =
      this.#mode === 'history' ? window.location.pathname + window.location.search : window.location.hash.slice(1);
    window.addEventListener(this.#mode === 'history' ? 'popstate' : 'hashchange', this.#onPopState);
    void this.#handleRoute();

    return this;
  }

  stop(): this {
    if (!this.#isStarted) return this;

    this.#isStarted = false;
    window.removeEventListener(this.#mode === 'history' ? 'popstate' : 'hashchange', this.#onPopState);

    return this;
  }

  /** Stops the router and clears all subscriptions. Also called by the `using` declaration. */
  dispose(): void {
    this.stop();
    this.#listeners.clear();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  /** -------------------- Navigation -------------------- **/

  /**
   * Navigates to a path or a named route.
   * @example
   * router.navigate('/users/123')
   * router.navigate({ name: 'userDetail', params: { id: '123' } })
   * router.navigate('/about', { replace: true })
   */
  async navigate(target: NavigationTarget, options: NavigateOptions = {}): Promise<void> {
    const path = this.#resolvePath(target);
    const destination = this.#mode === 'history' ? joinPaths(this.#base, path) : normalizePath(path);

    if (!options.force && destination === this.#lastHref) return;

    this.#lastHref = destination;

    if (this.#mode === 'history') {
      window.history[options.replace ? 'replaceState' : 'pushState'](options.state ?? null, '', destination);

      return this.#handleRoute(options.viewTransition);
    } else {
      // Let the hashchange event drive dispatch — setting location.hash fires it automatically.
      // Store pending viewTransition so #onPopState can forward it.
      this.#pendingViewTransition = options.viewTransition;

      if (options.replace) window.location.replace(`#${destination}`);
      else window.location.hash = destination;
    }
  }

  /** -------------------- State -------------------- **/

  /** The current route state (pathname, params, query, hash, name, meta). */
  get state(): RouteState {
    return { ...this.#currentState };
  }

  /**
   * Subscribes to route changes. The listener is called immediately with the current state.
   * Returns an unsubscribe function.
   */
  subscribe(listener: (state: RouteState) => void): Unsubscribe {
    this.#listeners.add(listener);

    try {
      listener(this.state);
    } catch (e) {
      console.error(`${E} Listener error:`, e);
    }

    return () => this.#listeners.delete(listener);
  }

  /** -------------------- Utilities -------------------- **/

  /**
   * Generates a URL from a named route or path pattern with optional params and query.
   * @example
   * router.url('/users/:id', { id: '42' })
   * router.url('userDetail', { id: '42' }, { tab: 'profile' })
   */
  url(nameOrPattern: string, params?: RouteParams, query?: QueryParams): string {
    const record = this.#routesByName.get(nameOrPattern);

    if (!record && !nameOrPattern.startsWith('/')) {
      throw new Error(`${E} Route "${nameOrPattern}" not found`);
    }

    const base = this.#mode === 'history' ? this.#base : '/';

    return buildUrl(base, record ? record.path : nameOrPattern, params, query);
  }

  /**
   * Returns true if the given path pattern or route name matches the current URL.
   * Pass `false` as the second argument for prefix matching (e.g. to highlight parent nav items).
   */
  isActive(nameOrPattern: string, exact = true): boolean {
    const { pathname } = this.#readLocation();
    const record = this.#routesByName.get(nameOrPattern) ?? this.#routesByPath.get(normalizePath(nameOrPattern));

    if (record) {
      if (exact) return record.regex.test(pathname);

      return record.prefixRegex.test(pathname);
    }

    return compilePattern(normalizePath(nameOrPattern), exact).regex.test(pathname);
  }

  /**
   * Synchronously resolves a pathname to the matching route without navigating. Returns null if no route matches.
   * Automatically strips the base path, so callers can pass `window.location.pathname` directly.
   */
  resolve(pathname: string): ResolvedRoute | null {
    const path = this.#mode === 'history' ? this.#stripBase(pathname) : normalizePath(pathname);

    for (const record of this.#records) {
      const params = matchRecord(path, record);

      if (params) return { meta: record.meta, name: record.name, params };
    }

    return null;
  }

  /** -------------------- Private -------------------- **/

  #resolvePath(target: NavigationTarget): string {
    if (typeof target === 'string') return target;

    const record = this.#routesByName.get(target.name);

    if (!record) throw new Error(`${E} Route "${target.name}" not found`);

    const path = buildUrl('/', record.path, target.params, target.query);

    return target.hash ? `${path}#${target.hash.replace(/^#/, '')}` : path;
  }

  #stripBase(path: string): string {
    return this.#base !== '/' && path.startsWith(this.#base)
      ? normalizePath(path.slice(this.#base.length) || '/')
      : normalizePath(path);
  }

  #readLocation(): { hash: string; pathname: string; query: QueryParams } {
    if (this.#mode === 'history') {
      return {
        hash: window.location.hash.slice(1),
        pathname: this.#stripBase(window.location.pathname || '/'),
        query: parseQuery(window.location.search),
      };
    }

    const raw = window.location.hash || '';
    const fragment = raw.startsWith('#') ? raw.slice(1) : raw;
    const qi = fragment.indexOf('?');

    return {
      hash: '',
      pathname: normalizePath(qi >= 0 ? fragment.slice(0, qi) : fragment || '/'),
      query: qi >= 0 ? parseQuery(fragment.slice(qi)) : {},
    };
  }

  async #handleRoute(useTransition?: boolean): Promise<void> {
    const id = ++this.#navId;
    const { hash, pathname, query } = this.#readLocation();

    let matchedRecord: RouteRecord | undefined;
    let matchedParams: RouteParams = {};

    for (const record of this.#records) {
      const params = matchRecord(pathname, record);

      if (params) {
        matchedRecord = record;
        matchedParams = params;
        break;
      }
    }

    this.#currentState = {
      hash,
      meta: matchedRecord?.meta,
      name: matchedRecord?.name,
      params: matchedParams,
      pathname,
      query,
    };

    const run = async (): Promise<void> => {
      if (this.#navId !== id) return;

      if (!matchedRecord) {
        if (this.#onNotFound) await this.#onNotFound(this.#ctx({ hash, meta: undefined, params: {}, pathname, query }));
      } else {
        await this.#runMiddleware(
          this.#ctx({ hash, meta: matchedRecord.meta, params: matchedParams, pathname, query }),
          matchedRecord,
        );
      }
    };

    try {
      const doc = typeof document !== 'undefined' ? (document as ViewTransitionDocument) : null;

      if ((useTransition ?? this.#useViewTransition) && doc?.startViewTransition) {
        await doc.startViewTransition(run).finished;
      } else {
        await run();
      }
    } catch (error) {
      if (this.#onError) {
        this.#onError(error, this.#ctx({ hash, meta: matchedRecord?.meta, params: matchedParams, pathname, query }));
      } else {
        console.error(`${E} Route handling error:`, error);
      }
    } finally {
      if (this.#navId === id) this.#notifyListeners();
    }
  }

  #ctx(loc: { hash: string; meta: unknown; params: RouteParams; pathname: string; query: QueryParams }): RouteContext {
    return { ...loc, locals: {}, navigate: this.#navigate };
  }

  async #runMiddleware(context: RouteContext, record: RouteRecord): Promise<void> {
    const globals = this.#globalMiddleware;
    const local = record.middleware;
    let i = 0;

    const next = async (): Promise<void> => {
      if (i < globals.length) {
        await globals[i++](context, next);
      } else {
        const li = i++ - globals.length;

        if (li < local.length) await local[li](context, next);
        else if (record.handler) await record.handler(context);
      }
    };

    await next();
  }

  #notifyListeners(): void {
    const s = this.state;

    for (const listener of this.#listeners) {
      try {
        listener(s);
      } catch (e) {
        console.error(`${E} Listener error:`, e);
      }
    }
  }
}

/** -------------------- Factory -------------------- **/

/** Creates a new router instance. */
export function createRouter(options?: RouterOptions): Router {
  return new Router(options);
}
