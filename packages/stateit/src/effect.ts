import { _DEV, _maxEffectIterations, _withCtx, scope } from './runtime';
import { type CleanupFn, type EffectCallback, type Subscription } from './types';

/** Options for the `effect()` primitive. */
export type EffectOptions = {
  /**
   * Maximum re-entrant iterations before throwing to prevent infinite loops.
   * Overrides the global value set via `configureStateit` for this specific effect.
   */
  maxIterations?: number;
  /**
   * Called when the effect function throws. When provided, the effect is automatically
   * disposed after the first error — it won't re-run on subsequent dependency changes.
   */
  onError?: (error: unknown) => void;
};

/** Runs fn immediately and re-runs it whenever any Signal read inside it changes. Returns a dispose handle. */
export const effect = (fn: EffectCallback, options?: EffectOptions): Subscription => {
  let cleanup: CleanupFn | undefined;
  const deps = new Set<CleanupFn>();
  let running = false;
  let dirty = false;
  let disposed = false;
  const maxIter = options?.maxIterations ?? _maxEffectIterations;

  /** Tears down the current run: calls cleanup and unsubscribes all deps. */
  const teardown = (): void => {
    cleanup?.();
    cleanup = undefined;
    for (const unsub of deps) unsub();
    deps.clear();
  };

  /** Runs a single iteration: tears down previous deps/cleanup, re-executes fn, registers fresh deps.
   *  Returns true if onError handled a throw (caller should break the loop). */
  const runIteration = (): boolean => {
    dirty = false;
    teardown();

    const cleanups: CleanupFn[] = [];
    let thrownError: unknown;
    let threw = false;

    try {
      _withCtx(runner, deps, cleanups, () => {
        const result = fn();

        if (typeof result === 'function') cleanups.push(result);
      });
    } catch (e) {
      if (options?.onError) {
        threw = true;
        thrownError = e;
      } else throw e;
    }

    cleanup =
      cleanups.length > 0
        ? () => {
            for (const c of cleanups) c();
          }
        : undefined;

    if (threw) {
      teardown(); // flush onCleanup registrations from the throwing run
      options!.onError!(thrownError);
      disposed = true;
    }

    return threw;
  };

  const runner: EffectCallback = () => {
    if (disposed || running) {
      if (running) dirty = true;

      return;
    }

    running = true;

    try {
      let iterations = 0;

      do {
        if (++iterations > maxIter)
          throw new Error(`[stateit] effect: possible infinite reactive loop (> ${maxIter} iterations)`);

        if (runIteration()) break;
      } while (dirty);
    } finally {
      running = false;
    }
  };

  runner();

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    teardown();
  };

  return Object.assign(dispose, { dispose, [Symbol.dispose]: dispose }) as Subscription;
};

/** Runs fn without registering any reactive dependencies. */
export const untrack = <T>(fn: () => T): T => _withCtx(null, null, null, fn);

/**
 * Registers a cleanup function within the currently running effect.
 * Called before the effect re-runs and on final dispose.
 * Allows nested helpers to register teardown without needing the effect's return value.
 *
 * @example
 * effect(() => {
 *   const id = setInterval(() => { ... }, 1000);
 *   onCleanup(() => clearInterval(id));
 * });
 */
export const onCleanup = (fn: CleanupFn): void => {
  if (_DEV && scope.cleanups === null) {
    console.warn('[stateit] onCleanup() called outside of an active effect — the cleanup will never run.');
  }

  scope.cleanups?.push(fn);
};
