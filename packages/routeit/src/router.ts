import type {
  NavigationStatus,
  HistoryDriver,
  Middleware,
  NavigateOptions,
  NamedNavigationTarget,
  NavigationTarget,
  PathParams,
  QueryParams,
  RawNavigationTarget,
  ResolvedRoute,
  RouteBranchDef,
  RouteContext,
  RouteDefinition,
  RouteLocation,
  RouteMatch,
  RouteMatchBranch,
  RouteName,
  RoutePathByName,
  RouteRecord,
  RouteParams,
  RouteState,
  RouteTable,
  RouterOptions,
  Unsubscribe,
  ViewTransitionDocument,
} from './types';

import { runMiddleware } from './middleware';
import { buildUrl, compilePathMatcher, joinPaths, matchRoute, matchesPrefix, normalizePath, parseQuery } from './path';

function getRouteByName(name: string, routesByName: ReadonlyMap<string, RouteRecord>): RouteRecord {
  const route = routesByName.get(name);

  if (route) return route;

  const available = [...routesByName.keys()].join(', ');

  throw new Error(
    available
      ? `[routeit] Unknown route name: ${name}. Available routes: ${available}`
      : `[routeit] Unknown route name: ${name}`,
  );
}

function createRouteState(input: {
  location: RouteLocation;
  matches: RouteMatchBranch;
  status: NavigationStatus;
}): RouteState {
  return {
    location: {
      hash: input.location.hash,
      pathname: input.location.pathname,
      query: input.location.query,
    },
    matches: [...input.matches],
    status: input.status,
  };
}

function buildMatchBranch(
  branchDefs: readonly RouteBranchDef[],
  params: RouteParams,
  pathname: string,
  dataResults: unknown[],
): RouteMatchBranch {
  return branchDefs.map(
    (def, i): RouteMatch => ({
      data: dataResults[i],
      meta: def.meta,
      name: def.name,
      params: { ...params },
      pathname,
    }),
  );
}

function resolveMatch(
  pathname: string,
  records: readonly RouteRecord[],
): {
  branch: RouteMatchBranch;
  params: RouteParams;
  record?: RouteRecord;
} {
  const { params, record } = matchRoute(pathname, records);

  if (!record) {
    return {
      branch: [],
      params,
    };
  }

  const branch = buildMatchBranch(
    record.branchDefs,
    params,
    pathname,
    record.branchDefs.map(() => undefined),
  );

  return {
    branch,
    params,
    record,
  };
}

function resolveTarget(target: NavigationTarget, routesByName: ReadonlyMap<string, RouteRecord>): string {
  if ('path' in target) return target.path;

  const route = getRouteByName(target.name, routesByName);
  const path = buildUrl('/', route.path, target.params, target.query);

  return target.hash ? `${path}#${target.hash}` : path;
}

function stripBase(pathname: string, base = '/'): string {
  const normalizedPath = normalizePath(pathname);
  const normalizedBase = normalizePath(base);

  if (normalizedBase === '/') return normalizedPath;
  if (normalizedPath === normalizedBase) return '/';

  const prefix = `${normalizedBase}/`;

  return normalizedPath.startsWith(prefix)
    ? normalizePath(normalizedPath.slice(normalizedBase.length))
    : normalizedPath;
}

function readLocation(
  base: string,
  history: HistoryDriver,
): {
  hash: string;
  pathname: string;
  query: QueryParams;
} {
  return {
    hash: history.location.hash.replace(/^#/, ''),
    pathname: stripBase(history.location.pathname || '/', base),
    query: parseQuery(history.location.search || ''),
  };
}

type CompiledRoutes = {
  records: readonly RouteRecord[];
  routesByName: ReadonlyMap<string, RouteRecord>;
};

function compileRoutes<TRoutes extends RouteTable>(options: RouterOptions<TRoutes>): CompiledRoutes {
  const globalMiddleware = [...(options.middleware ?? [])];
  const records: RouteRecord[] = [];

  const compile = (
    name: string,
    route: RouteDefinition,
    ancestorPath: string,
    ancestorBranchDefs: RouteBranchDef[],
    ancestorMiddleware: Middleware[],
  ): void => {
    const ownPath = route.index ? ancestorPath : normalizePath(route.path ? joinPaths(ancestorPath, route.path) : ancestorPath);
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
      const leaf = branchDefs[branchDefs.length - 1]!;

      records.push({
        branchDefs,
        hasData: branchDefs.some((def) => def.dataFn != null),
        leaf,
        middleware: [...globalMiddleware, ...ownMiddleware],
        matcher: compilePathMatcher(ownPath),
        path: ownPath,
      });
    }
  };

  for (const [name, route] of Object.entries(options.routes)) {
    compile(name, route, '/', [], []);
  }

  return {
    records,
    routesByName: new Map(records.map((record) => [record.leaf.name, record])),
  };
}

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
    const compiled = compileRoutes(options);

    this.#base = normalizePath(options.base ?? '/');
    this.#history = options.history ?? createBrowserHistory();
    this.#useViewTransition = options.viewTransition ?? false;
    this.#records = compiled.records;
    this.#routesByName = compiled.routesByName;
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

    const location = readLocation(this.#base, this.#history);
    const { branch: initialBranch, params, record } = resolveMatch(location.pathname, this.#records);
    const isCurrent = (): boolean => this.#isNavigationCurrent(navigationId);

    if (!isCurrent()) return;

    this.#currentState = createRouteState({
      location,
      matches: initialBranch,
      status: record?.hasData ? 'loading' : 'idle',
    });

    const run = async (): Promise<void> => {
      if (!record || !isCurrent()) return;

      const context: RouteContext = {
        hash: location.hash,
        locals: {},
        matches: initialBranch,
        navigate: (target, options) =>
          this.navigate(target as NamedNavigationTarget<TRoutes> | RawNavigationTarget, options),
        params,
        pathname: location.pathname,
        query: location.query,
      };

      const terminal = async (ctx: RouteContext): Promise<void> => {
        if (!isCurrent()) return;

        let dataResults: unknown[] = record.branchDefs.map(() => undefined);
        let status: NavigationStatus = 'idle';

        if (record.hasData) {
          try {
            dataResults = await Promise.all(
              record.branchDefs.map((def) => (def.dataFn ? def.dataFn({ ...ctx, signal: controller.signal }) : undefined)),
            );
          } catch (error) {
            status = 'error';
            this.#currentState = createRouteState({
              location,
              matches: buildMatchBranch(record.branchDefs, params, location.pathname, dataResults),
              status,
            });
            throw error;
          }
        }

        if (!isCurrent()) return;

        const finalBranch = buildMatchBranch(record.branchDefs, params, location.pathname, dataResults);

        this.#currentState = createRouteState({
          location,
          matches: finalBranch,
          status,
        });

        if (record.leaf.handler) {
          const leafData = dataResults[dataResults.length - 1];

          await record.leaf.handler({ ...ctx, data: leafData, matches: finalBranch });
        }
      };

      await runMiddleware(context, record.middleware, terminal);
    };

    const documentWithTransition = document as ViewTransitionDocument;
    const shouldUseTransition = useTransition ?? this.#useViewTransition;

    try {
      if (shouldUseTransition && documentWithTransition.startViewTransition) {
        await documentWithTransition.startViewTransition(run).finished;
      } else {
        await run();
      }
    } finally {
      if (isCurrent()) this.#notifyListeners();
    }
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
