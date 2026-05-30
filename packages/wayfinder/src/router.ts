import type {
  BeforeLeaveBlocker,
  BeforeLeaveOptions,
  DataContext,
  DataFn,
  HandlerContext,
  HistoryDriver,
  IsActiveOptions,
  Middleware,
  NavigateOptions,
  NamedNavigationTarget,
  PathParams,
  QueryParams,
  RawNavigationTarget,
  ResolvedQueryParams,
  RouteBranchDef,
  RouteContext,
  RouteHandler,
  RouteLocation,
  RouteMatchBranch,
  RouteName,
  RouteParams,
  RoutePathByName,
  RouteRecord,
  RouteState,
  RouteTable,
  RouterErrorContext,
  RouterOptions,
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
import { type RegisteredBlocker, runLeaveBlockers } from './guards';
import { createBrowserHistory } from './history';
import { createHydrationManager } from './hydration';
import { buildPreloadKey, readLocation, stripBase } from './path';
import { buildUrl, joinPaths, matchRouteFor, matchesPrefix, normalizePath, parseQuery } from './path';
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
): string {
  if ('path' in target) return target.path;

  const route = getRouteByName(target.name, routesByName);
  const path = buildUrl('/', route.path, target.params, target.query);

  return target.hash ? `${path}#${target.hash}` : path;
}

// ─── Internal types ───────────────────────────────────────────────────────────

type PreparedRoute<TMeta, TComponent> =
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

/**
 * Drain an async generator to completion, returning the generator's `return` value
 * (or the last yielded value when `return` is `undefined`).
 * Cleans up the generator when the abort signal fires.
 */
async function drainGenerator(gen: AsyncGenerator<unknown, unknown>, signal: AbortSignal): Promise<unknown> {
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

// ─── Router class ─────────────────────────────────────────────────────────────

class Router<
  TRoutes extends RouteTable,
  TMeta = unknown,
  TComponent = unknown,
  TLocals extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly #base: string;
  readonly #history: HistoryDriver;
  readonly #records: readonly RouteRecord<TMeta, TComponent>[];
  readonly #routesByName: ReadonlyMap<string, RouteRecord<TMeta, TComponent>>;
  readonly #scroll?: RouterOptions<TRoutes, TMeta, TComponent, TLocals>['scroll'];
  readonly #useViewTransition: boolean;
  readonly #onError?: RouterOptions<TRoutes, TMeta, TComponent, TLocals>['onError'];

  // Mutable navigation state
  #abortController: AbortController | null = null;
  readonly #beforeLeaveBlockers = new Set<RegisteredBlocker>();
  #currentState: RouteState<TMeta, TComponent>;
  #disposed = false;
  #lastHref = '/';
  readonly #listeners = new Set<(state: RouteState<TMeta, TComponent>) => void>();
  #navigationId = 0;

  // Sub-managers
  readonly #hydration: ReturnType<typeof createHydrationManager<TMeta, TComponent>>;
  readonly #preload: ReturnType<typeof createPreloadManager>;

  readonly #unlistenHistory: () => void;

  constructor(options: RouterOptions<TRoutes, TMeta, TComponent, TLocals>) {
    const compiled = compileRoutes(options);

    this.#base = normalizePath(options.base ?? '/');
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
   * @param signal - Optional abort signal to cancel in-flight data loaders.
   */
  async match(url: string, signal?: AbortSignal): Promise<RouteState<TMeta, TComponent> | null> {
    const prepared = await this.#resolveUrl(url);

    if (prepared.type !== 'matched') return null;

    const { location, params, record, resolvedQuery } = prepared;
    const defs = this.#hydration.effectiveDefs(record);
    const hasData = defs.some((d) => d.dataFn != null);
    let dataResults: unknown[] = defs.map(() => undefined);
    let error: unknown;
    let status: 'error' | 'idle' = 'idle';

    if (hasData) {
      const effectiveSignal = signal ?? new AbortController().signal;
      const branch = buildMatchBranch(defs, params, location.pathname, dataResults);
      const context = createRouteContext<TRoutes>(location, resolvedQuery, params, branch, () => Promise.resolve());

      try {
        dataResults = await this.#runDataLoaders(defs, context, effectiveSignal);
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

    const inflight = this.#preload.getInflight(cacheKey);

    if (inflight) return inflight;

    const controller = new AbortController();
    const work = this.#doPreload(cacheKey, controller.signal).finally(() => {
      this.#preload.untrack(cacheKey);
    });

    this.#preload.track(cacheKey, work);

    try {
      return await work;
    } catch (error) {
      this.#reportError(error, { source: 'preload' });
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
    const activeMatchNames = this.#currentState.matches.map((m) => m.name);
    const allowed = await runLeaveBlockers(this.#beforeLeaveBlockers, activeMatchNames);

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

  // ─── Private: data loaders ────────────────────────────────────────────────

  /**
   * Run all data loaders and return their results.
   * Async generators are fully drained (consume-once for non-streaming contexts such as
   * `match()` and `preload()`). The generator's return value (or last yielded value when
   * no explicit return) is used as the settled data.
   */
  async #runDataLoaders(
    defs: readonly RouteBranchDef<TMeta, TComponent>[],
    context: RouteContext<RouteParams, TRoutes>,
    signal: AbortSignal,
  ): Promise<unknown[]> {
    return Promise.all(
      defs.map(async (def) => {
        if (!def.dataFn) return undefined;

        const dataFn = def.dataFn as unknown as DataFn<RouteParams, TRoutes>;
        const result = dataFn({ ...context, signal } as DataContext<RouteParams, TRoutes>);

        if (isAsyncGenerator(result)) {
          return drainGenerator(result, signal);
        }

        return result as Promise<unknown>;
      }),
    );
  }

  // ─── Private: URL resolution ──────────────────────────────────────────────

  /** Parse a URL, call #prepareRoute, and follow declarative redirects up to 5 hops. */
  async #resolveUrl(url: string): Promise<PreparedRoute<TMeta, TComponent>> {
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
    const results = await this.#runDataLoaders(defs, context, effectiveSignal);

    this.#preload.set(buildPreloadKey(this.#base, record.path, params), results);
  }

  // ─── Private: route preparation ───────────────────────────────────────────

  async #prepareRoute(location: RouteLocation): Promise<PreparedRoute<TMeta, TComponent>> {
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

  // ─── Private: data loading ────────────────────────────────────────────────

  /**
   * R6: Extracted data loader executor. R9: per-def onError boundary — each
   * dataFn error is caught and handed to that def's `onError` if present, before
   * propagating up.
   */
  async #executeDataLoaders(
    defs: readonly RouteBranchDef<TMeta, TComponent>[],
    context: RouteContext<RouteParams, TRoutes>,
    signal: AbortSignal,
    isCurrent: () => boolean,
    location: RouteLocation,
    params: RouteParams,
  ): Promise<unknown[]> {
    // Single pass: invoke all dataFns, collect generators vs. promises.
    const rawResults: Array<AsyncGenerator<unknown, unknown> | unknown> = defs.map((def) => {
      if (!def.dataFn) return undefined;

      const dataFn = def.dataFn as unknown as DataFn<RouteParams, TRoutes>;

      return dataFn({ ...context, signal } as DataContext<RouteParams, TRoutes>);
    });

    // Await non-streaming results, applying per-def onError (R9).
    const streamingIndices: number[] = [];
    const awaitableResults: unknown[] = await Promise.all(
      rawResults.map(async (raw, i) => {
        if (isAsyncGenerator(raw)) {
          streamingIndices.push(i);

          return undefined; // placeholder — resolved during streaming phase
        }

        if (raw === undefined) return undefined;

        try {
          return await (raw as Promise<unknown>);
        } catch (err) {
          const def = defs[i]!;

          if (def.onError) return await def.onError(err, { ...context, signal } as unknown as DataContext);

          throw err;
        }
      }),
    );

    if (streamingIndices.length === 0) return awaitableResults;

    // Streaming phase: emit partial updates on each yield.
    const streamingData: unknown[] = [...awaitableResults];

    const onPartial = (value: unknown, idx: number): void => {
      if (!isCurrent()) return;

      streamingData[idx] = value;
      this.#currentState = createRouteState<TMeta, TComponent>({
        location,
        matches: buildMatchBranch(defs, params, location.pathname, streamingData),
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

  // ─── Private: terminal (data + handler) ───────────────────────────────────

  async #runTerminal(
    record: RouteRecord<TMeta, TComponent>,
    context: RouteContext<RouteParams, TRoutes>,
    location: RouteLocation,
    params: RouteParams,
    initialBranch: RouteMatchBranch<TMeta, TComponent>,
    signal: AbortSignal,
    isCurrent: () => boolean,
  ): Promise<void> {
    if (!isCurrent()) return;

    const defs = this.#hydration.effectiveDefs(record);
    const hasData = defs.some((d) => d.dataFn != null);
    let dataResults: unknown[] = defs.map(() => undefined);

    if (hasData) {
      const preloadKey = buildPreloadKey(this.#base, record.path, params);
      const cached = this.#preload.consume(preloadKey);

      if (cached) {
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
          dataResults = await this.#executeDataLoaders(defs, context, signal, isCurrent, location, params);
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

      await executeMiddlewarePipeline(context, record.middleware as unknown as Middleware<TRoutes>[], async () => {
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
      const activeMatchNames = this.#currentState.matches.map((m) => m.name);
      const allowed = await runLeaveBlockers(this.#beforeLeaveBlockers, activeMatchNames);

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
export function createRouter<
  const TRoutes extends RouteTable,
  TMeta = unknown,
  TComponent = unknown,
  TLocals extends Record<string, unknown> = Record<string, unknown>,
>(options: RouterOptions<TRoutes, TMeta, TComponent, TLocals>): Router<TRoutes, TMeta, TComponent, TLocals> {
  return new Router(options);
}

// Export the Router type (not the constructor value) for type annotations.
export type { Router };
