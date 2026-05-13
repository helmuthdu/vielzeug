import type { RouteBranchDef, RouteRecord } from './router-internal';
import type {
  BeforeLeaveBlocker,
  HistoryDriver,
  IsActiveOptions,
  Middleware,
  NavigateOptions,
  NamedNavigationTarget,
  NavigationStatus,
  NavigationTarget,
  PathParams,
  QueryParams,
  RawNavigationTarget,
  RouterErrorContext,
  RouteContext,
  RouteDefinition,
  RouteLocation,
  RouteMatch,
  RouteMatchBranch,
  RouteName,
  RouteParams,
  RoutePathByName,
  RouteState,
  RouteTable,
  RouterOptions,
  Unsubscribe,
} from './types';

import { runMiddleware } from './middleware';
import { buildUrl, compilePathMatcher, joinPaths, matchRoute, matchesPrefix, normalizePath, parseQuery } from './path';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  error?: unknown;
  location: RouteLocation;
  matches: RouteMatchBranch;
  status: NavigationStatus;
}): RouteState {
  const state: RouteState = {
    ...(input.error !== undefined ? { error: input.error } : {}),
    location: {
      hash: input.location.hash,
      historyState: input.location.historyState,
      pathname: input.location.pathname,
      query: input.location.query,
    },
    matches: [...input.matches],
    status: input.status,
  };

  return state;
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

function readLocation(base: string, history: HistoryDriver): RouteLocation {
  return {
    hash: history.location.hash.replace(/^#/, ''),
    historyState: history.location.state,
    pathname: stripBase(history.location.pathname || '/', base),
    query: parseQuery(history.location.search || ''),
  };
}

type CompiledRoutes = {
  records: readonly RouteRecord[];
  routesByName: ReadonlyMap<string, RouteRecord>;
};

function compileRoutes<TRoutes extends RouteTable>(options: RouterOptions<TRoutes>): CompiledRoutes {
  const globalMiddleware = [...(options.middleware ?? [])] as unknown as Middleware[];
  const records: RouteRecord[] = [];

  const compile = (
    name: string,
    route: RouteDefinition,
    ancestorPath: string,
    ancestorBranchDefs: RouteBranchDef[],
    ancestorMiddleware: RouteRecord['middleware'],
  ): void => {
    const ownPath = route.index
      ? ancestorPath
      : normalizePath(route.path ? joinPaths(ancestorPath, route.path) : ancestorPath);

    const branchDefs: RouteBranchDef[] = [
      ...ancestorBranchDefs,
      {
        dataFn: route.data,
        handler: route.handler,
        lazy: route.lazy,
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

    if (route.handler !== undefined || route.lazy !== undefined || route.redirect !== undefined || !route.children) {
      const leaf = branchDefs[branchDefs.length - 1]!;

      records.push({
        branchDefs,
        coerceSearch: route.coerceSearch,
        hasData: branchDefs.some((def) => def.dataFn != null),
        hasLazy: branchDefs.some((def) => def.lazy != null),
        leaf,
        matcher: compilePathMatcher(ownPath),
        middleware: [...globalMiddleware, ...ownMiddleware],
        path: ownPath,
        redirect: route.redirect,
      });
    }
  };

  for (const [name, route] of Object.entries(options.routes)) {
    compile(name, route, '/', [], []);
  }

  return {
    records,
    routesByName: new Map(records.map((r) => [r.leaf.name, r])),
  };
}

// ─── History drivers ──────────────────────────────────────────────────────────

/** Creates a history driver backed by the browser History API. */
export function createBrowserHistory(): HistoryDriver {
  return {
    get location() {
      return window.location as HistoryDriver['location'] & typeof window.location;
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

type MemoryLocation = { hash: string; pathname: string; search: string; state: unknown };

/** Creates an in-memory history driver. Suitable for SSR, tests, and non-browser environments. */
export function createMemoryHistory(initialPath = '/'): HistoryDriver {
  const parsed = new URL(initialPath, 'http://localhost');
  const stack: MemoryLocation[] = [
    { hash: parsed.hash, pathname: parsed.pathname, search: parsed.search, state: null },
  ];
  let cursor = 0;
  const listeners = new Set<() => void>();

  return {
    get location(): MemoryLocation {
      return stack[cursor]!;
    },
    push(url, state = null) {
      const p = new URL(url, 'http://localhost');

      stack.splice(cursor + 1);
      stack.push({ hash: p.hash, pathname: p.pathname, search: p.search, state });
      cursor = stack.length - 1;
      listeners.forEach((l) => l());
    },
    replace(url, state = null) {
      const p = new URL(url, 'http://localhost');

      stack[cursor] = { hash: p.hash, pathname: p.pathname, search: p.search, state };
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export class Router<TRoutes extends RouteTable = RouteTable> {
  readonly #base: string;
  readonly #history: HistoryDriver;
  readonly #records: readonly RouteRecord[];
  readonly #routesByName: ReadonlyMap<string, RouteRecord>;
  readonly #scroll?: RouterOptions['scroll'];
  readonly #useViewTransition: boolean;
  readonly #onError?: RouterOptions<TRoutes>['onError'];

  #abortController: AbortController | null = null;
  readonly #beforeLeaveBlockers = new Set<BeforeLeaveBlocker>();
  #currentState: RouteState;
  #disposed = false;
  #lastHref = '/';
  readonly #listeners = new Set<(state: RouteState) => void>();
  #navigationId = 0;
  readonly #preloadCache = new Map<string, Promise<void>>();
  readonly #unlistenHistory: () => void;

  constructor(options: RouterOptions<TRoutes>) {
    const compiled = compileRoutes(options);

    this.#base = normalizePath(options.base ?? '/');
    this.#history = options.history ?? createBrowserHistory();
    this.#useViewTransition = options.viewTransition ?? false;
    this.#scroll = options.scroll;
    this.#onError = options.onError;
    this.#records = compiled.records;
    this.#routesByName = compiled.routesByName;
    this.#currentState = createRouteState({
      location: { hash: '', historyState: null, pathname: '/', query: {} },
      matches: [],
      status: 'idle',
    });
    this.#unlistenHistory = this.#registerHistoryListener();

    const { hash, pathname, search } = this.#history.location;

    this.#lastHref = `${pathname}${search}${hash}`;
    this.#runInBackground(this.#handleRoute(), { source: 'initial-navigation' });
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
      const newHref = `${pathname}${search}${hash}`;

      if (newHref === this.#lastHref) return;

      this.#lastHref = newHref;
      this.#runInBackground(this.#handleRoute(), { source: 'history-listener' });
    });
  }

  #notifyListeners(): void {
    this.#listeners.forEach((listener) => listener(this.#currentState));
  }

  #reportError(error: unknown, context: RouterErrorContext): void {
    if (this.#onError) {
      this.#onError(error, context);

      return;
    }

    queueMicrotask(() => {
      throw error;
    });
  }

  #runInBackground(promise: Promise<void>, context: RouterErrorContext): void {
    void promise.catch((error) => {
      this.#reportError(error, context);
    });
  }

  #isNavigationCurrent(id: number): boolean {
    return id === this.#navigationId;
  }

  async #runDataLoaders(
    record: RouteRecord,
    context: Omit<RouteContext, 'data'>,
    signal: AbortSignal,
  ): Promise<unknown[]> {
    return Promise.all(record.branchDefs.map((def) => (def.dataFn ? def.dataFn({ ...context, signal }) : undefined)));
  }

  async #hydrateLazy(record: RouteRecord): Promise<void> {
    if (!record.hasLazy) return;

    record.hasLazy = false;

    for (const def of record.branchDefs) {
      if (!def.lazy) continue;

      const lazyFn = def.lazy;

      def.lazy = undefined;

      const mod = await lazyFn();

      if (mod.handler !== undefined) def.handler = mod.handler;

      if (mod.data !== undefined) def.dataFn = mod.data;

      if (mod.meta !== undefined) def.meta = mod.meta;
    }

    record.hasData = record.branchDefs.some((d) => d.dataFn != null);
  }

  async #prepareRoute(
    location: RouteLocation,
  ): Promise<
    | { branch: RouteMatchBranch; location: RouteLocation; params: RouteParams; record: RouteRecord; type: 'matched' }
    | { location: RouteLocation; params: RouteParams; type: 'unmatched' }
    | { location: RouteLocation; params: RouteParams; redirectTo: string; type: 'redirect' }
  > {
    const { params, record } = matchRoute(location.pathname, this.#records);

    if (!record) {
      return { location, params, type: 'unmatched' };
    }

    if (record.redirect) {
      return { location, params, redirectTo: resolveTarget(record.redirect, this.#routesByName), type: 'redirect' };
    }

    let query = location.query;

    if (record.coerceSearch) {
      try {
        query = record.coerceSearch(location.query);
      } catch {
        // Keep raw query when coercion fails.
      }
    }

    const preparedLocation = query === location.query ? location : { ...location, query };

    await this.#hydrateLazy(record);

    return {
      branch: buildMatchBranch(
        record.branchDefs,
        params,
        preparedLocation.pathname,
        record.branchDefs.map(() => undefined),
      ),
      location: preparedLocation,
      params,
      record,
      type: 'matched',
    };
  }

  async #handleRoute(useTransition?: boolean, redirectDepth = 0): Promise<void> {
    this.#abortController?.abort();

    const controller = new AbortController();

    this.#abortController = controller;

    const navigationId = ++this.#navigationId;
    const prevState = this.#currentState;
    const prepared = await this.#prepareRoute(readLocation(this.#base, this.#history));
    const isCurrent = (): boolean => this.#isNavigationCurrent(navigationId);

    if (!isCurrent()) return;

    if (prepared.type === 'redirect') {
      if (redirectDepth >= 10) throw new Error('[routeit] Redirect loop detected');

      await this.#navigateToPath(prepared.redirectTo, { replace: true }, redirectDepth + 1, true);

      return;
    }

    const location = prepared.location;
    const params = prepared.params;
    const record = prepared.type === 'matched' ? prepared.record : undefined;
    const initialBranch = prepared.type === 'matched' ? prepared.branch : [];

    this.#currentState = createRouteState({
      location,
      matches: initialBranch,
      status: record?.hasData ? 'loading' : 'idle',
    });

    if (record?.hasData) this.#notifyListeners();

    const run = async (): Promise<void> => {
      if (!record || !isCurrent()) return;

      const context: RouteContext = {
        hash: location.hash,
        historyState: location.historyState,
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
            dataResults = await this.#runDataLoaders(record, ctx, controller.signal);
          } catch (error) {
            status = 'error';
            this.#currentState = createRouteState({
              error,
              location,
              matches: buildMatchBranch(record.branchDefs, params, location.pathname, dataResults),
              status,
            });
            throw error;
          }
        }

        if (!isCurrent()) return;

        const finalBranch = buildMatchBranch(record.branchDefs, params, location.pathname, dataResults);

        this.#currentState = createRouteState({ location, matches: finalBranch, status });

        if (record.leaf.handler) {
          const leafData = dataResults[dataResults.length - 1];

          await record.leaf.handler({ ...ctx, data: leafData, matches: finalBranch });
        }
      };

      await runMiddleware(context, record.middleware, terminal);
    };

    type ViewTransitionDocument = Document & {
      startViewTransition?: (callback: () => void | Promise<void>) => { finished: Promise<void> };
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
      if (isCurrent()) {
        this.#notifyListeners();
        this.#applyScroll(this.#currentState, prevState);
      }
    }
  }

  #applyScroll(to: RouteState, from: RouteState | null): void {
    if (!this.#scroll || typeof window === 'undefined') return;

    const decision = this.#scroll(to, from);

    if (decision === 'preserve') return;

    if (decision === 'top') {
      window.scrollTo(0, 0);

      return;
    }

    window.scrollTo(decision.x, decision.y);
  }

  #resolveDestination(path: string): string {
    const parsed = new URL(path, 'http://localhost');
    const joinedPath = normalizePath(`${this.#base}/${parsed.pathname}`);

    return `${joinedPath}${parsed.search}${parsed.hash}`;
  }

  async #navigateToPath(
    path: string,
    options: NavigateOptions = {},
    redirectDepth = 0,
    internalNavigation = false,
  ): Promise<void> {
    this.#assertNotDisposed();

    const destination = this.#resolveDestination(path);

    if (!options.force && destination === this.#lastHref) return;

    // Check leave blockers before mutating history.
    if (!internalNavigation) {
      const blockers = [...this.#beforeLeaveBlockers];

      for (const blocker of blockers) {
        const allowed = await blocker();

        if (!allowed) return;
      }
    }

    this.#lastHref = destination;

    if (options.replace) {
      this.#history.replace(destination, options.state);
    } else {
      this.#history.push(destination, options.state);
    }

    await this.#handleRoute(options.viewTransition, redirectDepth);
  }

  /** Navigate using a named route target or a raw path target. */
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

  /** Returns true when the current location matches the named route by prefix (default) or exactly. */
  isActive<Name extends RouteName<TRoutes>>(name: Name, options: IsActiveOptions = {}): boolean {
    const route = getRouteByName(name, this.#routesByName);
    const pathname = stripBase(normalizePath(this.#history.location.pathname), this.#base);
    const exact = options.exact ?? false;

    return exact ? matchRoute(pathname, [route]).record != null : matchesPrefix(pathname, route);
  }

  /** Resolve a pathname to the matching route branch without running middleware or handlers. */
  resolve(pathname: string): RouteMatchBranch | null {
    const normalizedPathname = stripBase(normalizePath(pathname), this.#base);
    const { params, record } = matchRoute(normalizedPathname, this.#records);

    if (!record) return null;

    const branch = buildMatchBranch(
      record.branchDefs,
      params,
      normalizedPathname,
      record.branchDefs.map(() => undefined),
    );

    return branch.length ? branch : null;
  }

  /**
   * Eagerly execute the data loaders for a named route without navigating.
   * Useful for hover-prefetch. Results are discarded; calling navigate() afterward
   * will run the loaders again with a fresh AbortSignal.
   */
  async preload<Name extends RouteName<TRoutes>>(
    name: Name,
    params?: PathParams<RoutePathByName<TRoutes, Name>>,
  ): Promise<void> {
    const route = getRouteByName(name, this.#routesByName);
    const cacheKey = buildUrl(this.#base, route.path, params as RouteParams);

    if (this.#preloadCache.has(cacheKey)) return this.#preloadCache.get(cacheKey);

    const signal = new AbortController().signal;
    const work = (async (): Promise<void> => {
      let destination = cacheKey;

      for (let i = 0; i < 10; i += 1) {
        const parsed = new URL(destination, 'http://localhost');
        const location: RouteLocation = {
          hash: parsed.hash.replace(/^#/, ''),
          historyState: null,
          pathname: stripBase(parsed.pathname, this.#base),
          query: parseQuery(parsed.search),
        };
        const prepared = await this.#prepareRoute(location);

        if (prepared.type === 'redirect') {
          destination = this.#resolveDestination(prepared.redirectTo);
          continue;
        }

        if (prepared.type !== 'matched' || !prepared.record.hasData) return;

        await this.#runDataLoaders(
          prepared.record,
          {
            hash: prepared.location.hash,
            historyState: null,
            locals: {},
            matches: prepared.branch,
            navigate: () => Promise.resolve(),
            params: prepared.params,
            pathname: prepared.location.pathname,
            query: prepared.location.query,
          },
          signal,
        );

        return;
      }

      throw new Error('[routeit] preload redirect loop detected');
    })();
    const trackedWork = work.catch((error) => {
      this.#reportError(error, { source: 'preload' });
      throw error;
    });

    this.#preloadCache.set(cacheKey, trackedWork);

    const cleanup = trackedWork.finally(() => this.#preloadCache.delete(cacheKey));

    cleanup.catch(() => undefined);
    // Mark rejection as observed for fire-and-forget preload usage.
    trackedWork.catch(() => undefined);

    return trackedWork;
  }

  /**
   * Register a leave guard. Called before user-triggered navigation attempts.
   * Return `false` to cancel; `true` to allow. Multiple guards can be active.
   * Returns a function that removes the guard.
   */
  beforeLeave(blocker: BeforeLeaveBlocker): Unsubscribe {
    this.#assertNotDisposed();
    this.#beforeLeaveBlockers.add(blocker);

    return () => {
      this.#beforeLeaveBlockers.delete(blocker);
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
    this.#beforeLeaveBlockers.clear();
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
