// === TYPES ===
export type CleanupFn = () => void;
export type EffectCallback = () => CleanupFn | void;
export type EqualityFn<T> = (a: T, b: T) => boolean;
export type ReactiveOptions<T> = { equals?: EqualityFn<T> };

export interface Subscription {
  (): void;
  dispose(): void;
  [Symbol.dispose](): void;
}

export interface ReadonlySignal<T> {
  readonly value: T;
}

export interface Signal<T> extends ReadonlySignal<T> {
  value: T;
}

export interface ComputedSignal<T> extends ReadonlySignal<T> {
  dispose(): void;
  [Symbol.dispose](): void;
}

export type EffectOptions = {
  maxIterations?: number;
};

export type WatchOptions<T> = {
  equals?: EqualityFn<T>;
  immediate?: boolean;
  once?: boolean;
};

export interface Store<T extends object> extends ReadonlySignal<T> {
  patch(partial: Partial<T>): void;
  update(fn: (state: T) => T): void;
  reset(): void;
}

export interface Scope {
  readonly run: <T>(fn: () => T) => T;
  readonly dispose: () => void;
  readonly [Symbol.dispose]: () => void;
}

// === CONSTANTS ===
const DEFAULT_MAX_ITERATIONS = 100;
const IS_SIGNAL = Symbol('stateit.is-signal');

// === HELPERS ===
const toSubscription = (dispose: () => void): Subscription =>
  Object.assign(dispose, { dispose, [Symbol.dispose]: dispose }) as Subscription;

const ensureObject = (value: unknown, message: string): void => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(message);
  }
};

// Identifies computed.onDepChange callbacks for routing into the dedicated computed subscriber queue.
const computedHandlers = new WeakSet<EffectCallback>();

// === UNIFIED ERROR HANDLING ===
const runAll = (items: Iterable<() => void>, context: string): void => {
  const errors: unknown[] = [];

  for (const fn of items) {
    try {
      fn();
    } catch (e) {
      errors.push(e);
    }
  }

  if (errors.length === 1) throw errors[0];

  if (errors.length > 1) {
    throw new AggregateError(errors, `[stateit] ${context}`);
  }
};

// === GLOBAL REACTIVE GRAPH ===
let currentEffect: EffectCallback | null = null;
let currentDeps: Set<CleanupFn> | null = null;
let currentCleanups: CleanupFn[] | null = null;

const withScope = <T>(
  effect: EffectCallback | null,
  deps: Set<CleanupFn> | null,
  cleanups: CleanupFn[] | null,
  fn: () => T,
): T => {
  const prevEffect = currentEffect;
  const prevDeps = currentDeps;
  const prevCleanups = currentCleanups;

  currentEffect = effect;
  currentDeps = deps;
  currentCleanups = cleanups;

  try {
    return fn();
  } finally {
    currentEffect = prevEffect;
    currentDeps = prevDeps;
    currentCleanups = prevCleanups;
  }
};

// === BATCH QUEUE ===
let batchDepth = 0;
const batchComputedQueue = new Set<EffectCallback>();
const batchEffectQueue = new Set<EffectCallback>();

const flushBatch = (): void => {
  let iterations = 0;

  while (batchComputedQueue.size > 0 || batchEffectQueue.size > 0) {
    if (++iterations > DEFAULT_MAX_ITERATIONS) {
      throw new Error(`[stateit] infinite batch loop (> ${DEFAULT_MAX_ITERATIONS} iterations)`);
    }

    // Phase 1: computed handlers mark dirty state before any effect reads.
    if (batchComputedQueue.size > 0) {
      const computedPending = [...batchComputedQueue];

      batchComputedQueue.clear();

      for (const fn of computedPending) fn();
    }

    // Phase 2: effect runners with full error aggregation.
    if (batchEffectQueue.size > 0) {
      const effectsPending = [...batchEffectQueue];

      batchEffectQueue.clear();

      runAll(effectsPending, 'subscriber errors');
    }
  }
};

// === BASE REACTIVE NODE ===
class ReactiveNode {
  private computedSubs_ = new Set<EffectCallback>();
  private effectSubs_ = new Set<EffectCallback>();

  protected get hasSubscribers(): boolean {
    return this.computedSubs_.size > 0 || this.effectSubs_.size > 0;
  }

  protected track(): void {
    if (!currentEffect || !currentDeps) return;

    const self = currentEffect;

    if (computedHandlers.has(self)) {
      this.computedSubs_.add(self);
      currentDeps.add(() => this.computedSubs_.delete(self));
    } else {
      this.effectSubs_.add(self);
      currentDeps.add(() => this.effectSubs_.delete(self));
    }
  }

  protected notify(): void {
    const hasComputed = this.computedSubs_.size > 0;
    const hasEffects = this.effectSubs_.size > 0;

    if (!hasComputed && !hasEffects) return;

    if (batchDepth > 0) {
      for (const fn of this.computedSubs_) batchComputedQueue.add(fn);
      for (const fn of this.effectSubs_) batchEffectQueue.add(fn);

      return;
    }

    // Phase 1: propagate dirty marks through the computed chain.
    if (hasComputed) {
      const computedPending = [...this.computedSubs_];

      for (const fn of computedPending) fn();
    }

    // Phase 2: run effects with full error aggregation.
    if (hasEffects) {
      runAll([...this.effectSubs_], 'subscriber errors');
    }
  }
}

// === SIGNAL IMPLEMENTATION ===
class SignalImpl<T> extends ReactiveNode implements Signal<T> {
  private value_: T;
  private equals_: EqualityFn<T>;
  [IS_SIGNAL] = true;

  constructor(initial: T, equals?: EqualityFn<T>) {
    super();
    this.value_ = initial;
    this.equals_ = equals ?? Object.is;
  }

  get value(): T {
    this.track();

    return this.value_;
  }

  set value(next: T) {
    if (this.equals_(this.value_, next)) return;

    this.value_ = next;
    this.notify();
  }
}

// === COMPUTED IMPLEMENTATION ===
class ComputedImpl<T> extends ReactiveNode implements ComputedSignal<T> {
  private hasValue_ = false;
  private value_!: T;
  private dirty_ = true;
  private computing_ = false;
  private disposed_ = false;
  private deps_ = new Set<CleanupFn>();
  private compute_: () => T;
  private equals_: EqualityFn<T>;
  [IS_SIGNAL] = true;

  private readonly onDepChange: EffectCallback = () => {
    if (this.disposed_) return;

    if (!this.hasSubscribers) {
      this.dirty_ = true;

      return;
    }

    if (this.recompute()) this.notify();
  };

  constructor(compute: () => T, equals?: EqualityFn<T>) {
    super();
    this.compute_ = compute;
    this.equals_ = equals ?? Object.is;
    computedHandlers.add(this.onDepChange);
  }

  private recompute(): boolean {
    if (this.computing_) {
      throw new Error('[stateit] computed cycle detected');
    }

    for (const unsub of this.deps_) unsub();
    this.deps_.clear();

    this.computing_ = true;

    try {
      const next = withScope(this.onDepChange, this.deps_, null, this.compute_);

      this.dirty_ = false;

      if (!this.hasValue_ || !this.equals_(this.value_, next)) {
        this.hasValue_ = true;
        this.value_ = next;

        return true;
      }

      return false;
    } finally {
      this.computing_ = false;
    }
  }

  get value(): T {
    if (this.disposed_) {
      throw new Error('[stateit] Cannot read disposed computed signal');
    }

    if (this.dirty_) this.recompute();

    this.track();

    return this.value_;
  }

  dispose(): void {
    if (this.disposed_) return;

    this.disposed_ = true;
    computedHandlers.delete(this.onDepChange);
    for (const unsub of this.deps_) unsub();
    this.deps_.clear();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

// === CORE API ===

export const signal = <T>(initial: T, options?: ReactiveOptions<T>): Signal<T> =>
  new SignalImpl(initial, options?.equals);

/**
 * Creates a computed signal that automatically recomputes when dependencies change.
 *
 * When called inside an effect, the computed signal is automatically disposed
 * when the effect cleans up, preventing memory leaks from derived computations
 * that only exist within the effect scope.
 *
 * @param compute - A function that returns the computed value
 * @param options - Optional equality function and other reactive options
 * @returns A readonly computed signal
 */
export const computed = <T>(compute: () => T, options?: ReactiveOptions<T>): ComputedSignal<T> => {
  const comp = new ComputedImpl(compute, options?.equals);

  // Auto-dispose when created inside effect
  if (currentEffect !== null && currentCleanups !== null) {
    onCleanup(() => comp.dispose());
  }

  return comp;
};

export const batch = <T>(fn: () => T): T => {
  batchDepth++;

  try {
    const result = fn();

    if (--batchDepth === 0) flushBatch();

    return result;
  } catch (e) {
    if (--batchDepth === 0) {
      try {
        flushBatch();
      } catch (flushError) {
        throw new AggregateError([e, flushError], '[stateit] batch error with flush errors', { cause: flushError });
      }
    }

    throw e;
  }
};

export const effect = (fn: EffectCallback, options?: EffectOptions): Subscription => {
  let cleanup: CleanupFn | undefined;
  const deps = new Set<CleanupFn>();
  let isRunning = false;
  let isDirty = false;
  let isDisposed = false;
  const maxIterations = options?.maxIterations ?? DEFAULT_MAX_ITERATIONS;

  const teardown = (): void => {
    if (!cleanup && deps.size === 0) return;

    const callbacks = cleanup ? [cleanup, ...deps] : [...deps];

    cleanup = undefined;
    deps.clear();

    runAll(callbacks, 'effect teardown errors');
  };

  const run = (): void => {
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
          throw new Error(`[stateit] infinite effect loop (> ${maxIterations} iterations)`);
        }

        isDirty = false;
        teardown();

        const localCleanups: CleanupFn[] = [];
        const returnedCleanup = withScope(run, deps, localCleanups, fn);

        if (returnedCleanup) localCleanups.push(returnedCleanup);

        if (localCleanups.length > 0) {
          cleanup = () => {
            runAll(localCleanups, 'effect cleanup errors');
          };
        }
      } while (isDirty && !isDisposed);
    } finally {
      isRunning = false;
    }
  };

  run();

  return toSubscription(() => {
    if (isDisposed) return;

    isDisposed = true;
    teardown();
  });
};

export const untrack = <T>(fn: () => T): T => withScope(null, null, null, fn);

export const onCleanup = (fn: CleanupFn): void => {
  if (currentCleanups === null) {
    throw new Error('[stateit] onCleanup() must be called from within an active effect or scope.');
  }

  currentCleanups.push(fn);
};

export const scope = (): Scope => {
  const cleanups: CleanupFn[] = [];
  let disposed = false;

  const run = <T>(fn: () => T): T => {
    if (disposed) throw new Error('[stateit] Cannot run inside a disposed scope.');

    const prev = currentCleanups;

    currentCleanups = cleanups;

    try {
      return fn();
    } finally {
      currentCleanups = prev;
    }
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;

    const errors: unknown[] = [];

    for (let i = cleanups.length - 1; i >= 0; i--) {
      try {
        cleanups[i]();
      } catch (e) {
        errors.push(e);
      }
    }

    cleanups.length = 0;

    if (errors.length === 1) throw errors[0];

    if (errors.length > 1) throw new AggregateError(errors, '[stateit] scope cleanup errors');
  };

  return { dispose, run, [Symbol.dispose]: dispose };
};

const watchBase = <T>(get: () => T, cb: (value: T, prev: T) => void, watchOptions?: WatchOptions<T>): Subscription => {
  const equals = watchOptions?.equals ?? Object.is;
  let prev = untrack(get);
  let shouldStop = false;

  if (watchOptions?.immediate) cb(prev, prev);

  let stop!: Subscription;

  // eslint-disable-next-line prefer-const
  stop = effect(() => {
    const next = get();

    if (equals(prev, next)) return;

    const old = prev;

    prev = next;
    cb(next, old);

    if (watchOptions?.once) {
      if (stop) {
        stop();
      } else {
        shouldStop = true;
      }
    }
  });

  if (shouldStop) stop();

  return stop;
};

function watch<T>(
  source: ReadonlySignal<T>,
  cb: (value: T, prev: T) => void,
  watchOptions?: WatchOptions<T>,
): Subscription;
function watch<S, T>(
  source: ReadonlySignal<S>,
  selector: (value: S) => T,
  cb: (value: T, prev: T) => void,
  watchOptions?: WatchOptions<T>,
): Subscription;
function watch<S, T>(
  source: ReadonlySignal<S>,
  selectorOrCb: ((value: S) => T) | ((value: S, prev: S) => void),
  maybeCb?: ((value: T, prev: T) => void) | WatchOptions<S>,
  maybeOptions?: WatchOptions<T>,
): Subscription {
  if (typeof maybeCb === 'function') {
    const selector = selectorOrCb as (value: S) => T;
    const cb = maybeCb as (value: T, prev: T) => void;

    return watchBase(() => selector(source.value), cb, maybeOptions);
  }

  const cb = selectorOrCb as (value: S, prev: S) => void;

  return watchBase(() => source.value, cb, maybeCb as WatchOptions<S> | undefined);
}

export { watch };

export const store = <T extends object>(initial: T): Store<T> => {
  ensureObject(initial, '[stateit] store() requires a plain object initial state.');

  const initialSnapshot = structuredClone(initial);
  const state = signal(structuredClone(initial));
  const api: Store<T> & { [IS_SIGNAL]: true } = {
    [IS_SIGNAL]: true,
    patch(partial: Partial<T>): void {
      ensureObject(partial, '[stateit] store.patch() requires a plain object partial.');

      const current = untrack(() => state.value);
      const hasChange = (Object.keys(partial) as Array<keyof T>).some((k) => !Object.is(current[k], partial[k]));

      if (hasChange) state.value = { ...current, ...partial };
    },
    reset(): void {
      state.value = structuredClone(initialSnapshot);
    },
    update(fn: (current: T) => T): void {
      const next = fn(untrack(() => state.value));

      ensureObject(next, '[stateit] store.update() must return a plain object.');
      state.value = next;
    },
    get value(): T {
      return state.value;
    },
  };

  return api;
};

// === TYPE HELPERS ===

export const isSignal = <T = unknown>(value: unknown): value is ReadonlySignal<T> =>
  typeof value === 'object' && value !== null && !!(value as any)[IS_SIGNAL];
