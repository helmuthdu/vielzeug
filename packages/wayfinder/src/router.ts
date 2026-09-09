import { createNavigationCoordinator, type NavigationAttempt } from './_navigation';
import { compileRoutes } from './compile';
import {
  buildMatchBranch,
  createRouteContext,
  createRouteState,
  executeMiddlewarePipeline,
  reportError,
} from './context';
import { WayfinderDisposedError, WayfinderRedirectLoopError, WayfinderRouteError } from './errors';
import { type RegisteredBlocker, runLeaveBlockers } from './guards';
import { createBrowserHistory } from './history';
import {
  buildUrl,
  joinPaths,
  matchesPrefix,
  matchRouteFor,
  normalizePath,
  parseQuery,
  readLocation,
  stripBase,
} from './path';
import type {
  BeforeLeaveBlocker,
  BeforeLeaveOptions,
  CoerceSearchFn,
  DataContext,
  DataFn,
  HistoryDriver,
  IsActiveOptions,
  Middleware,
  NamedNavigationTarget,
  NavigateOptions,
  NavigationDestination,
  PathParams,
  RawNavigationTarget,
  ResolvedQueryParams,
  RouteBranchDef,
  RouteContext,
  RouteLocation,
  RouteMatchBranch,
  RouteName,
  RouteParams,
  RoutePathByName,
  RouteRecord,
  RouterErrorContext,
  RouterOptions,
  RouteState,
  RouteTable,
  RouteViewMap,
  RouteViewName,
  RouteViewRegistry,
  Unsubscribe,
} from './types';

// ─── Module-level helpers ────────────────────────────────────────────────────

function getRouteByName(name: string, routesByName: ReadonlyMap<string, RouteRecord>): RouteRecord {
  const route = routesByName.get(name);

  if (route) return route;

  const available = [...routesByName.keys()].join(', ');

  throw new WayfinderRouteError(
    available ? `Unknown route name: ${name}. Available routes: ${available}` : `Unknown route name: ${name}`,
  );
}

function resolveTarget(
  target: { path: string } | { hash?: string; name: string; params?: RouteParams; query?: ResolvedQueryParams },
  routesByName: ReadonlyMap<string, RouteRecord>,
  base = '/',
): string {
  if ('path' in target) return target.path;

  const route = getRouteByName(target.name, routesByName);
  const path = buildUrl(base, route.path, target.params, target.query);

  return target.hash ? `${path}#${target.hash}` : path;
}

// ─── Internal error carrier ──────────────────────────────────────────────────
//
// Carries error context alongside the original error without mutating the thrown
// object. The carrier is unwrapped before reaching external callers so error
// identity and `cause` chains are preserved.

const ROUTER_ERROR = Symbol('wayfinder.routerError');

type RouterErrorCarrier = {
  [ROUTER_ERROR]: true;
  readonly error: unknown;
  readonly context: RouterErrorContext;
};

function carryError(error: unknown, context: RouterErrorContext): RouterErrorCarrier {
  return { [ROUTER_ERROR]: true, context, error };
}

function isRouterErrorCarrier(value: unknown): value is RouterErrorCarrier {
  return value !== null && typeof value === 'object' && ROUTER_ERROR in (value as Record<symbol, unknown>);
}

function unwrapCarrier(value: unknown): never {
  if (isRouterErrorCarrier(value)) throw value.error;

  throw value;
}

// ─── Internal types ───────────────────────────────────────────────────────────

type NavigationDecision =
  | {
      branch: RouteMatchBranch;
      location: RouteLocation;
      params: RouteParams;
      record: RouteRecord;
      resolvedQuery: ResolvedQueryParams;
      type: 'matched';
    }
  | { location: RouteLocation; params: RouteParams; type: 'unmatched' }
  | { location: RouteLocation; params: RouteParams; redirectTo: string; type: 'redirect' };

// ─── Router class ─────────────────────────────────────────────────────────────

class Router<TRoutes extends RouteTable> {
  readonly #base: string;
  readonly #globalMiddleware: readonly Middleware[];
  readonly #globalCoerceSearch?: CoerceSearchFn;
  readonly #history: HistoryDriver;
  readonly #records: readonly RouteRecord[];
  readonly #routesByName: ReadonlyMap<string, RouteRecord>;
  readonly #onError?: RouterOptions<TRoutes>['onError'];
  readonly #scroll?: RouterOptions<TRoutes>['scroll'];
  readonly #useViewTransition: boolean;

  // Mutable navigation state
  readonly #beforeLeaveBlockers = new Set<RegisteredBlocker>();
  readonly #navigation = createNavigationCoordinator();
  #currentState: RouteState;
  #disposed = false;
  readonly #disposeController = new AbortController();
  #lastHref = '/';
  readonly #listeners = new Set<(state: RouteState) => void>();
  readonly #preloaded = new Map<string, unknown[]>();
  readonly #preloads = new Map<string, Promise<RouteState | null>>();
  // Compiled notFound fallback record
  readonly #notFoundRecord: RouteRecord | null;

  readonly #unlistenHistory: () => void;

  /** Resolves when the constructor-triggered navigation has settled; rejects if it fails. */
  readonly ready: Promise<void>;

  constructor(options: RouterOptions<TRoutes>) {
    const compiled = compileRoutes(options);

    this.#base = normalizePath(options.base ?? '/');
    this.#globalMiddleware = (options.middleware ?? []) as unknown as Middleware[];
    this.#globalCoerceSearch = options.coerceSearch;
    this.#history = options.history ?? createBrowserHistory();
    this.#onError = options.onError;
    this.#scroll = options.scroll;
    this.#useViewTransition = options.viewTransition ?? false;
    this.#records = compiled.records as unknown as readonly RouteRecord[];
    this.#routesByName = compiled.routesByName as unknown as ReadonlyMap<string, RouteRecord>;
    this.#currentState = createRouteState({
      location: { hash: '', historyState: null, pathname: '/', query: {} },
      matches: [] as RouteMatchBranch,
      status: 'idle',
    });

    // Build a synthetic RouteRecord for the notFound fallback.
    if (options.notFound) {
      const nf = options.notFound;
      const leafDef: RouteBranchDef = {
        dataFn: nf.data,
        name: '__notFound__',
      };

      this.#notFoundRecord = {
        branchDefs: [leafDef],
        leaf: leafDef,
        matcher: { paramNames: [], pattern: /(?:)/, prefixPattern: /(?:)/ },
        ownMiddleware: (nf.middleware ?? []) as unknown as Middleware[],
        path: '/*',
      };
    } else {
      this.#notFoundRecord = null;
    }

    this.#unlistenHistory = this.#registerHistoryListener();

    const { hash, pathname, search } = this.#history.location;

    this.#lastHref = `${pathname}${search}${hash}`;

    const attempt = this.#navigation.begin();

    const navigationPromise = this.#handleRoute(
      attempt,
      readLocation(this.#base, this.#history),
      (location, replace) => {
        if (!attempt.isCurrent()) return;

        const href = this.#hrefForLocation(location);

        if (replace) this.#history.replace(href, location.historyState);

        this.#lastHref = href;
      },
      undefined,
      0,
      false,
    ).then(() => undefined);

    // ready rejects with the original error (carrier unwrapped) for external consumers.
    this.ready = navigationPromise.catch(unwrapCarrier);
    // Attach a silent handler so an unawaited ready promise doesn't trigger
    // an unhandled-rejection warning. External consumers can still await ready
    // and receive the rejection — each .catch() subscriber fires independently.
    this.ready.catch(() => {});
    // #runInBackground receives the raw promise so it can extract carrier context for onError.
    this.#runInBackground(navigationPromise, { source: 'initial-navigation' });

    // Router actions are intentionally bound once so they remain safe when destructured.
    this.beforeLeave = this.beforeLeave.bind(this);
    this.createViewRegistry = this.createViewRegistry.bind(this);
    this.dispose = this.dispose.bind(this);
    this.getSnapshot = this.getSnapshot.bind(this);
    this.isActive = this.isActive.bind(this);
    this.load = this.load.bind(this);
    this.match = this.match.bind(this);
    this.navigate = this.navigate.bind(this);
    this.preload = this.preload.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.url = this.url.bind(this);
    this.waitFor = this.waitFor.bind(this);
  }

  // ─── Public state ─────────────────────────────────────────────────────────

  /**
   * Returns the current immutable router state snapshot.
   *
   * Compatible with React's `useSyncExternalStore`:
   * ```ts
   * const state = useSyncExternalStore(
   *   (cb) => router.subscribe(cb),
   *   () => router.getSnapshot()
   * );
   * ```
   */
  getSnapshot(): RouteState {
    return this.#currentState;
  }

  createViewRegistry<const TViews extends RouteViewMap<TRoutes>, TNotFound = never>(
    views: TViews & Record<Exclude<keyof TViews, RouteViewName<TRoutes>>, never>,
    options?: { notFound?: TNotFound },
  ): RouteViewRegistry<TViews[keyof TViews] | TNotFound> {
    return {
      resolve: (state) => {
        const name = state.matches.at(-1)?.name;

        if (name === '__notFound__') return options?.notFound;

        return name ? (views[name as keyof TViews] as TViews[keyof TViews]) : undefined;
      },
    };
  }

  // ─── Subscription ─────────────────────────────────────────────────────────

  /**
   * Subscribe to state changes. The listener is called on each subsequent state change;
   * use `getSnapshot()` to read the current value immediately.
   */
  subscribe(listener: (state: RouteState) => void): Unsubscribe {
    this.#assertNotDisposed();
    this.#listeners.add(listener);

    return () => {
      this.#listeners.delete(listener);
    };
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  /**
   * Navigate using a named route target or a raw path target.
   *
   * If a data loader throws after terminal execution begins, history has already committed
   * the destination and the returned Promise rejects with the loader error.
   */
  navigate(
    target: NamedNavigationTarget<TRoutes> | RawNavigationTarget | string,
    options?: NavigateOptions,
  ): Promise<void> {
    const normalized = typeof target === 'string' ? { path: target } : target;
    const destination = resolveTarget(normalized, this.#routesByName);

    return this.#navigateToPath(destination, options);
  }

  // ─── URL helpers ──────────────────────────────────────────────────────────

  /** Build a URL for a named route, including optional params and query string. */
  url<Name extends RouteName<TRoutes>>(
    name: Name,
    params?: PathParams<RoutePathByName<TRoutes, Name>>,
    query?: ResolvedQueryParams,
  ): string {
    const route = getRouteByName(name, this.#routesByName);

    return buildUrl(this.#base, route.path, params, query);
  }

  /** Returns true when the current location matches the named route by prefix (default) or exactly. */
  isActive<Name extends RouteName<TRoutes>>(name: Name, options: IsActiveOptions = {}): boolean {
    const route = getRouteByName(name, this.#routesByName);
    const pathname = this.#currentState.location.pathname;
    const exact = options.exact ?? false;

    return exact ? matchRouteFor(pathname, [route]).record != null : matchesPrefix(pathname, route);
  }

  /** Match a pathname to a route branch without running middleware or data loaders. Returns null for redirects or no match. */
  match(pathname: string): RouteMatchBranch | null {
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
   * Load a URL into a route state including data loader results, without modifying
   * router state or history. Follows declarative redirects but does not cache results.
   * Middleware is not executed — use `navigate()` when middleware side effects are needed.
   */
  async load(url: string, options?: { signal?: AbortSignal }): Promise<RouteState | null> {
    const prepared = await this.#resolveUrl(url);

    if (prepared.type !== 'matched') return null;

    const { location, params, record, resolvedQuery } = prepared;
    const defs = record.branchDefs;
    const hasData = defs.some((d) => d.dataFn != null);
    let dataResults: unknown[] = defs.map(() => undefined);
    let error: unknown;
    let status: 'error' | 'idle' = 'idle';

    if (hasData) {
      const effectiveSignal = options?.signal ?? new AbortController().signal;
      const branch = buildMatchBranch(defs, params, location.pathname, dataResults);
      const context = createRouteContext<TRoutes>(location, resolvedQuery, params, branch, () => Promise.resolve());

      try {
        dataResults = await this.#loadData(defs, context, effectiveSignal);
      } catch (e) {
        error = e;
        status = 'error';
      }
    }

    return createRouteState({
      error,
      location,
      matches: buildMatchBranch(defs, params, location.pathname, dataResults),
      status,
    });
  }

  async preload(target: NamedNavigationTarget<TRoutes>): Promise<RouteState | null> {
    this.#assertNotDisposed();

    const destination = this.#resolveDestination(resolveTarget(target, this.#routesByName, this.#base));
    const existing = this.#preloads.get(destination);

    if (existing) return existing;

    const work = this.load(destination, { signal: this.#disposeController.signal })
      .then((state) => {
        if (this.#disposed) throw this.#disposeController.signal.reason;

        if (state?.status === 'error') throw state.error;

        if (state) {
          const key = this.#hrefForLocation(state.location);

          if (this.#preloaded.size >= 20) this.#preloaded.delete(this.#preloaded.keys().next().value!);

          this.#preloaded.set(
            key,
            state.matches.map((match) => match.data),
          );
        }

        return state;
      })
      .catch((error) => {
        if (this.#onError) this.#reportError(error, { source: 'preload' });

        throw error;
      })
      .finally(() => {
        this.#preloads.delete(destination);
      });

    this.#preloads.set(destination, work);

    return work;
  }

  /**
   * Returns a Promise that resolves the next time the router reaches `status: 'idle'`
   * and the active matches include a route named `name`.
   *
   * - Resolves immediately if the router is already `idle` at `name`.
   * - Rejects immediately if the router is already in `status: 'error'`.
   * - If the router is currently `idle` at a **different** route and no navigation is in
   *   flight, this promise will not resolve until a future navigation lands on `name`.
   *   Typical use-case is awaiting a navigation you just triggered:
   *   `router.navigate(target); await router.waitFor('routeName')`.
   * @throws {WayfinderDisposedError} if the router is disposed while the promise is pending,
   *   or if called after the router has already been disposed.
   */
  waitFor(name: RouteName<TRoutes>): Promise<RouteState> {
    this.#assertNotDisposed();

    return new Promise((resolve, reject) => {
      const matchesName = (state: RouteState): boolean =>
        state.status === 'idle' && state.matches.some((m) => m.name === name);

      if (this.#currentState.status === 'error') {
        reject(this.#currentState.error);

        return;
      }

      if (matchesName(this.#currentState)) {
        resolve(this.#currentState);

        return;
      }

      const unsub = this.subscribe((state) => {
        if (matchesName(state)) {
          unsub();
          resolve(state);
        } else if (state.status === 'error') {
          unsub();
          reject(state.error);
        }
      });

      this.#disposeController.signal.addEventListener(
        'abort',
        () => {
          unsub();
          reject(this.#disposeController.signal.reason);
        },
        { once: true },
      );
    });
  }

  // ─── Navigation guards ────────────────────────────────────────────────────

  /**
   * Register a leave guard. Called before user-triggered navigation attempts.
   * Return `false` to cancel; `true` to allow.
   * Returns a function that removes the guard.
   *
   * Use `options.routes` to scope the guard to specific routes (fires only when navigating
   * away from a route whose name appears in the array, checked against any node in the active branch).
   */
  beforeLeave(blocker: BeforeLeaveBlocker, options?: BeforeLeaveOptions<TRoutes>): Unsubscribe {
    this.#assertNotDisposed();

    const entry: RegisteredBlocker = {
      handler: blocker,
      routes: options?.routes as string[] | undefined,
    };

    this.#beforeLeaveBlockers.add(entry);

    return () => {
      this.#beforeLeaveBlockers.delete(entry);
    };
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  get disposalSignal(): AbortSignal {
    return this.#disposeController.signal;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  /** Dispose event listeners and prevent further router interaction. Idempotent. */
  dispose(): void {
    if (this.#disposed) return;

    this.#disposed = true;
    this.#beforeLeaveBlockers.clear();
    this.#listeners.clear();
    this.#preloaded.clear();
    this.#preloads.clear();
    this.#navigation.invalidate(new WayfinderDisposedError());
    this.#unlistenHistory();
    // Abort the disposal signal last — waitFor() listeners clean themselves up via this signal.
    this.#disposeController.abort(new WayfinderDisposedError());
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  // ─── Private: assertions ──────────────────────────────────────────────────

  #assertNotDisposed(): void {
    if (this.#disposed) throw new WayfinderDisposedError();
  }

  // ─── Private: history listener ────────────────────────────────────────────

  #registerHistoryListener(): () => void {
    return this.#history.onPopstate(() => {
      const { hash, pathname, search } = this.#history.location;
      const newHref = `${pathname}${search}${hash}`;
      const previousHref = this.#lastHref;

      if (newHref === previousHref) return;

      this.#runInBackground(this.#handleHistoryNavigation(newHref, previousHref), { source: 'history-listener' });
    });
  }

  async #handleHistoryNavigation(newHref: string, previousHref: string): Promise<void> {
    const attempt = this.#navigation.begin();
    const activeMatchNames = this.#currentState.matches.map((m) => m.name);
    const destination = this.#navigationDestination(newHref);
    const allowed = await runLeaveBlockers(this.#beforeLeaveBlockers, activeMatchNames, destination);

    if (!attempt.isCurrent()) return;

    if (!allowed) {
      this.#history.replace(previousHref, this.#currentState.location.historyState);

      return;
    }

    const terminalRan = await this.#handleRoute(
      attempt,
      readLocation(this.#base, this.#history),
      (location, replace) => {
        if (!attempt.isCurrent()) return;

        const href = this.#hrefForLocation(location);

        if (replace) this.#history.replace(href, location.historyState);

        this.#lastHref = href;
      },
      undefined,
      0,
      false,
    );

    if (attempt.isCurrent() && !terminalRan) {
      this.#history.replace(previousHref, this.#currentState.location.historyState);
    }
  }

  // ─── Private: error handling ──────────────────────────────────────────────

  #reportError(error: unknown, context: RouterErrorContext): void {
    reportError(error, context, this.#onError);
  }

  #runInBackground(promise: Promise<void>, context: RouterErrorContext): void {
    void promise.catch((value) => {
      if (isRouterErrorCarrier(value)) {
        this.#reportError(value.error, value.context);
      } else {
        this.#reportError(value, context);
      }
    });
  }

  // ─── Private: listener notification ──────────────────────────────────────

  #notifyListeners(): void {
    this.#listeners.forEach((listener) => {
      listener(this.#currentState);
    });
  }

  // ─── Private: data loaders ────────────────────────────────────────────────

  /**
   * Run all data loaders and return their results. Per-def `onError` boundaries are applied.
   */
  async #loadData(
    defs: readonly RouteBranchDef[],
    context: RouteContext<RouteParams, TRoutes>,
    signal: AbortSignal,
  ): Promise<unknown[]> {
    return Promise.all(
      defs.map(async (def) => {
        if (!def.dataFn) return undefined;

        const dataFn = def.dataFn as unknown as DataFn<RouteParams, TRoutes>;

        try {
          return await dataFn({ ...context, signal } as DataContext<RouteParams, TRoutes>);
        } catch (err) {
          if (def.onError) return def.onError(err, { ...context, signal } as unknown as DataContext);

          throw err;
        }
      }),
    );
  }

  // ─── Private: URL resolution ──────────────────────────────────────────────

  /** Parse a URL, call #prepareRoute, and follow declarative redirects up to 5 hops. */
  async #resolveUrl(url: string): Promise<NavigationDecision> {
    let destination = url;

    for (let i = 0; i < 5; i += 1) {
      const parsed = new URL(destination, 'http://localhost');
      const location: RouteLocation = {
        hash: parsed.hash.replace(/^#/, ''),
        historyState: null,
        pathname: stripBase(parsed.pathname, this.#base),
        query: parseQuery(parsed.search),
      };

      const prepared = await this.#prepareRoute(location);

      if (prepared.type !== 'redirect') return prepared;

      destination = this.#resolveDestination(prepared.redirectTo);
    }

    throw new WayfinderRedirectLoopError();
  }

  // ─── Private: route preparation ───────────────────────────────────────────

  async #prepareRoute(location: RouteLocation): Promise<NavigationDecision> {
    const { params, record } = matchRouteFor(location.pathname, this.#records);

    if (!record) {
      return { location, params, type: 'unmatched' };
    }

    if (record.redirect) {
      return {
        location,
        params,
        redirectTo: resolveTarget(record.redirect, this.#routesByName, this.#base),
        type: 'redirect',
      };
    }

    let resolvedQuery: ResolvedQueryParams = location.query;

    const coerce: CoerceSearchFn | undefined = record.coerceSearch ?? this.#globalCoerceSearch;

    if (coerce) {
      try {
        resolvedQuery = coerce(location.query);
      } catch (err) {
        this.#reportError(err, { source: 'coerce-search' });
        resolvedQuery = location.query;
      }
    }

    return {
      branch: buildMatchBranch(
        record.branchDefs,
        params,
        location.pathname,
        record.branchDefs.map(() => undefined),
      ),
      location,
      params,
      record,
      resolvedQuery,
      type: 'matched',
    };
  }

  // ─── Private: terminal (data only) ────────────────────────────────────────

  async #runTerminal(
    record: RouteRecord,
    context: RouteContext<RouteParams, TRoutes>,
    location: RouteLocation,
    params: RouteParams,
    signal: AbortSignal,
    isCurrent: () => boolean,
    onDataError?: (error: unknown) => void,
  ): Promise<void> {
    if (!isCurrent()) return;

    const defs = record.branchDefs;
    const hasData = defs.some((d) => d.dataFn != null);
    let dataResults: unknown[] = defs.map(() => undefined);

    if (hasData) {
      const preloadKey = this.#hrefForLocation(location);
      const preloading = this.#preloads.get(preloadKey);

      if (preloading) {
        await preloading.catch(() => undefined);

        if (!isCurrent()) return;
      }

      const cached = this.#preloaded.get(preloadKey);

      if (cached) {
        this.#preloaded.delete(preloadKey);
        dataResults = cached;
      } else {
        this.#currentState = createRouteState({
          location,
          matches: buildMatchBranch(defs, params, location.pathname, dataResults),
          status: 'loading',
        });
        this.#notifyListeners();

        try {
          dataResults = await this.#loadData(defs, context, signal);
        } catch (error) {
          if (!isCurrent()) return;

          this.#currentState = createRouteState({
            error,
            location,
            matches: buildMatchBranch(defs, params, location.pathname, dataResults),
            status: 'error',
          });
          onDataError?.(error);
          throw error;
        }
      }
    }

    if (!isCurrent()) return;

    this.#currentState = createRouteState({
      location,
      matches: buildMatchBranch(defs, params, location.pathname, dataResults),
      status: 'idle',
    });
  }

  // ─── Private: main navigation orchestrator ────────────────────────────────

  /**
   * Declarative redirects reuse the active attempt and replace the final history entry.
   * Middleware redirects call `ctx.navigate()`, which starts a new attempt.
   */
  async #handleRoute(
    attempt: NavigationAttempt,
    currentLocation: RouteLocation,
    commit: (location: RouteLocation, replace: boolean) => void,
    useTransition?: boolean,
    depth = 0,
    replace = false,
  ): Promise<boolean> {
    const previousState = this.#currentState;
    const isCurrent = (): boolean => attempt.isCurrent() && !this.#disposed;
    const prepared = await this.#prepareRoute(currentLocation);

    if (!isCurrent()) return false;

    if (prepared.type === 'redirect') {
      if (depth >= 5) throw new WayfinderRedirectLoopError();

      return this.#handleRoute(
        attempt,
        this.#locationFromPath(prepared.redirectTo, currentLocation.historyState),
        commit,
        useTransition,
        depth + 1,
        true,
      );
    }

    if (prepared.type === 'unmatched') {
      // Fall back to notFound record when defined.
      if (this.#notFoundRecord) {
        const nfDefs = [this.#notFoundRecord.leaf];
        const nfBranch = buildMatchBranch(nfDefs, {}, currentLocation.pathname, [undefined]);
        let committed = false;
        let dataError: unknown;
        let hasDataError = false;
        let terminalRan = false;

        // Apply global coerceSearch to the unmatched location so notFound handlers
        // receive typed query params, consistent with matched-route behaviour.
        let nfResolvedQuery: ResolvedQueryParams = currentLocation.query;

        if (this.#globalCoerceSearch) {
          try {
            nfResolvedQuery = this.#globalCoerceSearch(currentLocation.query);
          } catch (err) {
            this.#reportError(err, { source: 'coerce-search' });
          }
        }

        const run = async (): Promise<void> => {
          if (!isCurrent()) return;

          const context = createRouteContext<TRoutes>(
            currentLocation,
            nfResolvedQuery,
            {},
            nfBranch,
            (target, options) => this.navigate(target, options),
          );

          terminalRan = await executeMiddlewarePipeline(
            context,
            [...this.#globalMiddleware, ...this.#notFoundRecord!.ownMiddleware] as unknown as Middleware<TRoutes>[],
            async () => {
              if (!isCurrent()) return;

              committed = true;
              commit(currentLocation, replace);

              if (!isCurrent()) return;

              await this.#runTerminal(
                this.#notFoundRecord!,
                context,
                currentLocation,
                {},
                attempt.signal,
                isCurrent,
                (error) => {
                  dataError = error;
                  hasDataError = true;
                },
              );
            },
            (error) =>
              isRouterErrorCarrier(error) || (hasDataError && error === dataError)
                ? error
                : carryError(error, { routeName: '__notFound__', source: 'middleware' }),
          );
        };

        try {
          await this.#runWithTransition(run, useTransition);
        } catch (error) {
          if (hasDataError && error === dataError) {
            throw carryError(error, { routeName: '__notFound__', source: 'data-loader' });
          }

          throw error;
        } finally {
          if (isCurrent() && committed) {
            this.#notifyListeners();
            this.#applyScroll(this.#currentState, previousState);
          }
        }

        return terminalRan && committed;
      }

      if (!isCurrent()) return false;

      commit(prepared.location, replace);

      if (!isCurrent()) return false;

      this.#currentState = createRouteState({
        location: prepared.location,
        matches: [] as RouteMatchBranch,
        status: 'idle',
      });
      this.#notifyListeners();
      this.#applyScroll(this.#currentState, previousState);

      return true;
    }

    const { branch, location, params, record, resolvedQuery } = prepared;
    let committed = false;
    let dataError: unknown;
    let hasDataError = false;
    let terminalRan = false;

    const run = async (): Promise<void> => {
      if (!isCurrent()) return;

      const context = createRouteContext<TRoutes>(location, resolvedQuery, params, branch, (target, options) =>
        this.navigate(target, options),
      );

      terminalRan = await executeMiddlewarePipeline(
        context,
        [...this.#globalMiddleware, ...record.ownMiddleware] as unknown as Middleware<TRoutes>[],
        async () => {
          if (!isCurrent()) return;

          committed = true;
          commit(location, replace);

          if (!isCurrent()) return;

          await this.#runTerminal(record, context, location, params, attempt.signal, isCurrent, (error) => {
            dataError = error;
            hasDataError = true;
          });
        },
        (error) =>
          isRouterErrorCarrier(error) || (hasDataError && error === dataError)
            ? error
            : carryError(error, { routeName: record.leaf.name, source: 'middleware' }),
      );
    };

    try {
      await this.#runWithTransition(run, useTransition);
    } catch (error) {
      if (hasDataError && error === dataError) {
        throw carryError(error, { routeName: record.leaf.name, source: 'data-loader' });
      }

      throw error;
    } finally {
      if (isCurrent() && committed) {
        this.#notifyListeners();
        this.#applyScroll(this.#currentState, previousState);
      }
    }

    return terminalRan && committed;
  }

  async #runWithTransition(run: () => Promise<void>, useTransition?: boolean): Promise<void> {
    if ((useTransition ?? this.#useViewTransition) && typeof document !== 'undefined') {
      const startViewTransition = (
        document as Document & {
          startViewTransition?: (callback: () => void | Promise<void>) => { finished: Promise<void> };
        }
      ).startViewTransition;

      if (startViewTransition) {
        await startViewTransition.call(document, run).finished;

        return;
      }
    }

    await run();
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

  // ─── Private: destination resolution ─────────────────────────────────────

  #resolveDestination(path: string): string {
    const parsed = new URL(path, 'http://localhost');
    const normalizedPath = stripBase(parsed.pathname, this.#base);

    return `${joinPaths(this.#base, normalizedPath)}${parsed.search}${parsed.hash}`;
  }

  #locationFromPath(path: string, historyState: unknown): RouteLocation {
    const parsed = new URL(this.#resolveDestination(path), 'http://localhost');

    return {
      hash: parsed.hash.replace(/^#/, ''),
      historyState,
      pathname: stripBase(parsed.pathname, this.#base),
      query: parseQuery(parsed.search),
    };
  }

  #hrefForLocation(location: RouteLocation): string {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(location.query)) {
      if (Array.isArray(value))
        value.forEach((item) => {
          search.append(key, item);
        });
      else search.set(key, value);
    }

    const query = search.toString();
    const hash = location.hash ? `#${location.hash}` : '';

    return `${joinPaths(this.#base, location.pathname)}${query ? `?${query}` : ''}${hash}`;
  }

  #navigationDestination(href: string): NavigationDestination {
    const parsed = new URL(href, 'http://localhost');
    const pathname = stripBase(parsed.pathname, this.#base);
    const { params, record } = matchRouteFor(pathname, this.#records);

    return {
      name: record?.leaf.name,
      params,
      pathname,
      query: parseQuery(parsed.search),
    };
  }

  /** User-initiated navigation. History changes only after middleware reaches the terminal stage. */
  async #navigateToPath(path: string, options: NavigateOptions = {}): Promise<void> {
    this.#assertNotDisposed();

    const destination = this.#resolveDestination(path);

    if (!options.force && destination === this.#lastHref) return;

    const attempt = this.#navigation.begin();
    const activeMatchNames = this.#currentState.matches.map((match) => match.name);
    const allowed = await runLeaveBlockers(
      this.#beforeLeaveBlockers,
      activeMatchNames,
      this.#navigationDestination(destination),
    );

    if (!attempt.isCurrent() || !allowed) return;

    try {
      await this.#handleRoute(
        attempt,
        this.#locationFromPath(destination, options.state),
        (location, replace) => {
          if (!attempt.isCurrent()) return;

          const href = this.#hrefForLocation(location);

          if (replace) this.#history.replace(href, location.historyState);
          else this.#history.push(href, location.historyState);

          this.#lastHref = href;
        },
        options.viewTransition,
        0,
        options.replace ?? false,
      );
    } catch (value) {
      throw isRouterErrorCarrier(value) ? value.error : value;
    }
  }
}

// ─── Public factory ───────────────────────────────────────────────────────────

/**
 * Create a new router instance from a route table.
 *
 * @example
 * const router = createRouter({
 *   routes: {
 *     home: { path: '/' },
 *     userDetail: { path: '/users/:id', data: fetchUser },
 *   },
 * });
 */
export function createRouter<const TRoutes extends RouteTable>(options: RouterOptions<TRoutes>): Router<TRoutes> {
  return new Router(options);
}

// Export the Router type (not the constructor value) for type annotations.
export type { Router };
