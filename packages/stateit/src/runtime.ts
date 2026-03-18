import type { CleanupFn, EffectCallback } from './types';

/** @internal True outside of production builds; gates dev-only warnings. */
export const _DEV = import.meta.env.DEV;

export const _UNINITIALIZED = Symbol('stateit.uninitialized');

/** @internal Active reactive tracking scope — null outside any effect/computed. */
export const scope = {
  cleanups: null as CleanupFn[] | null,
  deps: null as Set<CleanupFn> | null,
  effect: null as EffectCallback | null,
};

/** @internal Deferred notification queue — active only during batch(). */
export const queue = {
  depth: 0,
  pending: new Set<EffectCallback>(),
};

export let _maxEffectIterations = 100;

/**
 * Configures global stateit behaviour.
 * @example configureStateit({ maxEffectIterations: 200 });
 */
export const configureStateit = (opts: { maxEffectIterations?: number }): void => {
  if (opts.maxEffectIterations !== undefined) _maxEffectIterations = opts.maxEffectIterations;
};

/**
 * Resets the shared reactive context. Use in test setup/teardown to prevent state
 * leaks between tests when a batch or effect throws without being fully cleaned up.
 */
export const _resetContextForTesting = (): void => {
  queue.depth = 0;
  scope.deps = null;
  scope.effect = null;
  scope.cleanups = null;
  queue.pending.clear();
};

/** @internal Base reactive node: manages a subscriber set and batch-aware notification. */
export class ReactiveNode {
  #subscribers = new Set<EffectCallback>();

  /** Register the current tracking scope as a subscriber and store an unsubscribe
   *  function in scope.deps for automatic cleanup when the effect re-runs. */
  protected _track(): void {
    if (scope.deps !== null && scope.effect !== null) {
      const fn = scope.effect;

      this.#subscribers.add(fn);
      scope.deps.add(() => this.#subscribers.delete(fn));
    }
  }

  /** Notify all subscribers. Respects batch queue depth. */
  protected _notify(): void {
    if (this.#subscribers.size === 0) return;

    if (queue.depth > 0) {
      for (const fn of this.#subscribers) queue.pending.add(fn);

      return;
    }

    const errors: unknown[] = [];

    for (const fn of [...this.#subscribers]) {
      try {
        fn();
      } catch (e) {
        errors.push(e);
      }
    }

    if (errors.length) {
      throw errors.length === 1 ? errors[0] : new AggregateError(errors, '[stateit] multiple subscriber errors');
    }
  }
}

/** @internal Save scope fields, swap to new tracking context, call fn, restore. */
export const _withCtx = <T>(
  eff: EffectCallback | null,
  deps: Set<CleanupFn> | null,
  cleanups: CleanupFn[] | null,
  fn: () => T,
): T => {
  const pe = scope.effect;
  const pd = scope.deps;
  const pc = scope.cleanups;

  scope.effect = eff;
  scope.deps = deps;
  scope.cleanups = cleanups;

  try {
    return fn();
  } finally {
    scope.effect = pe;
    scope.deps = pd;
    scope.cleanups = pc;
  }
};
