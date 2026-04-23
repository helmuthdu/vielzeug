import type {
  CleanupFn,
  ComputedSignal,
  EffectCallback,
  EffectOptions,
  EqualityFn,
  ReactiveOptions,
  ReadonlySignal,
  Signal,
  Store,
  Subscription,
  WatchOptions,
} from './types';

// === CONSTANTS ===
const UNINITIALIZED = Symbol('stateit.uninitialized');
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

const clone = <T>(value: T): T => structuredClone(value);

// === UNIFIED ERROR HANDLING ===
const runCallbacks = (callbacks: CleanupFn[], context: string): void => {
  const errors: unknown[] = [];

  for (const callback of callbacks) {
    try {
      callback();
    } catch (e) {
      errors.push(e);
    }
  }

  if (errors.length === 1) throw errors[0];

  if (errors.length > 1) {
    throw new AggregateError(errors, `[stateit] ${context}`);
  }
};

const runSubscribers = (subscribers: Set<EffectCallback>): void => {
  const errors: unknown[] = [];

  for (const fn of [...subscribers]) {
    try {
      fn();
    } catch (e) {
      errors.push(e);
    }
  }

  if (errors.length === 1) throw errors[0];

  if (errors.length > 1) {
    throw new AggregateError(errors, '[stateit] subscriber errors');
  }
};

// === GLOBAL REACTIVE GRAPH ===
interface EffectScope {
  effect: EffectCallback | null;
  deps: Set<CleanupFn> | null;
  cleanups: CleanupFn[] | null;
}

let currentScope: EffectScope = {
  cleanups: null,
  deps: null,
  effect: null,
};

const withScope = <T>(
  effect: EffectCallback | null,
  deps: Set<CleanupFn> | null,
  cleanups: CleanupFn[] | null,
  fn: () => T,
): T => {
  const prev = currentScope;

  currentScope = { cleanups, deps, effect };

  try {
    return fn();
  } finally {
    currentScope = prev;
  }
};

// === BATCH QUEUE ===
let batchDepth = 0;
const batchQueue = new Set<EffectCallback>();

const flushBatch = (): void => {
  while (batchQueue.size > 0) {
    const pending = [...batchQueue];

    batchQueue.clear();

    runSubscribers(new Set(pending));
  }
};

// === BASE REACTIVE NODE ===
class ReactiveNode {
  protected subscribers = new Set<EffectCallback>();

  protected track(): void {
    const { deps, effect } = currentScope;

    if (!effect || !deps) return;

    this.subscribers.add(effect);
    deps.add(() => this.subscribers.delete(effect));
  }

  protected hasSubscribers(): boolean {
    return this.subscribers.size > 0;
  }

  protected notify(): void {
    if (this.subscribers.size === 0) return;

    if (batchDepth > 0) {
      for (const fn of this.subscribers) batchQueue.add(fn);

      return;
    }

    runSubscribers(this.subscribers);
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

  update(fn: (current: T) => T): void {
    this.value = fn(this.value_);
  }
}

// === COMPUTED IMPLEMENTATION ===
class ComputedImpl<T> extends ReactiveNode implements ComputedSignal<T> {
  private value_: T | typeof UNINITIALIZED = UNINITIALIZED;
  private dirty_ = true;
  private disposed_ = false;
  private deps_ = new Set<CleanupFn>();
  private compute_: () => T;
  private equals_: EqualityFn<T>;
  [IS_SIGNAL] = true;

  private readonly onDepChange: EffectCallback = () => {
    if (this.disposed_) return;

    if (!this.hasSubscribers()) {
      this.dirty_ = true;

      return;
    }

    if (this.recompute()) this.notify();
  };

  constructor(compute: () => T, equals?: EqualityFn<T>) {
    super();
    this.compute_ = compute;
    this.equals_ = equals ?? Object.is;
    this.recompute();
  }

  private recompute(): boolean {
    for (const unsub of this.deps_) unsub();
    this.deps_.clear();

    const next = withScope(this.onDepChange, this.deps_, null, this.compute_);

    this.dirty_ = false;

    if (this.value_ === UNINITIALIZED || !this.equals_(this.value_ as T, next)) {
      this.value_ = next;

      return true;
    }

    return false;
  }

  get value(): T {
    if (this.disposed_) {
      throw new Error('[stateit] Cannot read disposed computed signal');
    }

    if (this.dirty_) this.recompute();

    this.track();

    return this.value_ as T;
  }

  get stale(): boolean {
    return this.dirty_;
  }

  dispose(): void {
    if (this.disposed_) return;

    this.disposed_ = true;
    this.dirty_ = true;
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
  if (currentScope.effect !== null && currentScope.cleanups !== null) {
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
    const callbacks: CleanupFn[] = [];

    if (cleanup) callbacks.push(cleanup);

    cleanup = undefined;

    for (const unsub of deps) callbacks.push(unsub);
    deps.clear();

    runCallbacks(callbacks, 'effect teardown errors');
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
            runCallbacks(localCleanups, 'effect cleanup errors');
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

export const untrack = <T>(fn: () => T): T => {
  return withScope(null, null, null, fn);
};

export const onCleanup = (fn: CleanupFn): void => {
  if (currentScope.cleanups === null) {
    throw new Error('[stateit] onCleanup() must be called from inside an active effect.');
  }

  currentScope.cleanups.push(fn);
};

const watchBase = <T>(get: () => T, cb: (value: T, prev: T) => void, watchOptions?: WatchOptions<T>): Subscription => {
  const equals = watchOptions?.equals ?? Object.is;
  let prev = untrack(get);

  if (watchOptions?.immediate) cb(prev, prev);

  const stop = effect(() => {
    const next = get();

    if (equals(prev, next)) return;

    const old = prev;

    prev = next;
    cb(next, old);

    if (watchOptions?.once) stop();
  });

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

export const store = <T extends object>(initial: T, storeOptions?: ReactiveOptions<T>): Store<T> => {
  ensureObject(initial, '[stateit] store() requires a plain object initial state.');

  const initialSnapshot = clone(initial);
  const state = signal(clone(initial), storeOptions);

  return {
    patch(partial: Partial<T>): void {
      ensureObject(partial, '[stateit] store.patch() requires a plain object partial.');

      const current = state.value;
      const hasChange = (Object.keys(partial) as Array<keyof T>).some((k) => !Object.is(current[k], partial[k]));

      if (hasChange) state.value = { ...current, ...partial };
    },
    reset(): void {
      state.value = clone(initialSnapshot);
    },
    update(fn: (current: T) => T): void {
      const next = fn(state.value);

      ensureObject(next, '[stateit] store.update() must return a plain object.');
      state.value = next;
    },
    get value(): T {
      return state.value;
    },
  };
};

// === TYPE HELPERS ===

export const readonly = <T>(input: ReadonlySignal<T>): ReadonlySignal<T> => input;

export const writable = <T>(input: Signal<T>): Signal<T> => input;

export const isSignal = <T = unknown>(value: unknown): value is ReadonlySignal<T> => {
  if (typeof value !== 'object' || value === null) return false;

  return IS_SIGNAL in value && (value as any)[IS_SIGNAL] === true;
};

export const isWritable = <T = unknown>(value: unknown): value is Signal<T> => {
  if (!isSignal(value)) return false;

  return Object.getOwnPropertyDescriptor(Object.getPrototypeOf(value), 'value')?.set !== undefined;
};

/**
 * Unwraps a signal or returns the value as-is.
 * If the input is a signal, reads its value (which may track dependencies).
 * For untracked reads, use {@link peek} instead.
 */
export const unwrapSignal = <T>(input: T | ReadonlySignal<T>): T => (isSignal<T>(input) ? input.value : input);

/**
 * Performs an untracked read of a signal value.
 * This read will not register as a dependency for reactive evaluation.
 * If the input is not a signal, returns the value as-is.
 */
export const peek = <T>(input: T | ReadonlySignal<T>): T => untrack(() => unwrapSignal(input));

export const toValue = <T>(input: T | ReadonlySignal<T> | (() => T)): T => {
  if (isSignal<T>(input)) return input.value;

  if (typeof input === 'function') return (input as () => T)();

  return input;
};
