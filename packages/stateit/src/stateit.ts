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
  peek(): T;
  subscribe(onStoreChange: () => void): Subscription;
  readonly value: T;
}

export interface Signal<T> extends ReadonlySignal<T> {
  update(fn: (current: T) => T): void;
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

export interface ObservableObserver<T> {
  complete?(): void;
  error?(error: unknown): void;
  next?(value: T): void;
}

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
const OBSERVABLE_SYMBOL: unique symbol = ((Symbol as typeof Symbol & { observable?: symbol }).observable ??
  Symbol.for('observable')) as never;

export const observableSymbol = OBSERVABLE_SYMBOL;

type EffectRunner = () => void;
type Subscriber = () => void;

export type ObservableLike<T> = {
  [observableSymbol](): ObservableLike<T>;
  subscribe(observer: ObservableObserver<T> | ((value: T) => void)): { unsubscribe(): void };
};

// === HELPERS ===
export const toSubscription = (dispose: () => void): Subscription =>
  Object.assign(dispose, { dispose, [Symbol.dispose]: dispose }) as Subscription;

const readonlyCache = new WeakMap<object, ReadonlySignal<unknown>>();

const ensureError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

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

const rethrowWithCleanupErrors = (error: unknown, cleanupErrors: unknown[], context: string): never => {
  const rootCause = ensureError(error);

  if (cleanupErrors.length === 0) {
    throw rootCause;
  }

  throw new AggregateError([rootCause, ...cleanupErrors.map(ensureError)], `[stateit] ${context}`, {
    cause: rootCause,
  });
};

const runCleanupAndCollectErrors = (items: Iterable<() => void>): unknown[] => {
  try {
    runAll(items, 'cleanup errors');

    return [];
  } catch (error) {
    return error instanceof AggregateError ? error.errors : [error];
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
const pendingSubscribers = new Set<Subscriber>();
const pendingDirtyComputeds = new Set<ComputedImpl<any>>();

const toTopologicalOrder = (dirtyComputeds: readonly ComputedImpl<any>[]): ComputedImpl<any>[] => {
  const pendingSet = new Set(dirtyComputeds);
  const indegree = new Map<ComputedImpl<any>, number>();

  for (const computed of dirtyComputeds) {
    indegree.set(computed, 0);
  }

  for (const computed of dirtyComputeds) {
    for (const downstream of computed.computedSubscribers()) {
      if (!pendingSet.has(downstream)) continue;

      indegree.set(downstream, (indegree.get(downstream) ?? 0) + 1);
    }
  }

  const queue: ComputedImpl<any>[] = [];

  for (const computed of dirtyComputeds) {
    if ((indegree.get(computed) ?? 0) === 0) {
      queue.push(computed);
    }
  }

  const ordered: ComputedImpl<any>[] = [];

  while (queue.length > 0) {
    const computed = queue.shift()!;

    ordered.push(computed);

    for (const downstream of computed.computedSubscribers()) {
      if (!pendingSet.has(downstream)) continue;

      const nextIndegree = (indegree.get(downstream) ?? 0) - 1;

      indegree.set(downstream, nextIndegree);

      if (nextIndegree === 0) {
        queue.push(downstream);
      }
    }
  }

  if (ordered.length < dirtyComputeds.length) {
    for (const computed of dirtyComputeds) {
      if (!ordered.includes(computed)) {
        ordered.push(computed);
      }
    }
  }

  return ordered;
};

const queueEffectsFromNode = (node: ReactiveNode): void => {
  const dirtyComputeds: ComputedImpl<any>[] = [...node.computedSubscribers()];
  const seenComputeds = new Set<ComputedImpl<any>>();

  for (const subscriber of node.subscribers()) {
    pendingSubscribers.add(subscriber);
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
    const dirtyComputeds = toTopologicalOrder([...pendingDirtyComputeds]);

    pendingDirtyComputeds.clear();

    for (const computed of dirtyComputeds) {
      if (!computed.hasAnySubscribers()) continue;

      const changed = computed.refreshIfDirty();

      if (!changed) continue;

      for (const subscriber of computed.subscribers()) {
        pendingSubscribers.add(subscriber);
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

  while (pendingSubscribers.size > 0 || pendingDirtyComputeds.size > 0) {
    if (++iterations > DEFAULT_MAX_ITERATIONS) {
      throw new Error(`[stateit] infinite flush loop (> ${DEFAULT_MAX_ITERATIONS} iterations)`);
    }

    if (pendingDirtyComputeds.size > 0) {
      flushDirtyComputeds();
    }

    if (pendingSubscribers.size === 0) continue;

    const subscribersToRun = [...pendingSubscribers];

    pendingSubscribers.clear();
    runAll(subscribersToRun, 'subscriber errors');
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
  private subscribers_ = new Set<Subscriber>();

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

      this.subscribers_.add(owner);
      currentDeps.add(() => this.subscribers_.delete(owner));
    }
  }

  protected notify(): void {
    notifyNodeChange(this);
  }

  hasAnySubscribers(): boolean {
    return this.computedSubs_.size > 0 || this.subscribers_.size > 0;
  }

  computedSubscribers(): ReadonlySet<ComputedImpl<any>> {
    return this.computedSubs_;
  }

  subscribers(): ReadonlySet<Subscriber> {
    return this.subscribers_;
  }

  subscribe(subscriber: Subscriber): Subscription {
    this.subscribers_.add(subscriber);

    return toSubscription(() => {
      this.subscribers_.delete(subscriber);
    });
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

  peek(): T {
    return this.value_;
  }

  readonly subscribe = (onStoreChange: () => void): Subscription => {
    return super.subscribe(onStoreChange);
  };

  update(fn: (current: T) => T): void {
    this.value = fn(this.value_);
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
    } catch (error) {
      const cleanupErrors = runCleanupAndCollectErrors(this.deps_);

      this.deps_.clear();

      return rethrowWithCleanupErrors(error, cleanupErrors, 'computed failed dependency cleanup errors');
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

  peek(): T {
    if (this.disposed_) {
      throw new Error('[stateit] Cannot read disposed computed signal');
    }

    this.refreshIfDirty();

    return this.value_;
  }

  readonly subscribe = (onStoreChange: () => void): Subscription => {
    if (this.disposed_) {
      throw new Error('[stateit] Cannot subscribe to a disposed computed signal');
    }

    // Subscribing should be lazy in terms of callbacks, but computed dependencies
    // must be established so upstream writes can mark this node dirty.
    this.refreshIfDirty();

    return super.subscribe(onStoreChange);
  };

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
  // Batch coalesces notifications. Writes that happen before an error are not rolled back.
  // Pending subscribers still flush, and caller-visible errors are aggregated.
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
        throw new AggregateError([bodyError, flushError], '[stateit] batch error with flush errors', {
          cause: flushError,
        });
      }

      throw ensureError(flushError);
    }
  }

  if (bodyError !== undefined) {
    throw ensureError(bodyError);
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
        let returnedCleanup: CleanupFn | void = undefined;

        try {
          returnedCleanup = withTracking(run, null, deps, localCleanups, fn);
        } catch (error) {
          const cleanupErrors = [...runCleanupAndCollectErrors(deps), ...runCleanupAndCollectErrors(localCleanups)];

          deps.clear();
          rethrowWithCleanupErrors(error, cleanupErrors, 'effect failure with cleanup errors');
        }

        if (typeof returnedCleanup === 'function') {
          localCleanups.push(returnedCleanup);
        }

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

  run();

  return toSubscription(() => {
    if (isDisposed) return;

    isDisposed = true;
    teardown();
  });
};

export const untrack = <T>(fn: () => T): T => withTracking(null, null, null, null, fn);

export const readonly = <T>(source: ReadonlySignal<T>): ReadonlySignal<T> => {
  const sourceObject = source as object;
  const cached = readonlyCache.get(sourceObject);

  if (cached) {
    return cached as ReadonlySignal<T>;
  }

  const view: ReadonlySignal<T> = {
    peek(): T {
      return source.peek();
    },
    subscribe(onStoreChange: () => void): Subscription {
      return source.subscribe(onStoreChange);
    },
    get value(): T {
      return source.value;
    },
  };

  readonlyCache.set(sourceObject, view as ReadonlySignal<unknown>);

  return view;
};

export const toStore = <T>(source: ReadonlySignal<T>): { subscribe(run: (value: T) => void): Subscription } => ({
  subscribe(run) {
    run(source.value);

    return source.subscribe(() => run(source.value));
  },
});

export const toObservable = <T>(source: ReadonlySignal<T>): ObservableLike<T> => {
  const subscribe = (observerOrNext: ObservableObserver<T> | ((value: T) => void)): { unsubscribe(): void } => {
    const observer: ObservableObserver<T> =
      typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

    observer.next?.(source.value);

    const subscription = source.subscribe(() => observer.next?.(source.value));

    return {
      unsubscribe(): void {
        subscription();
      },
    };
  };

  const observable = {
    [OBSERVABLE_SYMBOL](): ObservableLike<T> {
      return observable;
    },
    subscribe,
  };

  return observable;
};

export const onCleanup = (fn: CleanupFn): void => {
  if (currentCleanups === null) {
    throw new Error('[stateit] onCleanup() must be called from within an active effect or scope.');
  }

  currentCleanups.push(fn);
};

export const scope = (setup?: () => void): Scope => {
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

  const api: Scope = { dispose, run, [Symbol.dispose]: dispose };

  if (setup) {
    run(setup);
  }

  return api;
};

function watch<T>(
  source: ReadonlySignal<T>,
  cb: (value: T, prev: T) => void,
  watchOptions?: WatchOptions<T>,
): Subscription;
function watch<T>(source: () => T, cb: (value: T, prev: T) => void, watchOptions?: WatchOptions<T>): Subscription;
function watch<T>(
  source: ReadonlySignal<T> | (() => T),
  cb: (value: T, prev: T) => void,
  watchOptions?: WatchOptions<T>,
): Subscription {
  const get = typeof source === 'function' ? source : () => source.value;
  const equals = watchOptions?.equals ?? Object.is;
  let initialized = false;
  let prev!: T;

  if (watchOptions?.immediate) {
    prev = untrack(get);
    initialized = true;
    cb(prev, prev);
  }

  return effect(() => {
    const next = get();

    if (!initialized) {
      initialized = true;
      prev = next;

      return;
    }

    if (equals(prev, next)) return;

    const old = prev;

    prev = next;
    cb(next, old);
  });
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
    peek(): T {
      return state.peek();
    },
    reset(): void {
      state.value = structuredClone(initialSnapshot);
    },
    subscribe(onStoreChange: () => void): Subscription {
      return state.subscribe(onStoreChange);
    },
    update(fn: (current: T) => T): void {
      state.update(fn);
    },
    get value(): T {
      return state.value;
    },
  };

  return api;
};

// === TYPE HELPERS ===

export const isSignal = <T = unknown>(value: unknown): value is ReadonlySignal<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_SIGNAL, unknown>)[IS_SIGNAL];
