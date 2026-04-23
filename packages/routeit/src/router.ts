import type {
  DefinedRouteTable,
  Middleware,
  NamedNavigationTarget,
  PathNavigateOptions,
  PathParams,
  QueryParams,
  ResolvedRoute,
  RouteRecord,
  RouteState,
  RouteTable,
  RouteName,
  RouterOptions,
  Unsubscribe,
} from './types';

import { createRouteState, getRouteByName, handleRoute, readLocation, resolveTarget, stripBase } from './navigation';
import { buildUrl, compileRouteSegments, matchRoute, matchesPrefix, normalizePath } from './path';

function normalizeMiddleware(input: Middleware | Middleware[] | undefined): Middleware[] {
  if (!input) return [];

  return Array.isArray(input) ? [...input] : [input];
}

export class Router<TRoutes extends RouteTable = RouteTable> {
  readonly #base: string;
  readonly #records: readonly RouteRecord[];
  readonly #routesByName: ReadonlyMap<string, RouteRecord>;
  readonly #useViewTransition: boolean;

  #currentState: RouteState;
  #disposed = false;
  #lastHref = '/';
  readonly #listeners = new Set<(state: RouteState) => void>();
  #navigationId = 0;
  #started = false;
  readonly #unlistenPopState: () => void;

  constructor(options: RouterOptions<TRoutes>) {
    this.#base = normalizePath(options.base ?? '/');
    this.#useViewTransition = options.viewTransition ?? false;
    this.#records = this.#compileRecords(options);
    this.#routesByName = new Map(this.#records.map((record) => [record.name, record]));
    this.#currentState = createRouteState({
      hash: '',
      params: {},
      pathname: '/',
      query: {},
    });
    this.#unlistenPopState = this.#registerPopStateListener();

    if (options.autoStart) this.start();
  }

  get state(): RouteState {
    return this.#currentState;
  }

  #compileRecords(options: RouterOptions<TRoutes>): readonly RouteRecord[] {
    const globalMiddleware = normalizeMiddleware(options.middleware);

    return Object.entries(options.routes).map(([name, route]) => ({
      handler: route.handler,
      meta: route.meta,
      middleware: [...globalMiddleware, ...normalizeMiddleware(route.middleware)],
      name,
      path: route.path,
      segments: compileRouteSegments(route.path),
    }));
  }

  #assertNotDisposed(): void {
    if (this.#disposed) throw new Error('[routeit] Router is disposed');
  }

  #registerPopStateListener(): () => void {
    const onPopState = (): void => {
      if (!this.#started) return;

      this.#lastHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      this.#runInBackground(this.#handleRoute());
    };

    window.addEventListener('popstate', onPopState);

    return () => window.removeEventListener('popstate', onPopState);
  }

  #notifyListeners(): void {
    this.#listeners.forEach((listener) => listener(this.#currentState));
  }

  #runInBackground(promise: Promise<void>): void {
    void promise.catch((error) => {
      queueMicrotask(() => {
        throw error;
      });
    });
  }

  #isNavigationCurrent(id: number): boolean {
    return id === this.#navigationId;
  }

  async #handleRoute(useTransition?: boolean): Promise<void> {
    const navigationId = ++this.#navigationId;

    await handleRoute({
      base: this.#base,
      isNavigationCurrent: () => this.#isNavigationCurrent(navigationId),
      navigate: (target, options) => this.navigate(target as NamedNavigationTarget<TRoutes>, options),
      notifyListeners: () => this.#notifyListeners(),
      pushPath: (path, options) => this.pushPath(path, options),
      records: this.#records,
      replacePath: (path, options) => this.replacePath(path, options),
      setCurrentState: (state) => {
        this.#currentState = state;
      },
      useTransition,
      useViewTransition: this.#useViewTransition,
    });
  }

  #resolveDestination(path: string): string {
    const [pathWithQuery, hash = ''] = path.split('#');
    const [pathname, search = ''] = pathWithQuery.split('?');
    const joinedPath = normalizePath(`${this.#base}/${pathname}`);

    return `${joinedPath}${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}`;
  }

  async #navigateToPath(path: string, options: import('./types').NavigateOptions = {}): Promise<void> {
    this.#assertNotDisposed();

    const destination = this.#resolveDestination(path);

    if (!options.force && destination === this.#lastHref) return;

    this.#lastHref = destination;

    if (options.replace) {
      window.history.replaceState(options.state, '', destination);
    } else {
      window.history.pushState(options.state, '', destination);
    }

    await this.#handleRoute(options.viewTransition);
  }

  /** Start listening to browser navigation and handle the current route once. */
  start(): this {
    this.#assertNotDisposed();

    if (this.#started) return this;

    this.#started = true;
    this.#lastHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    this.#runInBackground(this.#handleRoute());

    return this;
  }

  /** Stop listening to browser navigation without disposing the router instance. */
  stop(): void {
    this.#assertNotDisposed();
    this.#started = false;
  }

  /** Navigate using a named route target. */
  navigate<Name extends RouteName<TRoutes>>(
    target: Extract<NamedNavigationTarget<TRoutes>, { name: Name }>,
    options?: import('./types').NavigateOptions,
  ): Promise<void> {
    const destination = resolveTarget(target, this.#routesByName);

    return this.#navigateToPath(destination, options);
  }

  /** Raw path escape hatch for one-off destinations that do not belong in the route table. */
  pushPath(path: string, options?: PathNavigateOptions): Promise<void> {
    return this.#navigateToPath(path, options);
  }

  /** Raw path escape hatch that replaces the current history entry. */
  replacePath(path: string, options?: PathNavigateOptions): Promise<void> {
    return this.#navigateToPath(path, { ...options, replace: true });
  }

  /** Build a URL for a named route, including optional params and query string. */
  url<Name extends RouteName<TRoutes>>(
    name: Name,
    params?: PathParams<TRoutes[Name]['path']>,
    query?: QueryParams,
  ): string {
    const route = getRouteByName(name, this.#routesByName);

    return buildUrl(this.#base, route.path, params, query);
  }

  /** Returns true when the current location matches the named route exactly or as a prefix. */
  isActive<Name extends RouteName<TRoutes>>(name: Name, exact = true): boolean {
    const route = getRouteByName(name, this.#routesByName);
    const { pathname } = readLocation(this.#base);

    return exact ? matchRoute(pathname, [route]).record != null : matchesPrefix(pathname, route);
  }

  /** Resolve a pathname to the matching named route without running middleware or handlers. */
  resolve(pathname: string): ResolvedRoute | null {
    const { params, record } = matchRoute(stripBase(normalizePath(pathname), this.#base), this.#records);

    if (!record) return null;

    return {
      meta: record.meta,
      name: record.name,
      params,
    };
  }

  /** Subscribe to state changes. The listener is called immediately with the current state. */
  subscribe(listener: (state: RouteState) => void): Unsubscribe {
    this.#assertNotDisposed();
    this.#listeners.add(listener);
    listener(this.#currentState);

    return () => {
      this.#listeners.delete(listener);
    };
  }

  /** Dispose event listeners and prevent further router interaction. */
  dispose(): void {
    if (this.#disposed) return;

    this.#disposed = true;
    this.#started = false;
    this.#listeners.clear();
    this.#unlistenPopState();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

export function createRouter<const TRoutes extends RouteTable>(options: RouterOptions<TRoutes>): Router<TRoutes> {
  return new Router(options);
}

export function defineRoutes<const TRoutes extends Record<string, { meta?: unknown; path: string }>>(
  routes: DefinedRouteTable<TRoutes>,
): DefinedRouteTable<TRoutes> {
  return routes;
}
