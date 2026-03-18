import { resolvePath, stripBase, readLocation, handleRoute, createOnPopState } from './navigation';
import { buildUrl, joinPaths, matchRecord, normalizePath, buildRegexStr } from './path';
import {
  type GroupOptions,
  type Middleware,
  type NavigateOptions,
  type NavigationTarget,
  type ResolvedRoute,
  type RouteContext,
  type RouteGroup,
  type RouteHandler,
  type RouteOptions,
  type RouteParams,
  type RouteRecord,
  type RouteState,
  type RouterMode,
  type RouterOptions,
  type Unsubscribe,
  type QueryParams,
  type PathParams,
} from './types';

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
  readonly #onPopState: () => void;

  constructor(options: RouterOptions = {}) {
    this.#mode = options.mode ?? 'history';
    this.#base = normalizePath(options.base ?? '/');
    this.#onNotFound = options.onNotFound;
    this.#onError = options.onError;
    this.#useViewTransition = options.viewTransition ?? false;
    this.#globalMiddleware = ([] as Middleware[]).concat(options.middleware ?? []);

    this.#onPopState = createOnPopState(
      this.#mode,
      this.#base,
      this.#records,
      this.#globalMiddleware,
      this.#onNotFound,
      this.#onError,
      this.#useViewTransition,
      this.#navigate,
      (state) => (this.#currentState = state),
      () => this.#notifyListeners(),
      () => ++this.#navId,
      (value) => (this.#lastHref = value),
      () => this.#pendingViewTransition,
      (value) => (this.#pendingViewTransition = value),
    );

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
        console.warn('[routeit] Duplicate route name "${options.name}" — overwriting previous registration.');
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
    const path = resolvePath(target, this.#routesByName);
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
      console.error('[routeit] Listener error:', e);
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
      throw new Error('[routeit] Route "${nameOrPattern}" not found');
    }

    const base = this.#mode === 'history' ? this.#base : '/';

    return buildUrl(base, record ? record.path : nameOrPattern, params, query);
  }

  /**
   * Returns true if the given path pattern or route name matches the current URL.
   * Pass `false` as the second argument for prefix matching (e.g. to highlight parent nav items).
   */
  isActive(nameOrPattern: string, exact = true): boolean {
    const { pathname } = readLocation(this.#mode, this.#base);
    const record = this.#routesByName.get(nameOrPattern) ?? this.#routesByPath.get(normalizePath(nameOrPattern));

    if (record) {
      if (exact) return record.regex.test(pathname);

      return record.prefixRegex.test(pathname);
    }

    const { regexStr } = buildRegexStr(normalizePath(nameOrPattern));

    return new RegExp(`^${regexStr}${exact ? '$' : '(/.*)?$'}`).test(pathname);
  }

  /**
   * Synchronously resolves a pathname to the matching route without navigating. Returns null if no route matches.
   * Automatically strips the base path, so callers can pass `window.location.pathname` directly.
   */
  resolve(pathname: string): ResolvedRoute | null {
    const path = this.#mode === 'history' ? stripBase(pathname, this.#base) : normalizePath(pathname);

    for (const record of this.#records) {
      const params = matchRecord(path, record);

      if (params) return { meta: record.meta, name: record.name, params };
    }

    return null;
  }

  /** -------------------- Private -------------------- **/

  async #handleRoute(useTransition?: boolean): Promise<void> {
    const id = ++this.#navId;

    await handleRoute(
      this.#mode,
      this.#base,
      this.#records,
      this.#globalMiddleware,
      this.#onNotFound,
      this.#onError,
      this.#useViewTransition,
      this.#navigate,
      (state) => (this.#currentState = state),
      () => this.#notifyListeners(),
      id,
      useTransition,
    );
  }

  #notifyListeners(): void {
    const s = this.state;

    for (const listener of this.#listeners) {
      try {
        listener(s);
      } catch (e) {
        console.error('[routeit] Listener error:', e);
      }
    }
  }
}

/** -------------------- Factory -------------------- **/

/** Creates a new router instance. */
export function createRouter(options?: RouterOptions): Router {
  return new Router(options);
}
