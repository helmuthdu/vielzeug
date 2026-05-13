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

export type WatchOptions<T> = {
  equals?: EqualityFn<T>;
  immediate?: boolean;
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

// === GLOBAL TRACKING STATE ===
let currentEffect: EffectRunner | null = null;
let currentComputed: ComputedImpl<any> | null = null;
let currentDeps: Set<CleanupFn> | null = null;
let currentCleanups: CleanupFn[] | null = null;

const withTracking = <T>(
  effect: EffectRunner | null,
  computed: ComputedImpl<any> | null,
  deps: Set<CleanupFn> | null,
  cleanups: CleanupFn[] | null,
  fn: () => T,
): T => {
  const prevEffect = currentEffect;
  const prevComputed = currentComputed;
  const prevDeps = currentDeps;
  const prevCleanups = currentCleanups;

  currentEffect = effect;
  currentComputed = computed;
  currentDeps = deps;
  currentCleanups = cleanups;

  try {
    return fn();
  } finally {
    currentEffect = prevEffect;
    currentComputed = prevComputed;
    currentDeps = prevDeps;
    currentCleanups = prevCleanups;
  }
};

// === NOTIFICATION QUEUES ===
let batchDepth = 0;
const pendingEffects = new Set<EffectRunner>();
const pendingDirtyComputeds = new Set<ComputedImpl<any>>();

const queueEffectsFromNode = (node: ReactiveNode): void => {
  const dirtyComputeds: ComputedImpl<any>[] = [...node.computedSubscribers()];
  const seenComputeds = new Set<ComputedImpl<any>>();

  for (const eff of node.effectSubscribers()) {
    pendingEffects.add(eff);
  }

  while (dirtyComputeds.length > 0) {
    const computed = dirtyComputeds.pop()!;

    if (seenComputeds.has(computed)) continue;

    seenComputeds.add(computed);

    if (!computed.markDirty()) continue;

    pendingDirtyComputeds.add(computed);

    for (const downstream of computed.computedSubscribers()) {
      dirtyComputeds.push(downstream);
    }
  }
};

const flushDirtyComputeds = (): void => {
  while (pendingDirtyComputeds.size > 0) {
    const dirtyComputeds = [...pendingDirtyComputeds];

    pendingDirtyComputeds.clear();

    for (const computed of dirtyComputeds) {
      if (!computed.hasAnySubscribers()) continue;

      const changed = computed.refreshIfDirty();

      if (!changed) continue;

      for (const eff of computed.effectSubscribers()) {
        pendingEffects.add(eff);
      }

      for (const downstream of computed.computedSubscribers()) {
        if (downstream.markDirty()) {
          pendingDirtyComputeds.add(downstream);
        }
      }
    }
  }
};

const flushEffects = (): void => {
  let iterations = 0;

  while (pendingEffects.size > 0 || pendingDirtyComputeds.size > 0) {
    if (++iterations > DEFAULT_MAX_ITERATIONS) {
      throw new Error(`[stateit] infinite flush loop (> ${DEFAULT_MAX_ITERATIONS} iterations)`);
    }

    if (pendingDirtyComputeds.size > 0) {
      flushDirtyComputeds();
    }

    if (pendingEffects.size === 0) continue;

    const effectsToRun = [...pendingEffects];

    pendingEffects.clear();
    runAll(effectsToRun, 'subscriber errors');
  }
};

const notifyNodeChange = (node: ReactiveNode): void => {
  if (!node.hasAnySubscribers()) return;

  queueEffectsFromNode(node);

  if (batchDepth === 0) {
    flushEffects();
  }
};

// === BASE REACTIVE NODE ===
class ReactiveNode {
  private computedSubs_ = new Set<ComputedImpl<any>>();
  private effectSubs_ = new Set<EffectRunner>();

  protected track(): void {
    if (!currentDeps) return;

    if (currentComputed !== null) {
      const owner = currentComputed;

      this.computedSubs_.add(owner);
      currentDeps.add(() => this.computedSubs_.delete(owner));

      return;
    }

    if (currentEffect !== null) {
      const owner = currentEffect;

      this.effectSubs_.add(owner);
      currentDeps.add(() => this.effectSubs_.delete(owner));
    }
  }

  protected notify(): void {
    notifyNodeChange(this);
  }

  hasAnySubscribers(): boolean {
    return this.computedSubs_.size > 0 || this.effectSubs_.size > 0;
  }

  computedSubscribers(): ReadonlySet<ComputedImpl<any>> {
    return this.computedSubs_;
  }

  effectSubscribers(): ReadonlySet<EffectRunner> {
    return this.effectSubs_;
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

  constructor(compute: () => T, equals?: EqualityFn<T>) {
    super();
    this.compute_ = compute;
    this.equals_ = equals ?? Object.is;
  }

  markDirty(): boolean {
    if (this.disposed_ || this.dirty_) return false;

    this.dirty_ = true;

    return true;
  }

  refreshIfDirty(): boolean {
    return this.dirty_ ? this.recompute() : false;
  }

  private recompute(): boolean {
    if (this.computing_) {
      throw new Error('[stateit] computed cycle detected');
    }

    for (const unsub of this.deps_) unsub();
    this.deps_.clear();

    this.computing_ = true;

    try {
      const next = withTracking(null, this, this.deps_, null, this.compute_);

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

    this.refreshIfDirty();

    this.track();

    return this.value_;
  }

  dispose(): void {
    if (this.disposed_) return;

    this.disposed_ = true;

    for (const unsub of this.deps_) unsub();
    this.deps_.clear();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

type EffectRunner = () => void;

// === CORE API ===

export const signal = <T>(initial: T, options?: ReactiveOptions<T>): Signal<T> =>
  new SignalImpl(initial, options?.equals);

export const computed = <T>(compute: () => T, options?: ReactiveOptions<T>): ComputedSignal<T> => {
  const comp = new ComputedImpl(compute, options?.equals);

  if (currentCleanups !== null) {
    onCleanup(() => comp.dispose());
  }

  return comp;
};

export const batch = <T>(fn: () => T): T => {
  batchDepth++;

  let result: T | undefined;
  let bodyError: unknown;

  try {
    result = fn();
  } catch (e) {
    bodyError = e;
  }

  batchDepth--;

  if (batchDepth === 0) {
    try {
      flushEffects();
    } catch (flushError) {
      if (bodyError !== undefined) {
        const aggregate = new AggregateError([bodyError, flushError], '[stateit] batch error with flush errors');

        (aggregate as Error & { cause?: unknown }).cause = flushError;
        throw aggregate;
      }

      throw flushError instanceof Error ? flushError : new Error(String(flushError));
    }
  }

  if (bodyError !== undefined) {
    throw bodyError instanceof Error ? bodyError : new Error(String(bodyError));
  }

  return result as T;
};

export const effect = (fn: EffectCallback): Subscription => {
  let cleanup: CleanupFn | undefined;
  const deps = new Set<CleanupFn>();
  let isRunning = false;
  let isDirty = false;
  let isDisposed = false;

  const teardown = (): void => {
    if (!cleanup && deps.size === 0) return;

    const callbacks = cleanup ? [cleanup, ...deps] : [...deps];

    cleanup = undefined;
    deps.clear();

    runAll(callbacks, 'effect teardown errors');
  };

  const run: EffectRunner = (): void => {
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
          throw new Error(`[stateit] infinite effect loop (> ${DEFAULT_MAX_ITERATIONS} iterations)`);
        }

        isDirty = false;
        teardown();

        const localCleanups: CleanupFn[] = [];
        const returnedCleanup = withTracking(run, null, deps, localCleanups, fn);

        if (typeof returnedCleanup === 'function') {
          localCleanups.push(returnedCleanup);
        }

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

export const untrack = <T>(fn: () => T): T => withTracking(null, null, null, null, fn);

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

    return withTracking(null, null, null, cleanups, fn);
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;

    runAll([...cleanups].reverse(), 'scope cleanup errors');
    cleanups.length = 0;
  };

  return { dispose, run, [Symbol.dispose]: dispose };
};

const watchBase = <T>(get: () => T, cb: (value: T, prev: T) => void, watchOptions?: WatchOptions<T>): Subscription => {
  const equals = watchOptions?.equals ?? Object.is;
  let prev = untrack(get);

  if (watchOptions?.immediate) cb(prev, prev);

  return effect(() => {
    const next = get();

    if (equals(prev, next)) return;

    const old = prev;

    prev = next;
    cb(next, old);
  });
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
      state.value = fn(untrack(() => state.value));
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
