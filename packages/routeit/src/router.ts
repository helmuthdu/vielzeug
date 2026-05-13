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
  DataFn,
  RouterErrorContext,
  RouteContext,
  RouteDefinition,
  RouteHandler,
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

import {
  buildUrl,
  compilePathMatcher,
  joinPaths,
  matchRouteFor,
  matchesPrefix,
  normalizePath,
  parseQuery,
} from './path';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRouteByName<TRoutes extends RouteTable>(
  name: string,
  routesByName: ReadonlyMap<string, RouteRecord<TRoutes>>,
): RouteRecord<TRoutes> {
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

function resolveTarget<TRoutes extends RouteTable>(
  target: NavigationTarget,
  routesByName: ReadonlyMap<string, RouteRecord<TRoutes>>,
): string {
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

async function executeMiddlewarePipeline<TRoutes extends RouteTable>(
  context: RouteContext<RouteParams, TRoutes>,
  middleware: readonly Middleware<TRoutes>[],
  terminal: () => Promise<void>,
): Promise<void> {
  async function dispatch(index: number): Promise<void> {
    if (index < middleware.length) {
      let called = false;

      await middleware[index]!(context, async () => {
        if (called) throw new Error('[routeit] next() called multiple times');

        called = true;
        await dispatch(index + 1);
      });

      return;
    }

    await terminal();
  }

  await dispatch(0);
}

function readLocation(base: string, history: HistoryDriver): RouteLocation {
  return {
    hash: history.location.hash.replace(/^#/, ''),
    historyState: history.location.state,
    pathname: stripBase(history.location.pathname || '/', base),
    query: parseQuery(history.location.search || ''),
  };
}

type PreparedRoute<TRoutes extends RouteTable = RouteTable> =
  | {
      branch: RouteMatchBranch;
      location: RouteLocation;
      params: RouteParams;
      record: RouteRecord<TRoutes>;
      type: 'matched';
    }
  | { location: RouteLocation; params: RouteParams; type: 'unmatched' }
  | { location: RouteLocation; params: RouteParams; redirectTo: string; type: 'redirect' };

type CompiledRoutes<TRoutes extends RouteTable = RouteTable> = {
  records: readonly RouteRecord<TRoutes>[];
  routesByName: ReadonlyMap<string, RouteRecord<TRoutes>>;
};

function compileRoutes<TRoutes extends RouteTable>(options: RouterOptions<TRoutes>): CompiledRoutes<TRoutes> {
  const globalMiddleware: Middleware<TRoutes>[] = [...(options.middleware ?? [])];
  const records: RouteRecord<TRoutes>[] = [];

  const compile = (
    name: string,
    route: RouteDefinition,
    ancestorPath: string,
    ancestorBranchDefs: RouteBranchDef[],
    ancestorMiddleware: RouteRecord<TRoutes>['middleware'],
  ): void => {
    if (route.index && route.path !== undefined) {
      throw new Error(`[routeit] Route "${name}" cannot define both index and path`);
    }

    if (!route.index && route.path === undefined) {
      throw new Error(`[routeit] Route "${name}" must define path or set index: true`);
    }

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
    const ownMiddleware: Middleware<TRoutes>[] = [
      ...ancestorMiddleware,
      ...((route.middleware ?? []) as unknown as Middleware<TRoutes>[]),
    ];

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

  const namesSeen = new Set<string>();

  for (const record of records) {
    if (namesSeen.has(record.leaf.name)) {
      throw new Error(
        `[routeit] Duplicate route name: "${record.leaf.name}". A top-level route key must not coincide with a nested route's dot-notation name.`,
      );
    }

    namesSeen.add(record.leaf.name);
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
      return {
        hash: window.location.hash,
        pathname: window.location.pathname,
        search: window.location.search,
        // State lives on window.history.state, not window.location.
        state: window.history.state,
      };
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
  readonly #records: readonly RouteRecord<TRoutes>[];
  readonly #routesByName: ReadonlyMap<string, RouteRecord<TRoutes>>;
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
      const previousHref = this.#lastHref;

      if (newHref === previousHref) return;

      this.#runInBackground(this.#handleHistoryNavigation(newHref, previousHref), { source: 'history-listener' });
    });
  }

  async #handleHistoryNavigation(newHref: string, previousHref: string): Promise<void> {
    const allowed = await this.#runBeforeLeaveBlockers();

    if (!allowed) {
      this.#history.replace(previousHref, this.#currentState.location.historyState);

      return;
    }

    this.#lastHref = newHref;
    await this.#handleRoute();
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

  async #runBeforeLeaveBlockers(): Promise<boolean> {
    const blockers = [...this.#beforeLeaveBlockers];

    for (const blocker of blockers) {
      const allowed = await blocker();

      if (!allowed) return false;
    }

    return true;
  }

  async #runDataLoaders(
    record: RouteRecord<TRoutes>,
    context: Omit<RouteContext<RouteParams, TRoutes>, 'data'>,
    signal: AbortSignal,
  ): Promise<unknown[]> {
    return Promise.all(
      record.branchDefs.map((def) => {
        if (!def.dataFn) return undefined;

        const dataFn = def.dataFn as unknown as DataFn<RouteParams, TRoutes>;

        return dataFn({ ...context, signal });
      }),
    );
  }

  async #hydrateLazy(record: RouteRecord<TRoutes>): Promise<void> {
    if (record.hydrationWork) {
      await record.hydrationWork;

      return;
    }

    if (!record.hasLazy) return;

    const work = (async (): Promise<void> => {
      // Collect all lazy modules before mutating the record so that a failed
      // import leaves the record intact and the next navigation can retry.
      type LazyMod = Awaited<ReturnType<NonNullable<RouteBranchDef['lazy']>>>;
      const resolved: Array<{ def: RouteBranchDef; mod: LazyMod }> = [];

      for (const def of record.branchDefs) {
        if (!def.lazy) continue;

        resolved.push({ def, mod: await def.lazy() });
      }

      // All imports succeeded — commit mutations.
      for (const { def, mod } of resolved) {
        def.lazy = undefined;

        if (mod.handler !== undefined) def.handler = mod.handler;

        if (mod.data !== undefined) def.dataFn = mod.data;

        if (mod.meta !== undefined) def.meta = mod.meta;
      }

      record.hasLazy = false;
      record.hasData = record.branchDefs.some((d) => d.dataFn != null);
    })();

    record.hydrationWork = work;

    try {
      await work;
    } finally {
      record.hydrationWork = undefined;
    }
  }

  async #prepareRoute(location: RouteLocation): Promise<PreparedRoute<TRoutes>> {
    const { params, record } = matchRouteFor(location.pathname, this.#records);

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

  #createRouteContext(
    location: RouteLocation,
    params: RouteParams,
    matches: RouteMatchBranch,
  ): RouteContext<RouteParams, TRoutes> {
    return {
      hash: location.hash,
      historyState: location.historyState,
      locals: {},
      matches,
      navigate: (target, options) => this.navigate(target, options),
      params,
      pathname: location.pathname,
      query: location.query,
    };
  }

  async #runTerminal(
    record: RouteRecord<TRoutes>,
    context: RouteContext<RouteParams, TRoutes>,
    location: RouteLocation,
    params: RouteParams,
    initialBranch: RouteMatchBranch,
    signal: AbortSignal,
    isCurrent: () => boolean,
  ): Promise<void> {
    if (!isCurrent()) return;

    let dataResults: unknown[] = record.branchDefs.map(() => undefined);
    let status: NavigationStatus = 'idle';

    if (record.hasData) {
      this.#currentState = createRouteState({
        location,
        matches: initialBranch,
        status: 'loading',
      });
      this.#notifyListeners();

      try {
        dataResults = await this.#runDataLoaders(record, context, signal);
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
      const handler = record.leaf.handler as unknown as RouteHandler<RouteParams, TRoutes>;

      await handler({ ...context, data: leafData, matches: finalBranch });
    }
  }

  async #runWithTransition(run: () => Promise<void>, useTransition?: boolean): Promise<void> {
    type ViewTransitionDocument = Document & {
      startViewTransition?: (callback: () => void | Promise<void>) => { finished: Promise<void> };
    };

    const documentWithTransition = document as ViewTransitionDocument;
    const shouldUseTransition = useTransition ?? this.#useViewTransition;

    if (shouldUseTransition && documentWithTransition.startViewTransition) {
      await documentWithTransition.startViewTransition(run).finished;

      return;
    }

    await run();
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
      if (redirectDepth >= 5) throw new Error('[routeit] Redirect loop detected');

      await this.#navigateToPath(prepared.redirectTo, { replace: true }, redirectDepth + 1, true);

      return;
    }

    const location = prepared.location;
    const params = prepared.params;
    const record = prepared.type === 'matched' ? prepared.record : undefined;
    const initialBranch = prepared.type === 'matched' ? prepared.branch : [];

    if (!record) {
      this.#currentState = createRouteState({
        location,
        matches: [],
        status: 'idle',
      });
      this.#notifyListeners();
      this.#applyScroll(this.#currentState, prevState);

      return;
    }

    let committed = false;

    const run = async (): Promise<void> => {
      if (!isCurrent()) return;

      const context = this.#createRouteContext(location, params, initialBranch);

      await executeMiddlewarePipeline(context, record.middleware, async () => {
        committed = true;
        await this.#runTerminal(record, context, location, params, initialBranch, controller.signal, isCurrent);
      });
    };

    try {
      await this.#runWithTransition(run, useTransition);
    } finally {
      if (isCurrent() && committed) {
        this.#notifyListeners();
        this.#applyScroll(this.#currentState, prevState);
      }
    }
  }

  #applyScroll(to: RouteState, from: RouteState): void {
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
    const normalizedPath = stripBase(parsed.pathname, this.#base);
    const joinedPath = joinPaths(this.#base, normalizedPath);

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

    const prevLastHref = this.#lastHref;

    // Check leave blockers before mutating history.
    if (!internalNavigation) {
      const allowed = await this.#runBeforeLeaveBlockers();

      if (!allowed) return;
    }

    this.#lastHref = destination;

    if (options.replace) {
      this.#history.replace(destination, options.state);
    } else {
      this.#history.push(destination, options.state);
    }

    try {
      await this.#handleRoute(options.viewTransition, redirectDepth);
    } catch (err) {
      // Restore lastHref so the caller can retry the same destination after a
      // transient failure (e.g. failed lazy import or throwing data loader).
      this.#lastHref = prevLastHref;
      throw err;
    }
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

    return exact ? matchRouteFor(pathname, [route]).record != null : matchesPrefix(pathname, route);
  }

  /** Resolve a pathname to the matching route branch without running middleware or handlers. */
  resolve(pathname: string): RouteMatchBranch | null {
    const normalizedPathname = stripBase(normalizePath(pathname), this.#base);
    const { params, record } = matchRouteFor(normalizedPathname, this.#records);

    if (!record || record.redirect) return null;

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

      for (let i = 0; i < 5; i += 1) {
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

    // Keep fire-and-forget preload calls from triggering unhandled rejection warnings.
    const cleanup = trackedWork.finally(() => this.#preloadCache.delete(cacheKey));

    cleanup.catch(() => undefined);
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
    // Invalidate any in-flight navigation so isCurrent() checks return false,
    // preventing post-dispose state mutations, scroll callbacks, and listener calls.
    this.#navigationId++;
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
