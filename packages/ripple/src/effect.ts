import type { ReactiveBase } from './reactive-base';
import type {
  AsyncEffectCallback,
  AsyncSubscription,
  CleanupFn,
  DepInfo,
  EffectAsyncOptions,
  EffectCallback,
  EffectHandle,
  EffectOptions,
  EqualityFn,
  Readable,
  Scope,
  Subscriber,
  Subscription,
  WatchOptions,
} from './types';

import { getDevToolsHook } from './devtools-hook';
import { collectErrors, rethrowWith, runAll, StateError } from './errors';
import { DEFAULT_MAX_ITERATIONS } from './scheduling';
import { AsyncSubscriptionImpl, SubscriptionImpl } from './subscription';
import { IS_COMPUTED } from './symbols';
import { getScopeCleanups, getTracking, withScopeCleanups, withTracking } from './tracking';

/**
 * Wraps a core `run` function with a microtask-based scheduler that coalesces rapid re-runs.
 * The `subscriber` returned here is what gets registered in signal subscriber sets —
 * so notifications call the deferred wrapper, not `run` directly.
 *
 * The scheduler identity is stable for the lifetime of the effect.
 * Never replace `subscriber` with a new function after creation — doing so would break
 * the removeEffectSub calls that rely on reference identity.
 */
const withScheduler = (run: Subscriber, scheduler: EffectOptions['scheduler']): Subscriber => {
  if (scheduler === 'sync' || scheduler === undefined) return run;

  // 'microtask'
  let scheduled = false;

  return (): void => {
    if (scheduled) return;

    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      run();
    });
  };
};

/**
 * Creates a reactive side-effect.
 * Runs immediately, re-runs whenever tracked dependencies change.
 * The callback may return a cleanup function that runs before the next re-run and on dispose.
 *
 * @example
 * ```ts
 * const stop = effect(() => {
 *   document.title = count.value.toString();
 *   return () => { document.title = ''; }; // optional cleanup
 * });
 *
 * stop.dispose(); // or: using stop = effect(...)
 * console.log(stop.getDependencies()); // reactive graph introspection
 * ```
 */
export const effect = (fn: EffectCallback, options?: EffectOptions): EffectHandle => {
  const scheduler = options?.scheduler ?? 'sync';
  const effectName = options?.name;

  const runCleanups: CleanupFn[] = [];
  const subscriptions = new Set<CleanupFn>();
  const currentDeps = new Map<ReactiveBase<unknown>, number>();
  let isRunning = false;
  let isDirty = false;
  let isDisposed = false;

  const teardown = (): void => {
    currentDeps.clear();

    if (runCleanups.length === 0 && subscriptions.size === 0) return;

    const toRun = [...runCleanups, ...subscriptions];

    runCleanups.length = 0;
    subscriptions.clear();

    runAll(toRun, 'effect teardown errors');
  };

  // The inner do-while handles self-cascade: when the effect body writes to a signal it reads,
  // the recursive flush sets isDirty via the isRunning guard.
  const run: Subscriber = (): void => {
    if (isDisposed) return;

    if (isRunning) {
      isDirty = true;

      return;
    }

    isRunning = true;

    try {
      let iterations = 0;

      do {
        if (++iterations > DEFAULT_MAX_ITERATIONS) {
          const label = effectName ? ` in "${effectName}"` : '';

          throw new StateError(
            'INFINITE_LOOP',
            `infinite effect loop (> ${DEFAULT_MAX_ITERATIONS} iterations)${label}`,
          );
        }

        isDirty = false;
        teardown();

        getDevToolsHook()?.run?.({ name: effectName });

        let returnedCleanup: CleanupFn | void = undefined;

        try {
          returnedCleanup = withTracking(
            { cleanups: runCleanups, deps: currentDeps, effect: subscriber, kind: 'effect', subscriptions },
            fn,
          );
        } catch (error) {
          const cleanupErrors = [...collectErrors(subscriptions), ...collectErrors(runCleanups)];

          runCleanups.length = 0;
          subscriptions.clear();
          rethrowWith(error, cleanupErrors, 'effect failure with cleanup errors');
        }

        if (returnedCleanup !== undefined && typeof returnedCleanup !== 'function') {
          throw new StateError(
            'INVALID_CLEANUP',
            `effect() returned ${typeof returnedCleanup} — expected a cleanup function or void.`,
          );
        }

        if (typeof returnedCleanup === 'function') runCleanups.push(returnedCleanup);
      } while (isDirty && !isDisposed);
    } finally {
      isRunning = false;
    }
  };

  // subscriber is what gets registered in signal subscriber Sets.
  // For 'sync' it is the same as run; for deferred schedulers it's the debouncing wrapper.
  const subscriber = withScheduler(run, scheduler);

  // Always run synchronously on creation to establish initial tracking.
  run();

  const sub = new SubscriptionImpl(() => {
    if (isDisposed) return;

    isDisposed = true;
    teardown();
    getDevToolsHook()?.dispose?.({ kind: 'effect', name: effectName });
  });

  // Auto-register disposal into the enclosing scope (if any).
  // Uses the separate scope stack — orthogonal to the effect/computed tracking context.
  getScopeCleanups()?.push(() => sub.dispose());

  const handle: EffectHandle = {
    dispose: () => sub.dispose(),
    get disposed() {
      return sub.disposed;
    },
    getDependencies(): ReadonlyArray<DepInfo> {
      return [...currentDeps.keys()].map((src) => ({
        kind: IS_COMPUTED in (src as object) ? 'computed' : 'signal',
        name: src.name,
      }));
    },
    [Symbol.dispose]() {
      sub.dispose();
    },
  };

  return handle;
};

/**
 * Like `effect()`, but the callback is async and receives an AbortSignal that fires when the
 * effect re-runs or is disposed. Read reactive dependencies synchronously before the first
 * `await` to register them as tracked.
 *
 * Returns an {@link AsyncSubscription} — call `await stop[Symbol.asyncDispose]()` to await
 * full teardown, or `stop.run()` to await just the current in-flight run.
 *
 * @example
 * ```ts
 * const userId = signal('u1');
 * const stop = effectAsync(async (signal) => {
 *   const id = userId.value;            // sync dep — tracked
 *   const data = await fetchUser(id, { signal }); // aborted automatically if id changes
 *   renderUser(data);
 * });
 *
 * await stop[Symbol.asyncDispose]();
 * ```
 */
export const effectAsync = (fn: AsyncEffectCallback, options?: EffectAsyncOptions): AsyncSubscription => {
  let controller: AbortController | null = null;
  let asyncCleanup: CleanupFn | null = null;
  let currentRunPromise: Promise<void> | null = null;

  const onError =
    options?.onError ??
    ((err: unknown) => {
      queueMicrotask(() => {
        throw err;
      });
    });

  const syncStop = effect(
    () => {
      controller?.abort();
      asyncCleanup?.();
      asyncCleanup = null;

      controller = new AbortController();

      const { signal } = controller;
      const runOwner = scope(); // per-run owner scope for async body resources

      let theRun!: Promise<void>;

      currentRunPromise = theRun = (async () => {
        try {
          const returned = await fn(signal, runOwner);

          if (typeof returned === 'function') {
            if (signal.aborted) {
              // Aborted while async fn was running — run cleanup immediately.
              returned();
            } else {
              asyncCleanup = returned;
            }
          }
        } catch (err) {
          if (!signal.aborted) onError(err);
        } finally {
          runOwner.dispose();

          if (currentRunPromise === theRun) currentRunPromise = null;
        }
      })();

      return () => {
        controller?.abort();
        asyncCleanup?.();
        asyncCleanup = null;
      };
    },
    { name: options?.name },
  );

  return new AsyncSubscriptionImpl(
    syncStop,
    async () => {
      const runningPromise = currentRunPromise;

      if (runningPromise) await runningPromise;
    },
    () => currentRunPromise,
  );
};

export const onCleanup = (fn: CleanupFn): void => {
  const ctx = getTracking();

  if (ctx?.kind === 'effect') {
    ctx.cleanups.push(fn);

    return;
  }

  const scopeCleanups = getScopeCleanups();

  if (scopeCleanups !== null) {
    scopeCleanups.push(fn);

    return;
  }

  throw new StateError('INVALID_CLEANUP', 'onCleanup() must be called from within an active effect or scope.');
};

/**
 * Creates a lifecycle scope that collects `onCleanup()` registrations and runs
 * them in reverse order when `dispose()` is called.
 *
 * The optional `setup` callback is run immediately inside the scope so that
 * `onCleanup()` calls in setup are captured without requiring a separate
 * `scope.run(setup)` call.
 *
 * Use `scope.add(fn)` to explicitly register a cleanup into this scope from
 * anywhere — including from inside an effect body where `onCleanup()` would otherwise
 * go to the effect's own cleanup queue.
 *
 * @example
 * ```ts
 * const s = scope(() => {
 *   onCleanup(() => expensiveCleanup()); // captured by scope
 * });
 *
 * const stop = effect(() => {
 *   void count.value;
 *   s.add(() => doWork()); // explicit: goes to scope, not effect
 *   onCleanup(() => cheapCleanup()); // goes to effect
 * });
 *
 * // later:
 * s.dispose(); // or: using s = scope(...)
 * ```
 */
export const scope = (setup?: () => void): Scope => {
  const cleanups: CleanupFn[] = [];
  let disposed = false;

  const scopeOnCleanup = (fn: CleanupFn): void => {
    if (disposed) throw new StateError('DISPOSED_SCOPE', 'Cannot register cleanup on a disposed scope.');

    cleanups.push(fn);
  };

  const run = <T>(fn: () => T): T => {
    if (disposed) throw new StateError('DISPOSED_SCOPE', 'Cannot run inside a disposed scope.');

    return withScopeCleanups(cleanups, fn);
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;

    runAll([...cleanups].reverse(), 'scope cleanup errors');
    cleanups.length = 0;
  };

  const api: Scope = {
    add: scopeOnCleanup,
    dispose,
    get disposed() {
      return disposed;
    },
    run,
    [Symbol.dispose]: dispose,
  };

  if (setup) run(setup);

  return api;
};

// ── watch() ───────────────────────────────────────────────────────────────────

/**
 * Observes a reactive source and calls `callback` whenever its value changes.
 * Does NOT invoke `callback` on creation (unless `immediate: true` is passed).
 *
 * When called without `immediate`, `prev` is always `T` — the previous value.
 * When `immediate: true` is passed, `prev` is `T | undefined` on the first call.
 *
 * @example
 * ```ts
 * const stop = watch(count, (next, prev) => {
 *   console.log(`count changed: ${prev} → ${next}`);
 * });
 *
 * stop.dispose();
 * ```
 */
export function watch<T>(
  source: Readable<T>,
  callback: (value: T, prev: T) => CleanupFn | void,
  options?: WatchOptions<T>,
): Subscription;
export function watch<T>(
  source: Readable<T>,
  callback: (value: T, prev: T | undefined) => CleanupFn | void,
  options: WatchOptions<T> & { immediate: true },
): Subscription;
export function watch<T>(
  source: Readable<T>,
  callback: (value: T, prev: T | undefined) => CleanupFn | void,
  options?: WatchOptions<T>,
): Subscription {
  const equals: EqualityFn<T> = options?.equals ?? Object.is;
  let prev: T = source.peek();
  let pendingCleanup: CleanupFn | undefined;
  const invokeCallback = (next: T, p: T | undefined): void => {
    pendingCleanup?.();
    pendingCleanup = undefined;

    const returned = callback(next, p);

    if (returned !== undefined && typeof returned !== 'function') {
      throw new StateError(
        'INVALID_CLEANUP',
        `watch() callback returned ${typeof returned} — expected a cleanup function or void.`,
      );
    }

    if (typeof returned === 'function') pendingCleanup = returned;
  };

  // Declared before innerSub so both the subscriber closure and the immediate path
  // can call watchSub.dispose() when once:true. Subscribers always fire asynchronously
  // so watchSub is guaranteed to be assigned before the closure executes.
  // eslint-disable-next-line prefer-const -- forward reference: innerSub subscriber closes over watchSub; both are assigned synchronously before any subscriber fires
  let watchSub!: SubscriptionImpl;

  const innerSub = source.subscribe(() => {
    const next = source.peek();

    if (!equals(prev, next)) {
      invokeCallback(next, prev);
      prev = next;

      if (options?.once) watchSub.dispose();
    }
  });

  watchSub = new SubscriptionImpl(() => {
    pendingCleanup?.();
    pendingCleanup = undefined;
    innerSub.dispose();
  });

  if (options?.immediate) {
    invokeCallback(prev, undefined);

    if (options.once) watchSub.dispose();
  }

  // Auto-register disposal into the enclosing scope (if any) — matches effect() behaviour.
  getScopeCleanups()?.push(() => watchSub.dispose());

  return watchSub;
}
