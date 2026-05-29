import type {
  AsyncEffectCallback,
  AsyncSubscription,
  CleanupFn,
  DepEntry,
  EffectCallback,
  EffectOptions,
  Scope,
  Subscriber,
  Subscription,
} from './types';

import { StateError } from './error';
import { collectErrors, rethrowWith, runAll, toSubscription } from './helpers';
import { DEFAULT_MAX_ITERATIONS } from './scheduling';
import { getTracking, withTracking } from './tracking';

/**
 * Wraps a core `run` function with a scheduler that coalesces rapid re-runs.
 * The `subscriber` returned here is what gets registered in signal subscriber sets —
 * so notifications call the deferred wrapper, not `run` directly.
 */
const withScheduler = (run: Subscriber, scheduler: EffectOptions['scheduler']): Subscriber => {
  if (scheduler === 'sync' || scheduler === undefined) return run;

  let scheduled = false;

  return (): void => {
    if (scheduled) return;

    scheduled = true;

    const execute = (): void => {
      scheduled = false;
      run();
    };

    if (scheduler === 'microtask') {
      queueMicrotask(execute);
    } else {
      // raf — fall back to queueMicrotask in SSR environments without requestAnimationFrame
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(execute);
      } else {
        queueMicrotask(execute);
      }
    }
  };
};

export const effect = (fn: EffectCallback, options?: EffectOptions): Subscription => {
  const scheduler = options?.scheduler ?? 'sync';
  const maxIterations = options?.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const isTrace = options?.trace ?? false;
  const effectName = options?.name;

  let cleanup: CleanupFn | undefined;
  const subscriptions = new Set<CleanupFn>();
  let isRunning = false;
  let isDirty = false;
  let isDisposed = false;
  // Non-null only when trace mode is active — lazily populated after the first run.
  let prevDeps: DepEntry[] | null = null;

  const teardown = (): void => {
    if (!cleanup && subscriptions.size === 0) return;

    const callbacks = cleanup ? [cleanup, ...subscriptions] : [...subscriptions];

    cleanup = undefined;
    subscriptions.clear();

    runAll(callbacks, 'effect teardown errors');
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

        // Trace: log which sources changed before each re-run (skip first run).
        // prevDeps is non-null iff trace mode is on (depCollector is only assigned when isTrace is true).
        if (prevDeps !== null && prevDeps.length > 0) {
          const changed = prevDeps.filter((d) => d.source.version !== d.version);

          if (changed.length > 0) {
            const label = effectName ?? 'anonymous';

            console.group(`[ripple:trace] "${label}" re-running — changed sources:`);

            for (const dep of changed) {
              console.log(`  ${dep.source.name ?? '(unnamed)'} (v${dep.version} → v${dep.source.version})`);
            }

            console.groupEnd();
          }
        }

        isDirty = false;
        teardown();

        const localCleanups: CleanupFn[] = [];
        const depCollector: DepEntry[] | null = isTrace ? [] : null;
        let returnedCleanup: CleanupFn | void = undefined;

        try {
          returnedCleanup = withTracking(
            { cleanups: localCleanups, depCollector, effect: subscriber, kind: 'effect', subscriptions },
            fn,
          );
        } catch (error) {
          const cleanupErrors = [...collectErrors(subscriptions), ...collectErrors(localCleanups)];

          subscriptions.clear();
          rethrowWith(error, cleanupErrors, 'effect failure with cleanup errors');
        }

        if (depCollector) {
          prevDeps = depCollector;
        }

        // Throws on non-function truthy returns — catches bugs like returning array.push() result
        if (returnedCleanup !== undefined && typeof returnedCleanup !== 'function') {
          throw new StateError(
            'INVALID_CLEANUP',
            `effect() returned ${typeof returnedCleanup} — expected a cleanup function or void.`,
          );
        }

        if (typeof returnedCleanup === 'function') localCleanups.push(returnedCleanup);

        cleanup =
          localCleanups.length > 0
            ? () => {
                runAll(localCleanups, 'effect cleanup errors');
              }
            : undefined;
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

  return toSubscription(() => {
    if (isDisposed) return;

    isDisposed = true;
    teardown();
  });
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
export const effectAsync = (
  fn: AsyncEffectCallback,
  options?: { onError?: (error: unknown) => void },
): AsyncSubscription => {
  let controller: AbortController | null = null;
  let asyncCleanup: CleanupFn | null = null;
  let currentRunPromise: Promise<void> | null = null;

  const onError =
    options?.onError ??
    ((err: unknown) => {
      void Promise.reject(err);
    });

  const syncStop = effect(() => {
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
  });

  const disposeAsync = async (): Promise<void> => {
    const runningPromise = currentRunPromise;

    syncStop();

    if (runningPromise) await runningPromise;
  };

  return Object.assign(syncStop, {
    dispose: syncStop,
    disposeAsync,
    [Symbol.dispose]: syncStop,
  }) as AsyncSubscription;
};

export const onCleanup = (fn: CleanupFn): void => {
  const ctx = getTracking();

  if (ctx === null || ctx.kind === 'computed') {
    throw new StateError('INVALID_CLEANUP', 'onCleanup() must be called from within an active effect or scope.');
  }

  ctx.cleanups.push(fn);
};

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

  const api: Scope = { dispose, run, [Symbol.dispose]: dispose };

  if (setup) run(setup);

  return api;
};
