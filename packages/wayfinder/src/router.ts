import type { RouteBranchDef, RouteRecord } from './router-internal';
import type {
  BeforeLeaveBlocker,
  DataFn,
  HandlerContext,
  HistoryDriver,
  IsActiveOptions,
  NavigateOptions,
  NamedNavigationTarget,
  QueryParams,
  RawNavigationTarget,
  ResolvedQueryParams,
  RouteContext,
  RouteHandler,
  RouteLocation,
  RouteMatchBranch,
  RouteName,
  RouteParams,
  RoutePathByName,
  RouteState,
  RouteTable,
  RouterErrorContext,
  RouterOptions,
  Unsubscribe,
} from './types';

import { compileRoutes } from './compile';
import { createBrowserHistory } from './history';
import { buildUrl, joinPaths, matchRouteFor, matchesPrefix, normalizePath, parseQuery } from './path';
import {
  buildMatchBranch,
  buildPreloadKey,
  createRouteContext,
  createRouteState,
  executeMiddlewarePipeline,
  getRouteByName,
  readLocation,
  reportError,
  resolveTarget,
  stripBase,
} from './resolve';

// ─── Internal types ───────────────────────────────────────────────────────────

/** Lazy-resolved values stored per branchDef index (avoids mutating compiled records). */
type HydrationOverride<TMeta, TComponent> = {
  component?: TComponent;
  dataFn?: DataFn;
  handler?: RouteHandler;
  meta?: TMeta;
};

type HydrationState<TMeta, TComponent> = {
  done: boolean;
  overrides: Map<number, HydrationOverride<TMeta, TComponent>>;
  work?: Promise<void>;
};

type PreparedRoute<TRoutes extends RouteTable, TMeta, TComponent> =
  | {
      branch: RouteMatchBranch<TMeta, TComponent>;
      location: RouteLocation;
      params: RouteParams;
      record: RouteRecord<TRoutes, TMeta, TComponent>;
      resolvedQuery: ResolvedQueryParams;
      type: 'matched';
    }
  | { location: RouteLocation; params: RouteParams; type: 'unmatched' }
  | { location: RouteLocation; params: RouteParams; redirectTo: string; type: 'redirect' };

// ─── Router class ─────────────────────────────────────────────────────────────

class Router<TRoutes extends RouteTable, TMeta = unknown, TComponent = unknown> {
  /** Maximum number of unconsumed preload results to keep in memory. */
  static readonly #PRELOAD_MAX = 20;

  readonly #base: string;
  readonly #history: HistoryDriver;
  readonly #records: readonly RouteRecord<TRoutes, TMeta, TComponent>[];
  readonly #routesByName: ReadonlyMap<string, RouteRecord<TRoutes, TMeta, TComponent>>;
  readonly #scroll?: RouterOptions<TRoutes, TMeta, TComponent>['scroll'];
  readonly #useViewTransition: boolean;
  readonly #onError?: RouterOptions<TRoutes, TMeta, TComponent>['onError'];

  // Mutable navigation state
  #abortController: AbortController | null = null;
  readonly #beforeLeaveBlockers = new Set<BeforeLeaveBlocker>();
  #currentState: RouteState<TMeta, TComponent>;
  #disposed = false;
  #lastHref = '/';
  readonly #listeners = new Set<(state: RouteState<TMeta, TComponent>) => void>();
  #navigationId = 0;

  // Lazy hydration: stores resolved overrides per record (never mutates compiled RouteRecord)
  readonly #hydrationCache = new Map<RouteRecord<TRoutes, TMeta, TComponent>, HydrationState<TMeta, TComponent>>();

  // Preload: in-flight deduplication and consume-once result cache
  readonly #preloadInflight = new Map<string, Promise<void>>();
  readonly #preloadResults = new Map<string, unknown[]>();

  readonly #unlistenHistory: () => void;

  constructor(options: RouterOptions<TRoutes, TMeta, TComponent>) {
    const compiled = compileRoutes(options);

    this.#base = normalizePath(options.base ?? '/');
    this.#history = options.history ?? createBrowserHistory();
    this.#useViewTransition = options.viewTransition ?? false;
    this.#scroll = options.scroll;
    this.#onError = options.onError;
    this.#records = compiled.records;
    this.#routesByName = compiled.routesByName;
    this.#currentState = createRouteState<TMeta, TComponent>({
      location: { hash: '', historyState: null, pathname: '/', query: {} },
      matches: [] as RouteMatchBranch<TMeta, TComponent>,
      status: 'idle',
    });
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
  navigate(target: NamedNavigationTarget<TRoutes> | RawNavigationTarget, options?: NavigateOptions): Promise<void> {
    const destination = resolveTarget(target, this.#routesByName);

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
    const pathname = stripBase(normalizePath(this.#history.location.pathname), this.#base);
    const exact = options.exact ?? false;

    return exact ? matchRouteFor(pathname, [route]).record != null : matchesPrefix(pathname, route);
  }

  /** Resolve a pathname to the matching route branch without running middleware or handlers. Returns null for redirects or no match. */
  resolve(pathname: string): RouteMatchBranch<TMeta, TComponent> | null {
    const normalizedPathname = stripBase(normalizePath(pathname), this.#base);
    const { params, record } = matchRouteFor(normalizedPathname, this.#records);

    if (!record || record.redirect) return null;

    const defs = this.#effectiveDefs(record);
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
   * @param signal - Optional abort signal to cancel in-flight data loaders.
   */
  async match(url: string, signal?: AbortSignal): Promise<RouteState<TMeta, TComponent> | null> {
    const prepared = await this.#resolveUrl(url);

    if (prepared.type !== 'matched') return null;

    const { branch, location, params, record, resolvedQuery } = prepared;
    const defs = this.#effectiveDefs(record);
    const hasData = defs.some((d) => d.dataFn != null);
    let dataResults: unknown[] = defs.map(() => undefined);
    let error: unknown;
    let status: 'error' | 'idle' = 'idle';

    if (hasData) {
      const effectiveSignal = signal ?? new AbortController().signal;
      const context = createRouteContext<TRoutes>(location, resolvedQuery, params, branch, () => Promise.resolve());

      try {
        dataResults = await this.#runDataLoaders(defs, context, effectiveSignal);
      } catch (e) {
        error = e;
        status = 'error';
      }
    }

    return createRouteState<TMeta, TComponent>({
      ...(error !== undefined ? { error } : {}),
      location,
      matches: buildMatchBranch(defs, params, location.pathname, dataResults),
      status,
    });
  }

  // ─── Preload ──────────────────────────────────────────────────────────────

  /**
   * Eagerly execute the data loaders for a named route without navigating.
   * Results are cached and reused during the next navigation to the same route.
   * Concurrent calls for the same route are deduplicated.
   */
  async preload<Name extends RouteName<TRoutes>>(
    name: Name,
    params?: PathParams<RoutePathByName<TRoutes, Name>>,
  ): Promise<void> {
    const route = getRouteByName(name, this.#routesByName);
    const cacheKey = buildPreloadKey(this.#base, route.path, params as RouteParams);

    const inflight = this.#preloadInflight.get(cacheKey);

    if (inflight) return inflight;

    const controller = new AbortController();
    const work = this.#doPreload(cacheKey, controller.signal).finally(() => {
      this.#preloadInflight.delete(cacheKey);
    });

    this.#preloadInflight.set(cacheKey, work);

    try {
      return await work;
    } catch (error) {
      this.#reportError(error, { source: 'preload' });
      throw error;
    }
  }

  // ─── Navigation guards ────────────────────────────────────────────────────

  /**
   * Register a global leave guard. Called before user-triggered navigation attempts.
   * Return `false` to cancel; `true` to allow.
   * Returns a function that removes the guard.
   */
  beforeLeave(blocker: BeforeLeaveBlocker): Unsubscribe {
    this.#assertNotDisposed();
    this.#beforeLeaveBlockers.add(blocker);

    return () => {
      this.#beforeLeaveBlockers.delete(blocker);
    };
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  /** Dispose event listeners and prevent further router interaction. Idempotent. */
  dispose(): void {
    if (this.#disposed) return;

    this.#disposed = true;
    // Bump navigationId so any in-flight isCurrent() checks return false,
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

  // ─── Private: assertions ──────────────────────────────────────────────────

  #assertNotDisposed(): void {
    if (this.#disposed) throw new Error('[wayfinder] Router is disposed');
  }

  // ─── Private: effective defs (compiled + hydration overrides) ─────────────

  /**
   * Returns branchDefs merged with any lazy-resolved overrides.
   * The compiled RouteRecord is never mutated.
   */
  #effectiveDefs(record: RouteRecord<TRoutes, TMeta, TComponent>): readonly RouteBranchDef<TMeta, TComponent>[] {
    const state = this.#hydrationCache.get(record);

    if (!state?.overrides.size) return record.branchDefs;

    return record.branchDefs.map((def, i) => {
      const override = state.overrides.get(i);

      return override ? { ...def, ...override } : def;
    });
  }

  // ─── Private: history listener ────────────────────────────────────────────

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

  // ─── Private: error handling ──────────────────────────────────────────────

  #reportError(error: unknown, context: RouterErrorContext): void {
    reportError(error, context, this.#onError);
  }

  #runInBackground(promise: Promise<void>, context: RouterErrorContext): void {
    void promise.catch((error) => {
      this.#reportError(error, context);
    });
  }

  // ─── Private: listener notification ──────────────────────────────────────

  #notifyListeners(): void {
    this.#listeners.forEach((listener) => listener(this.#currentState));
  }

  // ─── Private: navigation guards ───────────────────────────────────────────

  async #runBeforeLeaveBlockers(): Promise<boolean> {
    // Per-route guards first (most specific): leaf → root.
    // Global guards after (least specific), preserving registration order.
    const blockers: BeforeLeaveBlocker[] = [];

    const leafMatch = this.#currentState.matches.at(-1);

    if (leafMatch) {
      const record = this.#routesByName.get(leafMatch.name);

      if (record) {
        const defs = this.#effectiveDefs(record);

        for (let i = defs.length - 1; i >= 0; i--) {
          const { onLeave } = defs[i]!;

          if (onLeave) blockers.push(onLeave);
        }
      }
    }

    blockers.push(...this.#beforeLeaveBlockers);

    for (const blocker of blockers) {
      const allowed = await blocker();

      if (!allowed) return false;
    }

    return true;
  }

  // ─── Private: lazy hydration ──────────────────────────────────────────────

  async #hydrateLazy(record: RouteRecord<TRoutes, TMeta, TComponent>): Promise<void> {
    const hasLazy = record.branchDefs.some((d) => d.lazy != null);

    if (!hasLazy) return;

    let state = this.#hydrationCache.get(record);

    if (state?.done) return;

    if (state?.work) {
      await state.work;

      return;
    }

    state = { done: false, overrides: new Map() };
    this.#hydrationCache.set(record, state);

    const capturedState = state;

    const work = (async (): Promise<void> => {
      type LazyMod = Awaited<ReturnType<NonNullable<RouteBranchDef<TMeta, TComponent>['lazy']>>>;

      // Import all lazy nodes in parallel — all-or-nothing: overrides are committed
      // only after every import succeeds, leaving the record intact on partial failure.
      const lazyEntries = record.branchDefs.map((def, i) => ({ def, i })).filter(({ def }) => def.lazy != null);

      const resolved: Array<{ index: number; mod: LazyMod }> = await Promise.all(
        lazyEntries.map(async ({ def, i }) => ({ index: i, mod: await def.lazy!() })),
      );

      // All imports succeeded — write overrides to the hydration cache.
      for (const { index, mod } of resolved) {
        const override: HydrationOverride<TMeta, TComponent> = {};

        if (mod.handler !== undefined) override.handler = mod.handler;

        if (mod.data !== undefined) override.dataFn = mod.data;

        if (mod.component !== undefined) override.component = mod.component as TComponent;

        if (mod.meta !== undefined) override.meta = mod.meta as TMeta;

        capturedState.overrides.set(index, override);
      }

      capturedState.done = true;
      capturedState.work = undefined;
    })();

    state.work = work;

    try {
      await work;
    } catch (err) {
      // Remove the entry so the next navigation can retry the lazy import.
      this.#hydrationCache.delete(record);
      throw err;
    }
  }

  // ─── Private: data loaders ────────────────────────────────────────────────

  async #runDataLoaders(
    defs: readonly RouteBranchDef<TMeta, TComponent>[],
    context: RouteContext<RouteParams, TRoutes>,
    signal: AbortSignal,
  ): Promise<unknown[]> {
    return Promise.all(
      defs.map((def) => {
        if (!def.dataFn) return undefined;

        const dataFn = def.dataFn as unknown as DataFn<RouteParams, TRoutes>;

        return dataFn({ ...context, signal });
      }),
    );
  }

  // ─── Private: preload result cache ────────────────────────────────────────

  #setPreloadResult(key: string, results: unknown[]): void {
    if (this.#preloadResults.size >= Router.#PRELOAD_MAX) {
      // Map preserves insertion order — delete the oldest entry.
      const oldest = this.#preloadResults.keys().next().value as string;

      this.#preloadResults.delete(oldest);
    }

    this.#preloadResults.set(key, results);
  }

  // ─── Private: URL resolution ──────────────────────────────────────────────

  /** Parse a URL, call #prepareRoute, and follow declarative redirects up to 5 hops. */
  async #resolveUrl(url: string): Promise<PreparedRoute<TRoutes, TMeta, TComponent>> {
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

  async #doPreload(startUrl: string, signal?: AbortSignal): Promise<void> {
    const prepared = await this.#resolveUrl(startUrl);

    if (prepared.type !== 'matched') return;

    const { branch, location, params, record, resolvedQuery } = prepared;
    const defs = this.#effectiveDefs(record);
    const hasData = defs.some((d) => d.dataFn != null);

    if (!hasData) return;

    const effectiveSignal = signal ?? new AbortController().signal;
    const context = createRouteContext<TRoutes>(location, resolvedQuery, params, branch, () => Promise.resolve());
    const results = await this.#runDataLoaders(defs, context, effectiveSignal);

    this.#setPreloadResult(buildPreloadKey(this.#base, record.path, params), results);
  }

  // ─── Private: route preparation ───────────────────────────────────────────

  async #prepareRoute(location: RouteLocation): Promise<PreparedRoute<TRoutes, TMeta, TComponent>> {
    const { params, record } = matchRouteFor(location.pathname, this.#records);

    if (!record) {
      return { location, params, type: 'unmatched' };
    }

    if (record.redirect) {
      return {
        location,
        params,
        redirectTo: resolveTarget(record.redirect, this.#routesByName),
        type: 'redirect',
      };
    }

    let resolvedQuery: ResolvedQueryParams = location.query;

    if (record.coerceSearch) {
      try {
        resolvedQuery = record.coerceSearch(location.query);
      } catch {
        resolvedQuery = location.query;
      }
    }

    await this.#hydrateLazy(record);

    const defs = this.#effectiveDefs(record);

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

  // ─── Private: terminal (data + handler) ───────────────────────────────────

  async #runTerminal(
    record: RouteRecord<TRoutes, TMeta, TComponent>,
    context: RouteContext<RouteParams, TRoutes>,
    location: RouteLocation,
    params: RouteParams,
    initialBranch: RouteMatchBranch<TMeta, TComponent>,
    signal: AbortSignal,
    isCurrent: () => boolean,
  ): Promise<void> {
    if (!isCurrent()) return;

    const defs = this.#effectiveDefs(record);
    const hasData = defs.some((d) => d.dataFn != null);
    let dataResults: unknown[] = defs.map(() => undefined);

    if (hasData) {
      const preloadKey = buildPreloadKey(this.#base, record.path, params);
      const cached = this.#preloadResults.get(preloadKey);

      if (cached) {
        this.#preloadResults.delete(preloadKey);
        dataResults = cached;
      } else {
        // Emit loading state while data is in-flight.
        this.#currentState = createRouteState<TMeta, TComponent>({
          location,
          matches: initialBranch,
          status: 'loading',
        });
        this.#notifyListeners();

        try {
          dataResults = await this.#runDataLoaders(defs, context, signal);
        } catch (error) {
          this.#currentState = createRouteState<TMeta, TComponent>({
            error,
            location,
            matches: buildMatchBranch(defs, params, location.pathname, dataResults),
            status: 'error',
          });
          // Do not call #notifyListeners here — the finally block in #handleRoute does it once.
          throw error;
        }
      }
    }

    if (!isCurrent()) return;

    const finalBranch = buildMatchBranch(defs, params, location.pathname, dataResults);

    this.#currentState = createRouteState<TMeta, TComponent>({ location, matches: finalBranch, status: 'idle' });

    const leaf = defs[defs.length - 1]!;

    if (leaf.handler) {
      const handler = leaf.handler as unknown as RouteHandler<RouteParams, TRoutes>;
      const handlerCtx: HandlerContext<RouteParams, TRoutes> = {
        ...context,
        data: dataResults[dataResults.length - 1],
        matches: finalBranch,
      };

      await handler(handlerCtx);
    }
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

  async #handleRoute(useTransition?: boolean, redirectDepth = 0): Promise<void> {
    this.#abortController?.abort();

    const controller = new AbortController();

    this.#abortController = controller;

    const navId = ++this.#navigationId;
    const prevState = this.#currentState;
    const isCurrent = (): boolean => this.#navigationId === navId;

    const prepared = await this.#prepareRoute(readLocation(this.#base, this.#history));

    if (!isCurrent()) return;

    if (prepared.type === 'redirect') {
      if (redirectDepth >= 5) throw new Error('[wayfinder] Redirect loop detected');

      await this.#navigateToPath(prepared.redirectTo, { replace: true }, redirectDepth + 1, true);

      return;
    }

    if (prepared.type === 'unmatched') {
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

      await executeMiddlewarePipeline(context, record.middleware, async () => {
        committed = true;
        await this.#runTerminal(record, context, location, params, branch, controller.signal, isCurrent);
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
      // Restore #lastHref to the pre-navigation value so the same destination
      // can be retried after a transient failure. The history entry that was
      // pushed is left in place intentionally — back-button navigation still works.
      this.#lastHref = prevLastHref;
      throw err;
    }
  }
}

// PathParams re-export for url() type signature
type PathParams<T extends string> = import('./types').PathParams<T>;

// ─── Public factory ───────────────────────────────────────────────────────────

/**
 * Create a new router instance from a route table.
 *
 * @example
 * const router = createRouter({
 *   routes: {
 *     home: { path: '/', handler: () => renderHome() },
 *     userDetail: { path: '/users/:id', data: fetchUser, handler: renderUser },
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
