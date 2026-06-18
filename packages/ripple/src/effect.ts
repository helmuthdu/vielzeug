import type {
  AsyncEffectCallback,
  AsyncSubscription,
  CleanupFn,
  EffectAsyncOptions,
  EffectCallback,
  EffectOptions,
  EqualityFn,
  ReadonlySignal,
  Scope,
  Subscriber,
  Subscription,
  WatchOptions,
} from './types';

import { issue } from './_warn';
import { getDevToolsHook } from './devtools-hook';
import { collectErrors, rethrowWith, runAll, StateError } from './error';
import { DEFAULT_MAX_ITERATIONS } from './scheduling';
import { AsyncSubscriptionImpl, SubscriptionImpl } from './subscription';
import { getTracking, withTracking } from './tracking';

/**
 * Wraps a core `run` function with a scheduler that coalesces rapid re-runs.
 * The `subscriber` returned here is what gets registered in signal subscriber sets —
 * so notifications call the deferred wrapper, not `run` directly.
 *
 * The scheduler identity is stable for the lifetime of the effect.
 * Never replace `subscriber` with a new function after creation — doing so would break
 * the removeEffectSub calls that rely on reference identity.
 */
const withScheduler = (run: Subscriber, scheduler: EffectOptions['scheduler']): Subscriber => {
  if (scheduler === 'sync' || scheduler === undefined) return run;

  if (typeof scheduler === 'function') {
    const customScheduler = scheduler;
    let scheduled = false;

    return (): void => {
      if (scheduled) return;

      scheduled = true;
      customScheduler(() => {
        scheduled = false;
        run();
      });
    };
  }

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
 * ```
 */
export const effect = (fn: EffectCallback, options?: EffectOptions): Subscription => effectCore(fn, options);

const effectCore = (fn: EffectCallback, options?: EffectOptions): Subscription => {
  const scheduler = options?.scheduler ?? 'sync';
  const maxIterations = options?.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const effectName = options?.name;

  // R11: single shared array for cleanups — used directly by onCleanup() via the
  // tracking context, and cleared + run by teardown() on each re-run or dispose.
  // No wrapper closure allocated per run; the array is re-used in place.
  const runCleanups: CleanupFn[] = [];
  const subscriptions = new Set<CleanupFn>();
  let isRunning = false;
  let isDirty = false;
  let isDisposed = false;

  const teardown = (): void => {
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
        if (++iterations > maxIterations) {
          const label = effectName ? ` in "${effectName}"` : '';

          throw new StateError('INFINITE_LOOP', `infinite effect loop (> ${maxIterations} iterations)${label}`);
        }

        isDirty = false;
        teardown();

        getDevToolsHook()?.run?.({ name: effectName });

        let returnedCleanup: CleanupFn | void = undefined;

        try {
          returnedCleanup = withTracking(
            { cleanups: runCleanups, effect: subscriber, kind: 'effect', subscriptions },
            fn,
          );
        } catch (error) {
          const cleanupErrors = [...collectErrors(subscriptions), ...collectErrors(runCleanups)];

          runCleanups.length = 0;
          subscriptions.clear();
          rethrowWith(error, cleanupErrors, 'effect failure with cleanup errors');
        }

        // Throws on non-function truthy returns — catches bugs like returning array.push() result
        if (returnedCleanup !== undefined && typeof returnedCleanup !== 'function') {
          throw new StateError(
            'INVALID_CLEANUP',
            `effect() returned ${typeof returnedCleanup} — expected a cleanup function or void.`,
          );
        }

        // R11: push returned cleanup directly into runCleanups (no wrapper closure).
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

  // Auto-register disposal into the enclosing scope context (withScope / scope.run).
  // This allows withScope(() => { effect(...) }) to own effect lifetimes automatically.
  const ctx = getTracking();

  if (ctx !== null && ctx.kind === 'scope') {
    ctx.cleanups.push(() => sub.dispose());
  }

  return sub;
};

/**
 * Like `effect()`, but the callback is async and receives an AbortSignal that fires when the
 * effect re-runs or is disposed. Read reactive dependencies synchronously before the first
 * `await` to register them as tracked.
 *
 * Returns an {@link AsyncSubscription} — call `disposeAsync()` to await full teardown.
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
 * await stop.disposeAsync();
 * ```
 */
export const effectAsync = (fn: AsyncEffectCallback, options?: EffectAsyncOptions): AsyncSubscription => {
  let controller: AbortController | null = null;
  let asyncCleanup: CleanupFn | null = null;
  let currentRunPromise: Promise<void> | null = null;

  const onError =
    options?.onError ??
    ((err: unknown) => {
      issue('unhandled effectAsync error:', err);
    });

  const syncStop = effect(
    () => {
      controller?.abort();
      asyncCleanup?.();
      asyncCleanup = null;

      controller = new AbortController();

      const { signal } = controller;

      currentRunPromise = (async () => {
        try {
          const returned = await fn(signal);

          if (!signal.aborted && typeof returned === 'function') {
            asyncCleanup = returned;
          }
        } catch (err) {
          if (!signal.aborted) onError(err);
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

  return new AsyncSubscriptionImpl(syncStop, async () => {
    const runningPromise = currentRunPromise;

    if (runningPromise) await runningPromise;
  });
};

export const onCleanup = (fn: CleanupFn): void => {
  const ctx = getTracking();

  if (ctx === null || ctx.kind === 'computed') {
    throw new StateError('INVALID_CLEANUP', 'onCleanup() must be called from within an active effect or scope.');
  }

  ctx.cleanups.push(fn);
};

/**
 * Creates a lifecycle scope that collects `onCleanup()` registrations and runs
 * them in reverse order when `dispose()` is called.
 *
 * The optional `setup` callback is run immediately inside the scope so that
 * `onCleanup()` calls in setup are captured without requiring a separate
 * `scope.run(setup)` call.
 *
 * @example
 * ```ts
 * const s = scope(() => {
 *   const sub = effect(() => { ... });
 *   onCleanup(() => sub.dispose());
 * });
 *
 * // later:
 * s.dispose(); // or: using s = scope(...)
 * ```
 */
export const scope = (setup?: () => void): Scope => {
  const cleanups: CleanupFn[] = [];
  let disposed = false;

  const run = <T>(fn: () => T): T => {
    if (disposed) throw new StateError('DISPOSED_SCOPE', 'Cannot run inside a disposed scope.');

    return withTracking({ cleanups, kind: 'scope' }, fn);
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;

    runAll([...cleanups].reverse(), 'scope cleanup errors');
    cleanups.length = 0;
  };

  const api: Scope = {
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

/**
 * @deprecated Use `scope()` + `s.run()` directly instead:
 * ```ts
 * const s = scope();
 * await s.run(async () => {
 *   onCleanup(() => resourceA.close()); // ✓ before any await — captured
 *   const db = await openDB();
 * });
 * ```
 *
 * **Important:** `onCleanup()` can only be called synchronously — before the
 * first `await` in the setup function. Reactive tracking does not survive
 * `await` boundaries; any `onCleanup()` calls after an `await` will throw
 * `INVALID_CLEANUP`.
 */
export const asyncScope = async (setup: () => Promise<void>): Promise<Scope> => {
  const s = scope();

  await s.run(setup);

  return s;
};

/**
 * @deprecated Use `scope(setup)` directly — `withScope(fn)` is identical to `scope(fn)`.
 *
 * @example
 * ```ts
 * // Before
 * const s = withScope(() => {
 *   effect(() => { document.title = count.value.toString(); });
 * });
 *
 * // After
 * const s = scope(() => {
 *   effect(() => { document.title = count.value.toString(); });
 * });
 * ```
 */
export const withScope = (setup: () => void): Scope => scope(setup);

// ── watch() ───────────────────────────────────────────────────────────────────

/**
 * Observes a reactive source and calls `callback` whenever its value changes.
 * Does NOT invoke `callback` on creation (unless `immediate: true` is passed).
 * Receives the new value and the previous value on each change.
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
export const watch = <T>(
  source: ReadonlySignal<T> | (() => T),
  callback: (value: T, prev: T | undefined) => CleanupFn | void,
  options?: WatchOptions<T>,
): Subscription => {
  const read: () => T = typeof source === 'function' ? source : () => source.value;
  const equals: EqualityFn<T> = options?.equals ?? Object.is;
  const immediate = options?.immediate ?? false;
  const name = options?.name;

  let prev: T | undefined = undefined;
  let firstRun = true;
  let pendingCleanup: CleanupFn | undefined;

  const invokeCallback = (next: T, p: T | undefined): void => {
    pendingCleanup?.();
    pendingCleanup = undefined;

    const returned = withTracking(null, () => callback(next, p));

    if (returned !== undefined && typeof returned !== 'function') {
      throw new StateError(
        'INVALID_CLEANUP',
        `watch() callback returned ${typeof returned} — expected a cleanup function or void.`,
      );
    }

    if (typeof returned === 'function') pendingCleanup = returned;
  };

  return effectCore(
    (): CleanupFn => {
      const next = read();

      if (firstRun) {
        firstRun = false;

        if (immediate) invokeCallback(next, undefined);

        prev = next;
      } else {
        if (!equals(prev as T, next)) {
          invokeCallback(next, prev);
          prev = next;
        }
      }

      return () => {
        pendingCleanup?.();
        pendingCleanup = undefined;
      };
    },
    { name },
  );
};
