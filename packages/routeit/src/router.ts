import type {
  HistoryDriver,
  Middleware,
  NavigateOptions,
  NamedNavigationTarget,
  PathParams,
  QueryParams,
  RawNavigationTarget,
  ResolvedRoute,
  RouteBranchDef,
  RouteDefinition,
  RouteName,
  RoutePathByName,
  RouteRecord,
  RouteState,
  RouteTable,
  RouterOptions,
  Unsubscribe,
} from './types';

import {
  createRouteState,
  getRouteByName,
  handleRoute,
  readLocation,
  resolveMatch,
  resolveTarget,
  stripBase,
} from './navigation';
import { buildUrl, compileRouteSegments, joinPaths, matchRoute, matchesPrefix, normalizePath } from './path';

/** Creates a history driver backed by the browser History API. */
export function createBrowserHistory(): HistoryDriver {
  return {
    get location() {
      return window.location;
    },
    push(url, state) {
      window.history.pushState(state, '', url);
    },
    replace(url, state) {
      window.history.replaceState(state, '', url);
    },
    subscribe(listener) {
      window.addEventListener('popstate', listener);

      return () => window.removeEventListener('popstate', listener);
    },
  };
}

export class Router<TRoutes extends RouteTable = RouteTable> {
  readonly #base: string;
  readonly #history: HistoryDriver;
  readonly #records: readonly RouteRecord[];
  readonly #routesByName: ReadonlyMap<string, RouteRecord>;
  readonly #useViewTransition: boolean;

  #abortController: AbortController | null = null;
  #currentState: RouteState;
  #disposed = false;
  #lastHref = '/';
  readonly #listeners = new Set<(state: RouteState) => void>();
  #navigationId = 0;
  readonly #unlistenHistory: () => void;

  constructor(options: RouterOptions<TRoutes>) {
    this.#base = normalizePath(options.base ?? '/');
    this.#history = options.history ?? createBrowserHistory();
    this.#useViewTransition = options.viewTransition ?? false;
    this.#records = this.#compileRecords(options);
    this.#routesByName = new Map(
      this.#records.map((record) => [record.branchDefs[record.branchDefs.length - 1]!.name, record]),
    );
    this.#currentState = createRouteState({
      location: {
        hash: '',
        pathname: '/',
        query: {},
      },
      matches: [],
      status: 'idle',
    });
    this.#unlistenHistory = this.#registerHistoryListener();

    const { hash, pathname, search } = this.#history.location;

    this.#lastHref = `${pathname}${search}${hash}`;
    this.#runInBackground(this.#handleRoute());
  }

  get state(): RouteState {
    return this.#currentState;
  }

  #compileRecords(options: RouterOptions<TRoutes>): readonly RouteRecord[] {
    const globalMiddleware = [...(options.middleware ?? [])];
    const records: RouteRecord[] = [];

    const compile = (
      name: string,
      route: RouteDefinition,
      ancestorPath: string,
      ancestorBranchDefs: RouteBranchDef[],
      ancestorMiddleware: Middleware[],
    ): void => {
      const ownPath = route.index
        ? ancestorPath
        : normalizePath(route.path ? joinPaths(ancestorPath, route.path) : ancestorPath);

      const branchDefs: RouteBranchDef[] = [
        ...ancestorBranchDefs,
        {
          dataFn: route.data,
          handler: route.handler,
          meta: route.meta,
          name,
        },
      ];

      const ownMiddleware = [...ancestorMiddleware, ...(route.middleware ?? [])];

      if (route.children) {
        for (const [childName, childRoute] of Object.entries(route.children)) {
          compile(`${name}.${childName}`, childRoute, ownPath, branchDefs, ownMiddleware);
        }
      }

      // Compile as a leaf record when it has a handler, or when it has no children
      // (simple routes and wildcard fallbacks always need a record).
      if (route.handler !== undefined || !route.children) {
        records.push({
          branchDefs,
          middleware: [...globalMiddleware, ...ownMiddleware],
          path: ownPath,
          segments: compileRouteSegments(ownPath),
        });
      }
    };

    for (const [name, route] of Object.entries(options.routes)) {
      compile(name, route, '/', [], []);
    }

    return records;
  }

  #assertNotDisposed(): void {
    if (this.#disposed) throw new Error('[routeit] Router is disposed');
  }

  #registerHistoryListener(): () => void {
    return this.#history.subscribe(() => {
      const { hash, pathname, search } = this.#history.location;

      this.#lastHref = `${pathname}${search}${hash}`;
      this.#runInBackground(this.#handleRoute());
    });
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
    this.#abortController?.abort();

    const controller = new AbortController();

    this.#abortController = controller;

    const navigationId = ++this.#navigationId;

    await handleRoute({
      base: this.#base,
      history: this.#history,
      isNavigationCurrent: () => this.#isNavigationCurrent(navigationId),
      navigate: (target, options) =>
        this.navigate(target as NamedNavigationTarget<TRoutes> | RawNavigationTarget, options),
      notifyListeners: () => this.#notifyListeners(),
      records: this.#records,
      setCurrentState: (state) => {
        this.#currentState = state;
      },
      signal: controller.signal,
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

  async #navigateToPath(path: string, options: NavigateOptions = {}): Promise<void> {
    this.#assertNotDisposed();

    const destination = this.#resolveDestination(path);

    if (!options.force && destination === this.#lastHref) return;

    this.#lastHref = destination;

    if (options.replace) {
      this.#history.replace(destination, options.state);
    } else {
      this.#history.push(destination, options.state);
    }

    await this.#handleRoute(options.viewTransition);
  }

  /** Navigate using a named route target. */
  navigate(target: NamedNavigationTarget<TRoutes> | RawNavigationTarget, options?: NavigateOptions): Promise<void> {
    const destination = resolveTarget(target, this.#routesByName);

    return this.#navigateToPath(destination, options);
  }

  /** Build a URL for a named route, including optional params and query string. */
  url<Name extends RouteName<TRoutes>>(
    name: Name,
    params?: PathParams<RoutePathByName<TRoutes, Name>>,
    query?: QueryParams,
  ): string {
    const route = getRouteByName(name, this.#routesByName);

    return buildUrl(this.#base, route.path, params, query);
  }

  /** Returns true when the current location matches the named route exactly or as a prefix. */
  isActive<Name extends RouteName<TRoutes>>(name: Name, exact = true): boolean {
    const route = getRouteByName(name, this.#routesByName);
    const { pathname } = readLocation(this.#base, this.#history);

    return exact ? matchRoute(pathname, [route]).record != null : matchesPrefix(pathname, route);
  }

  /** Resolve a pathname to the matching route branch without running middleware or handlers. */
  resolve(pathname: string): ResolvedRoute | null {
    const normalizedPathname = stripBase(normalizePath(pathname), this.#base);
    const { branch } = resolveMatch(normalizedPathname, this.#records);

    return branch.length ? branch : null;
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
    this.#listeners.clear();
    this.#abortController?.abort();
    this.#abortController = null;
    this.#unlistenHistory();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

export function createRouter<const TRoutes extends RouteTable>(options: RouterOptions<TRoutes>): Router<TRoutes> {
  return new Router(options);
}
