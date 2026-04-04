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
    if (!currentScope.effect || !currentScope.deps) return;

    this.subscribers.add(currentScope.effect);
    currentScope.deps.add(() => this.subscribers.delete(currentScope.effect!));
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

  private readonly onDepChange: EffectCallback = () => {
    if (this.disposed_) return;

    if (this.subscribers.size === 0) {
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
    if (--batchDepth === 0) flushBatch();

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

const watchBase = <T>(
  source: ReadonlySignal<T>,
  cb: (value: T, prev: T) => void,
  watchOptions?: WatchOptions<T>,
): Subscription => {
  const equals = watchOptions?.equals ?? Object.is;
  let prev = untrack(() => source.value);

  if (watchOptions?.immediate) cb(prev, prev);

  const stop = effect(() => {
    const next = source.value;

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
    const selected = computed(() => selector(source.value));
    const stop = watchBase(selected, cb, maybeOptions);

    return toSubscription(() => {
      stop();
      selected.dispose();
    });
  }

  const cb = selectorOrCb as (value: S, prev: S) => void;

  return watchBase(source, cb, maybeCb as WatchOptions<S> | undefined);
}

export { watch };

export const store = <T extends object>(initial: T, storeOptions?: ReactiveOptions<T>): Store<T> => {
  ensureObject(initial, '[stateit] store() requires a plain object initial state.');

  const initialSnapshot = clone(initial);
  const state = signal(clone(initial), storeOptions);

  return {
    patch(partial: Partial<T>): void {
      if (typeof partial !== 'object' || partial === null || Array.isArray(partial)) {
        throw new TypeError('[stateit] store.patch() requires a plain object partial.');
      }

      state.value = { ...state.value, ...partial };
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
    set value(next: T) {
      ensureObject(next, '[stateit] Store value must always be a plain object.');
      state.value = next;
    },
  };
};

// === TYPE HELPERS ===

export const readonly = <T>(input: ReadonlySignal<T>): ReadonlySignal<T> => input;

export const writable = <T>(input: Signal<T>): Signal<T> => input;

export const isSignal = <T = unknown>(value: unknown): value is ReadonlySignal<T> => {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Partial<ReadonlySignal<T>>;

  return 'value' in candidate;
};

export const peekValue = <T>(input: T | ReadonlySignal<T>): T => (isSignal<T>(input) ? input.value : input);

export const toValue = <T>(input: T | ReadonlySignal<T> | (() => T)): T => {
  if (isSignal<T>(input)) return input.value;

  if (typeof input === 'function') return (input as () => T)();

  return input;
};
