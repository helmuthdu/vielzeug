import type {
  BeforeLeaveBlocker,
  BeforeLeaveOptions,
  CoerceSearchFn,
  DataContext,
  DataFn,
  HistoryDriver,
  IsActiveOptions,
  MatchStatus,
  Middleware,
  NamedNavigationTarget,
  NavigateOptions,
  NavigationDestination,
  PathParams,
  QueryParams,
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
  Unsubscribe,
} from './types';

import { compileRoutes } from './compile';
import {
  buildMatchBranch,
  createRouteContext,
  createRouteState,
  executeMiddlewarePipeline,
  reportError,
} from './context';
import { WayfinderDisposedError } from './errors';
import { type RegisteredBlocker, runLeaveBlockers } from './guards';
import { createBrowserHistory } from './history';
import { createHydrationManager } from './hydration';
import {
  buildPreloadKey,
  buildUrl,
  joinPaths,
  matchesPrefix,
  matchRouteFor,
  normalizePath,
  parseQuery,
  readLocation,
  stripBase,
} from './path';
import { createPreloadManager } from './preload';

// ─── Module-level helpers (formerly in resolve.ts) ────────────────────────────

function getRouteByName<TMeta, TComponent>(
  name: string,
  routesByName: ReadonlyMap<string, RouteRecord<TMeta, TComponent>>,
): RouteRecord<TMeta, TComponent> {
  const route = routesByName.get(name);

  if (route) return route;

  const available = [...routesByName.keys()].join(', ');

  throw new Error(
    available
      ? `[wayfinder] Unknown route name: ${name}. Available routes: ${available}`
      : `[wayfinder] Unknown route name: ${name}`,
  );
}

function resolveTarget<TMeta, TComponent>(
  target: { path: string } | { hash?: string; name: string; params?: RouteParams; query?: ResolvedQueryParams },
  routesByName: ReadonlyMap<string, RouteRecord<TMeta, TComponent>>,
  base = '/',
): string {
  if ('path' in target) return target.path;

  const route = getRouteByName(target.name, routesByName);
  const path = buildUrl(base, route.path, target.params, target.query);

  return target.hash ? `${path}#${target.hash}` : path;
}

// ─── Internal helper ─────────────────────────────────────────────────────────

const ERROR_CONTEXT = Symbol('wayfinder.errorContext');

function attachErrorContext(error: unknown, context: RouterErrorContext): void {
  if (error !== null && typeof error === 'object') {
    (error as Record<symbol, RouterErrorContext>)[ERROR_CONTEXT] = context;
  }
}

function getErrorContext(error: unknown): RouterErrorContext | undefined {
  if (error !== null && typeof error === 'object') {
    return (error as Record<symbol, RouterErrorContext | undefined>)[ERROR_CONTEXT];
  }

  return undefined;
}

// ─── Internal types ───────────────────────────────────────────────────────────

type NavigationDecision<TMeta, TComponent> =
  | {
      branch: RouteMatchBranch<TMeta, TComponent>;
      location: RouteLocation;
      params: RouteParams;
      record: RouteRecord<TMeta, TComponent>;
      resolvedQuery: ResolvedQueryParams;
      type: 'matched';
    }
  | { location: RouteLocation; params: RouteParams; type: 'unmatched' }
  | { location: RouteLocation; params: RouteParams; redirectTo: string; type: 'redirect' };

// ─── Streaming helper ─────────────────────────────────────────────────────────

function isAsyncGenerator(value: unknown): value is AsyncGenerator<unknown, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as AsyncGenerator)[Symbol.asyncIterator] === 'function' &&
    typeof (value as AsyncGenerator).next === 'function' &&
    typeof (value as AsyncGenerator).return === 'function'
  );
}

// ─── Router class ─────────────────────────────────────────────────────────────

class Router<TRoutes extends RouteTable, TMeta = unknown, TComponent = unknown> {
  readonly #base: string;
  readonly #globalMiddleware: readonly Middleware[];
  readonly #globalCoerceSearch?: CoerceSearchFn;
  readonly #history: HistoryDriver;
  readonly #records: readonly RouteRecord<TMeta, TComponent>[];
  readonly #routesByName: ReadonlyMap<string, RouteRecord<TMeta, TComponent>>;
  readonly #scroll?: RouterOptions<TRoutes, TMeta, TComponent>['scroll'];
  readonly #useViewTransition: boolean;
  readonly #onError?: RouterOptions<TRoutes, TMeta, TComponent>['onError'];

  // Mutable navigation state
  #abortController: AbortController | null = null;
  readonly #beforeLeaveBlockers = new Set<RegisteredBlocker>();
  #currentState: RouteState<TMeta, TComponent>;
  #disposed = false;
  readonly #disposeController = new AbortController();
  #lastHref = '/';
  readonly #listeners = new Set<(state: RouteState<TMeta, TComponent>) => void>();
  // F5: compiled notFound fallback record
  readonly #notFoundRecord: RouteRecord<TMeta, TComponent> | null;

  // Sub-managers
  readonly #hydration: ReturnType<typeof createHydrationManager<TMeta, TComponent>>;
  readonly #preload: ReturnType<typeof createPreloadManager>;

  readonly #unlistenHistory: () => void;

  constructor(options: RouterOptions<TRoutes, TMeta, TComponent>) {
    const compiled = compileRoutes(options);

    this.#base = normalizePath(options.base ?? '/');
    this.#globalMiddleware = (options.middleware ?? []) as unknown as Middleware[];
    this.#globalCoerceSearch = options.coerceSearch;
    this.#history = options.history ?? createBrowserHistory();
    this.#useViewTransition = options.viewTransition ?? false;
    this.#scroll = options.scroll;
    this.#onError = options.onError;
    this.#records = compiled.records as unknown as readonly RouteRecord<TMeta, TComponent>[];
    this.#routesByName = compiled.routesByName as unknown as ReadonlyMap<string, RouteRecord<TMeta, TComponent>>;
    this.#hydration = createHydrationManager<TMeta, TComponent>();
    this.#preload = createPreloadManager();
    this.#currentState = createRouteState<TMeta, TComponent>({
      location: { hash: '', historyState: null, pathname: '/', query: {} },
      matches: [] as RouteMatchBranch<TMeta, TComponent>,
      status: 'idle',
    });

    // F5: Build a synthetic RouteRecord for the notFound fallback.
    if (options.notFound) {
      const nf = options.notFound;
      const leafDef: RouteBranchDef<TMeta, TComponent> = {
        component: nf.component as TComponent | undefined,
        dataFn: nf.data,
        meta: nf.meta as TMeta | undefined,
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
    this.#runInBackground(this.#handleRoute(), { source: 'initial-navigation' });
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
  getSnapshot(): RouteState<TMeta, TComponent> {
    return this.#currentState;
  }

  // ─── Subscription ─────────────────────────────────────────────────────────

  /**
   * Subscribe to state changes. The listener is called on each subsequent state change;
   * use `getSnapshot()` to read the current value immediately.
   */
  subscribe(listener: (state: RouteState<TMeta, TComponent>) => void): Unsubscribe {
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
   * If the route handler throws, the navigation is considered committed — state reflects
   * the destination with `status: 'idle'` and the browser URL is updated — but the
   * returned Promise rejects with the handler error. `status` is NOT set to `'error'`.
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
    query?: QueryParams,
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

  /** Resolve a pathname to the matching route branch without running middleware or handlers. Returns null for redirects or no match. */
  resolve(pathname: string): RouteMatchBranch<TMeta, TComponent> | null {
    const normalizedPathname = stripBase(normalizePath(pathname), this.#base);
    const { params, record } = matchRouteFor(normalizedPathname, this.#records);

    if (!record || record.redirect) return null;

    const defs = this.#hydration.effectiveDefs(record);
    const branch = buildMatchBranch(
      defs,
      params,
      normalizedPathname,
      defs.map(() => undefined),
    );

    return branch.length ? branch : null;
  }

  /**
   * Resolve a URL to a matched route state including data loader results, without
   * modifying router state or history. Follows declarative redirects.
   *
   * Note: lazy route modules are resolved as a side effect of this call.
   * Useful for SSR data pre-fetching.
   *
   * R5: Accepts an options object instead of a bare AbortSignal.
   */
  async match(url: string, options?: { signal?: AbortSignal }): Promise<RouteState<TMeta, TComponent> | null> {
    const prepared = await this.#resolveUrl(url);

    if (prepared.type !== 'matched') return null;

    const { location, params, record, resolvedQuery } = prepared;
    const defs = this.#hydration.effectiveDefs(record);
    const hasData = defs.some((d) => d.dataFn != null);
    let dataResults: unknown[] = defs.map(() => undefined);
    let error: unknown;
    let status: 'error' | 'idle' = 'idle';

    if (hasData) {
      const effectiveSignal = options?.signal ?? new AbortController().signal;
      const branch = buildMatchBranch(defs, params, location.pathname, dataResults);
      const context = createRouteContext<TRoutes>(location, resolvedQuery, params, branch, () => Promise.resolve());

      try {
        dataResults = await this.#loadDataDrain(defs, context, effectiveSignal);
      } catch (e) {
        error = e;
        status = 'error';
      }
    }

    return createRouteState<TMeta, TComponent>({
      error,
      location,
      matches: buildMatchBranch(defs, params, location.pathname, dataResults),
      status,
    });
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
  waitFor(name: RouteName<TRoutes>): Promise<RouteState<TMeta, TComponent>> {
    this.#assertNotDisposed();

    return new Promise((resolve, reject) => {
      const matchesName = (state: RouteState<TMeta, TComponent>): boolean =>
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

  // ─── Preload ──────────────────────────────────────────────────────────────

  /**
   * Eagerly execute the data loaders for a named route without navigating.
   * Results are cached and reused during the next navigation to the same route.
   * Concurrent calls for the same route are deduplicated.
   *
   * Pass the same `query` you intend to navigate with to ensure the cached result
   * matches the navigation's cache key. Without `query`, the preload key is the
   * bare path — any navigation with a query string will produce a cache miss.
   */
  async preload<Name extends RouteName<TRoutes>>(
    name: Name,
    params?: PathParams<RoutePathByName<TRoutes, Name>>,
    query?: QueryParams,
  ): Promise<void> {
    const route = getRouteByName(name, this.#routesByName);
    const cacheKey = buildPreloadKey(this.#base, route.path, params as RouteParams, query);

    const inflight = this.#preload.getInflight(cacheKey);

    if (inflight) return inflight;

    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, this.#disposeController.signal]);
    const work = this.#doPreload(cacheKey, signal, query).finally(() => {
      this.#preload.untrack(cacheKey);
    });

    this.#preload.track(cacheKey, work);

    try {
      return await work;
    } catch (error) {
      if (this.#onError) this.#reportError(error, { source: 'preload' });

      throw error;
    }
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
    // Abort in-flight navigation — any isCurrent() checks via signal.aborted return false.
    this.#abortController?.abort();
    this.#abortController = null;
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
    const activeMatchNames = this.#currentState.matches.map((m) => m.name);
    const parsed = new URL(newHref, 'http://localhost');
    const destPathname = stripBase(parsed.pathname, this.#base);
    const { params: destParams, record: destRecord } = matchRouteFor(destPathname, this.#records);
    const dest: NavigationDestination = {
      name: destRecord?.leaf.name,
      params: destParams,
      pathname: destPathname,
      query: parseQuery(parsed.search),
    };
    const allowed = await runLeaveBlockers(this.#beforeLeaveBlockers, activeMatchNames, dest);

    if (!allowed) {
      this.#history.replace(previousHref, this.#currentState.location.historyState);

      return;
    }

    this.#lastHref = newHref;
    await this.#handleRoute();
  }

  // ─── Private: error handling ──────────────────────────────────────────────

  #reportError(error: unknown, context: RouterErrorContext): void {
    reportError(error, context, this.#onError);
  }

  #runInBackground(promise: Promise<void>, context: RouterErrorContext): void {
    void promise.catch((error) => {
      this.#reportError(error, getErrorContext(error) ?? context);
    });
  }

  // ─── Private: listener notification ──────────────────────────────────────

  #notifyListeners(): void {
    this.#listeners.forEach((listener) => listener(this.#currentState));
  }

  // ─── Private: data loaders ────────────────────────────────────────────────

  /**
   * R10: Drain an async generator to completion. Private class method replaces
   * the module-level `drainGenerator` helper.
   */
  async #drainGenerator(gen: AsyncGenerator<unknown, unknown>, signal: AbortSignal): Promise<unknown> {
    let lastYield: unknown;

    while (true) {
      if (signal.aborted) {
        await gen.return(undefined as unknown).catch(() => undefined);

        return lastYield;
      }

      const { done, value } = await gen.next();

      if (done) return value ?? lastYield;

      lastYield = value;
    }
  }

  /**
   * Drain all data loaders to completion. Async generators are consumed entirely.
   * Used in `match()` and `preload()`. Per-def `onError` boundaries are applied.
   */
  async #loadDataDrain(
    defs: readonly RouteBranchDef<TMeta, TComponent>[],
    context: RouteContext<RouteParams, TRoutes>,
    signal: AbortSignal,
  ): Promise<unknown[]> {
    return Promise.all(
      defs.map(async (def) => {
        if (!def.dataFn) return undefined;

        const dataFn = def.dataFn as unknown as DataFn<RouteParams, TRoutes>;
        const raw = dataFn({ ...context, signal } as DataContext<RouteParams, TRoutes>);

        try {
          return isAsyncGenerator(raw) ? await this.#drainGenerator(raw, signal) : await (raw as Promise<unknown>);
        } catch (err) {
          if (def.onError) return def.onError(err, { ...context, signal } as unknown as DataContext);

          throw err;
        }
      }),
    );
  }

  /**
   * Run all data loaders in streaming mode. Generators yield partial states via `onPartial`.
   * Non-generator loaders are awaited normally. Per-def `onError` boundaries are applied.
   * Used during live navigation in `#runTerminal`.
   */
  async #loadDataStream(
    defs: readonly RouteBranchDef<TMeta, TComponent>[],
    context: RouteContext<RouteParams, TRoutes>,
    signal: AbortSignal,
    isCurrent: () => boolean,
    location: RouteLocation,
    params: RouteParams,
  ): Promise<unknown[]> {
    const rawResults: Array<AsyncGenerator<unknown, unknown> | unknown> = defs.map((def) => {
      if (!def.dataFn) return undefined;

      const dataFn = def.dataFn as unknown as DataFn<RouteParams, TRoutes>;

      return dataFn({ ...context, signal } as DataContext<RouteParams, TRoutes>);
    });

    const streamingIndices: number[] = [];

    const settled: unknown[] = await Promise.all(
      rawResults.map(async (raw, i) => {
        if (isAsyncGenerator(raw)) {
          streamingIndices.push(i);

          return undefined;
        }

        if (raw === undefined) return undefined;

        try {
          return await (raw as Promise<unknown>);
        } catch (err) {
          const def = defs[i]!;

          if (def.onError) return def.onError(err, { ...context, signal } as unknown as DataContext);

          throw err;
        }
      }),
    );

    if (streamingIndices.length === 0) return settled;

    const streamingData: unknown[] = [...settled];

    const onPartial = (value: unknown, idx: number): void => {
      if (!isCurrent()) return;

      streamingData[idx] = value;

      const nodeStatuses: MatchStatus[] = defs.map((_, i) => (streamingIndices.includes(i) ? 'streaming' : 'idle'));

      this.#currentState = createRouteState<TMeta, TComponent>({
        location,
        matches: buildMatchBranch(defs, params, location.pathname, streamingData, nodeStatuses),
        status: 'streaming',
      });
      this.#notifyListeners();
    };

    await Promise.all(
      streamingIndices.map(async (idx) => {
        const gen = rawResults[idx] as AsyncGenerator<unknown, unknown>;

        try {
          streamingData[idx] = await this.#runStreamingLoader(gen, idx, signal, isCurrent, onPartial);
        } catch (err) {
          const def = defs[idx]!;

          if (def.onError) {
            streamingData[idx] = await def.onError(err, { ...context, signal } as unknown as DataContext);
          } else {
            throw err;
          }
        }
      }),
    );

    return streamingData;
  }

  // ─── Private: URL resolution ──────────────────────────────────────────────

  /** Parse a URL, call #prepareRoute, and follow declarative redirects up to 5 hops. */
  async #resolveUrl(url: string): Promise<NavigationDecision<TMeta, TComponent>> {
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

    throw new Error('[wayfinder] Redirect loop detected');
  }

  // ─── Private: preload ─────────────────────────────────────────────────────

  async #doPreload(startUrl: string, signal?: AbortSignal, query?: QueryParams): Promise<void> {
    const prepared = await this.#resolveUrl(startUrl);

    if (prepared.type !== 'matched') return;

    const { location, params, record, resolvedQuery } = prepared;
    const defs = this.#hydration.effectiveDefs(record);
    const hasData = defs.some((d) => d.dataFn != null);

    if (!hasData) return;

    const effectiveSignal = signal ?? new AbortController().signal;
    const branch = buildMatchBranch(
      defs,
      params,
      location.pathname,
      defs.map(() => undefined),
    );
    const context = createRouteContext<TRoutes>(location, resolvedQuery, params, branch, () => Promise.resolve());
    const results = await this.#loadDataDrain(defs, context, effectiveSignal);

    this.#preload.set(buildPreloadKey(this.#base, record.path, params, query ?? location.query), results);
  }

  // ─── Private: route preparation ───────────────────────────────────────────

  async #prepareRoute(location: RouteLocation): Promise<NavigationDecision<TMeta, TComponent>> {
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

    await this.#hydration.hydrate(record);

    const defs = this.#hydration.effectiveDefs(record);

    return {
      branch: buildMatchBranch(
        defs,
        params,
        location.pathname,
        defs.map(() => undefined),
      ),
      location,
      params,
      record,
      resolvedQuery,
      type: 'matched',
    };
  }

  // ─── Private: streaming data loader ──────────────────────────────────────

  /**
   * Drain an AsyncGenerator data loader, emitting `status: 'streaming'` for every yielded
   * partial value and returning the generator's return value as the final settled data.
   * Aborts cleanly when the signal fires or the navigation is superseded.
   */
  async #runStreamingLoader(
    generator: AsyncGenerator<unknown, unknown>,
    defIndex: number,
    signal: AbortSignal,
    isCurrent: () => boolean,
    onPartial: (data: unknown, defIndex: number) => void,
  ): Promise<unknown> {
    let lastValue: unknown;

    try {
      while (true) {
        if (signal.aborted || !isCurrent()) {
          await generator.return(undefined as unknown);

          return lastValue;
        }

        const { done, value } = await generator.next();

        if (done) return value ?? lastValue;

        lastValue = value;
        onPartial(value, defIndex);
      }
    } catch (err) {
      await generator.return(undefined as unknown).catch(() => undefined);
      throw err;
    }
  }

  // ─── Private: terminal (data only — F4: handler removed) ─────────────────

  async #runTerminal(
    record: RouteRecord<TMeta, TComponent>,
    context: RouteContext<RouteParams, TRoutes>,
    location: RouteLocation,
    params: RouteParams,
    _initialBranch: RouteMatchBranch<TMeta, TComponent>,
    signal: AbortSignal,
    isCurrent: () => boolean,
  ): Promise<void> {
    if (!isCurrent()) return;

    const defs = this.#hydration.effectiveDefs(record);
    const hasData = defs.some((d) => d.dataFn != null);
    let dataResults: unknown[] = defs.map(() => undefined);

    if (hasData) {
      const preloadKey = buildPreloadKey(this.#base, record.path, params, location.query);
      const cached = this.#preload.consume(preloadKey);

      if (cached) {
        dataResults = cached;
      } else {
        // Emit per-node loading state (F1) while data is in-flight.
        const loadingStatuses: MatchStatus[] = defs.map((d) => (d.dataFn ? 'loading' : 'idle'));

        this.#currentState = createRouteState<TMeta, TComponent>({
          location,
          matches: buildMatchBranch(defs, params, location.pathname, dataResults, loadingStatuses),
          status: 'loading',
        });
        this.#notifyListeners();

        try {
          dataResults = await this.#loadDataStream(defs, context, signal, isCurrent, location, params);
        } catch (error) {
          this.#currentState = createRouteState<TMeta, TComponent>({
            error,
            location,
            matches: buildMatchBranch(defs, params, location.pathname, dataResults),
            status: 'error',
          });
          // R3: attach enriched context so the eventual reporter uses it.
          attachErrorContext(error, { routeName: record.leaf.name, source: 'data-loader' });
          // Do not call #notifyListeners here — the finally block in #handleRoute does it once.
          throw error;
        }
      }
    }

    if (!isCurrent()) return;

    this.#currentState = createRouteState<TMeta, TComponent>({
      location,
      matches: buildMatchBranch(defs, params, location.pathname, dataResults),
      status: 'idle',
    });
  }

  // ─── Private: view transitions ────────────────────────────────────────────

  async #runWithTransition(run: () => Promise<void>, useTransition?: boolean): Promise<void> {
    const shouldUseTransition = useTransition ?? this.#useViewTransition;

    if (shouldUseTransition && typeof document !== 'undefined') {
      type ViewTransitionDocument = Document & {
        startViewTransition?: (callback: () => void | Promise<void>) => { finished: Promise<void> };
      };

      const doc = document as ViewTransitionDocument;

      if (doc.startViewTransition) {
        await doc.startViewTransition(run).finished;

        return;
      }
    }

    await run();
  }

  // ─── Private: main navigation orchestrator ────────────────────────────────

  /**
   * R8: Declarative redirect loops are detected by the `depth` counter passed through
   * `#commitRedirect` (mirrors `#resolveUrl`'s 5-hop limit). Middleware redirects
   * (via `ctx.navigate()`) are handled by `#navigateToPath`.
   * R6: `internalNavigation` boolean is replaced by `#commitRedirect` for redirect paths.
   */
  async #handleRoute(useTransition?: boolean, depth = 0): Promise<void> {
    this.#abortController?.abort();

    const controller = new AbortController();

    this.#abortController = controller;

    const prevState = this.#currentState;
    const isCurrent = (): boolean => !controller.signal.aborted && !this.#disposed;

    const currentLocation = readLocation(this.#base, this.#history);
    const prepared = await this.#prepareRoute(currentLocation);

    if (!isCurrent()) return;

    if (prepared.type === 'redirect') {
      // R8: follow declarative redirect internally without user-visible blockers.
      await this.#commitRedirect(prepared.redirectTo, true, depth);

      return;
    }

    if (prepared.type === 'unmatched') {
      // F5: fall back to notFound record when defined.
      if (this.#notFoundRecord) {
        const nfDefs = [this.#notFoundRecord.leaf];
        const nfBranch = buildMatchBranch(nfDefs, {}, currentLocation.pathname, [undefined]);
        let committed = false;

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

          await executeMiddlewarePipeline(
            context,
            [...this.#globalMiddleware, ...this.#notFoundRecord!.ownMiddleware] as unknown as Middleware<TRoutes>[],
            async () => {
              committed = true;
              await this.#runTerminal(
                this.#notFoundRecord!,
                context,
                currentLocation,
                {},
                nfBranch,
                controller.signal,
                isCurrent,
              );
            },
          );
        };

        try {
          await this.#runWithTransition(run, useTransition);
        } finally {
          if (isCurrent() && committed) {
            this.#notifyListeners();
            this.#applyScroll(this.#currentState, prevState);
          }
        }

        return;
      }

      this.#currentState = createRouteState<TMeta, TComponent>({
        location: prepared.location,
        matches: [] as RouteMatchBranch<TMeta, TComponent>,
        status: 'idle',
      });
      this.#notifyListeners();
      this.#applyScroll(this.#currentState, prevState);

      return;
    }

    const { branch, location, params, record, resolvedQuery } = prepared;
    let committed = false;

    const run = async (): Promise<void> => {
      if (!isCurrent()) return;

      const context = createRouteContext<TRoutes>(location, resolvedQuery, params, branch, (target, options) =>
        this.navigate(target, options),
      );

      await executeMiddlewarePipeline(
        context,
        [...this.#globalMiddleware, ...record.ownMiddleware] as unknown as Middleware<TRoutes>[],
        async () => {
          committed = true;
          await this.#runTerminal(record, context, location, params, branch, controller.signal, isCurrent);
        },
      );
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

  // ─── Private: scroll ─────────────────────────────────────────────────────

  #applyScroll(to: RouteState<TMeta, TComponent>, from: RouteState<TMeta, TComponent>): void {
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

  /**
   * R6: Internal redirect path — pushes/replaces history and re-runs route handling
   * without running leave blockers (user never initiated this navigation).
   * R8: accepts `depth` to detect declarative redirect loops (mirrors #resolveUrl's 5-hop limit).
   */
  async #commitRedirect(path: string, replace = true, depth = 0): Promise<void> {
    if (depth >= 5) throw new Error('[wayfinder] Redirect loop detected');

    const destination = this.#resolveDestination(path);

    this.#lastHref = destination;

    if (replace) {
      this.#history.replace(destination);
    } else {
      this.#history.push(destination);
    }

    await this.#handleRoute(undefined, depth + 1);
  }

  /**
   * User-initiated navigation. Always runs leave blockers.
   * R6: `internalNavigation` param is removed; use `#commitRedirect` for redirect paths.
   */
  async #navigateToPath(path: string, options: NavigateOptions = {}): Promise<void> {
    this.#assertNotDisposed();

    const destination = this.#resolveDestination(path);

    if (!options.force && destination === this.#lastHref) return;

    const prevLastHref = this.#lastHref;
    const activeMatchNames = this.#currentState.matches.map((m) => m.name);
    const parsed = new URL(destination, 'http://localhost');
    const destPathname = stripBase(parsed.pathname, this.#base);
    const { params: destParams, record: destRecord } = matchRouteFor(destPathname, this.#records);
    const dest: NavigationDestination = {
      name: destRecord?.leaf.name,
      params: destParams,
      pathname: destPathname,
      query: parseQuery(parsed.search),
    };
    const allowed = await runLeaveBlockers(this.#beforeLeaveBlockers, activeMatchNames, dest);

    if (!allowed) return;

    this.#lastHref = destination;

    if (options.replace) {
      this.#history.replace(destination, options.state);
    } else {
      this.#history.push(destination, options.state);
    }

    try {
      await this.#handleRoute(options.viewTransition);
    } catch (err) {
      // Restore #lastHref to the pre-navigation value so the same destination
      // can be retried after a transient failure.
      this.#lastHref = prevLastHref;
      throw err;
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
export function createRouter<const TRoutes extends RouteTable, TMeta = unknown, TComponent = unknown>(
  options: RouterOptions<TRoutes, TMeta, TComponent>,
): Router<TRoutes, TMeta, TComponent> {
  return new Router(options);
}

// Export the Router type (not the constructor value) for type annotations.
export type { Router };
