// === TYPES ===

export type CleanupFn = () => void;
export type EffectCallback = () => CleanupFn | void;
export type AsyncEffectCallback = (signal: AbortSignal) => Promise<CleanupFn | void>;
export type EqualityFn<T> = (a: T, b: T) => boolean;
export type ReactiveOptions<T> = { equals?: EqualityFn<T> };

export interface Subscription {
  (): void;
  dispose(): void;
  [Symbol.dispose](): void;
}

/**
 * A {@link Subscription} extended with `disposeAsync()` for graceful async teardown.
 * Returned by {@link effectAsync} so callers can await all in-flight work before continuing.
 */
export interface AsyncSubscription extends Subscription {
  disposeAsync(): Promise<void>;
}

export interface ReadonlySignal<T> {
  derive<U>(fn: (value: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U>;
  peek(): T;
  subscribe(listener: () => void): Subscription;
  readonly value: T;
}

export interface Signal<T> extends ReadonlySignal<T> {
  update(fn: (current: T) => T): void;
  value: T;
  dispose(): void;
  [Symbol.dispose](): void;
}

export interface ComputedSignal<T> extends ReadonlySignal<T> {
  dispose(): void;
  [Symbol.dispose](): void;
}

export type WatchOptions<T> = ReactiveOptions<T> & { immediate?: boolean };

export interface Store<T extends object> extends ReadonlySignal<T> {
  patch(partial: Partial<T>): void;
  reset(): void;
  select<U>(selector: (state: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U>;
  update(fn: (state: T) => T): void;
}

export interface Scope {
  readonly run: <T>(fn: () => T) => T;
  readonly dispose: () => void;
  readonly [Symbol.dispose]: () => void;
}

// === ERROR ===

export type StateErrorCode =
  | 'COMPUTED_CYCLE'
  | 'DISPOSED_READ'
  | 'DISPOSED_SCOPE'
  | 'INFINITE_LOOP'
  | 'INVALID_CLEANUP'
  | 'INVALID_REACTIVE'
  | 'INVALID_STORE';

export class StateError extends Error {
  readonly code: StateErrorCode;

  constructor(code: StateErrorCode, message: string) {
    super(`[stateit/${code}] ${message}`);
    this.name = 'StateError';
    this.code = code;
  }
}

// === CONFIG ===

const config = { maxIterations: 100 };

/**
 * Adjust global runtime settings. Returns a cleanup function that restores the previous
 * configuration when called — consistent with the `CleanupFn` contract used throughout.
 *
 * @example
 * ```ts
 * const restore = configure({ maxIterations: 10 });
 * // ... test body
 * restore();
 * ```
 */
export const configure = (options: { maxIterations?: number }): (() => void) => {
  const prev = { ...config };

  if (options.maxIterations !== undefined) {
    if (!Number.isInteger(options.maxIterations) || options.maxIterations < 1) {
      throw new TypeError('[stateit] configure: maxIterations must be a positive integer.');
    }

    config.maxIterations = options.maxIterations;
  }

  return () => {
    Object.assign(config, prev);
  };
};

// === EQUALITY HELPERS ===

/**
 * Returns true when `a` and `b` are equal by reference for each key (one level deep).
 * Useful as an `equals` option for computed slices and watch sources that produce new arrays or objects.
 */
export const shallowEqual = <T>(a: T, b: T): boolean => {
  if (Object.is(a, b)) return true;

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
  }

  return true;
};

/**
 * Returns true when `a` and `b` are structurally equal (recursive).
 * Handles nested plain objects and arrays. Circular references are treated as unequal
 * rather than causing a stack overflow.
 */
export const deepEqual = <T>(a: T, b: T): boolean => {
  const deepEqualInner = (x: unknown, y: unknown, seen: WeakSet<object>): boolean => {
    if (Object.is(x, y)) return true;

    if (typeof x !== 'object' || typeof y !== 'object' || x === null || y === null) return false;

    if (Array.isArray(x) !== Array.isArray(y)) return false;

    // Circular reference: treat as unequal to avoid infinite recursion.
    if (seen.has(x)) return false;

    seen.add(x);

    const keysX = Object.keys(x as object);
    const keysY = Object.keys(y as object);

    if (keysX.length !== keysY.length) return false;

    for (const key of keysX) {
      if (!deepEqualInner((x as Record<string, unknown>)[key], (y as Record<string, unknown>)[key], seen)) return false;
    }

    return true;
  };

  return deepEqualInner(a, b, new WeakSet());
};

// === CONSTANTS ===

/** Sentinel used by `batch()` to distinguish "no error thrown" from `throw undefined`. */
const _NONE: unique symbol = Symbol('stateit.none');

const IS_SIGNAL = Symbol('stateit.is-signal');
const IS_COMPUTED = Symbol('stateit.is-computed');
const IS_REACTIVE_ARRAY = Symbol('stateit.is-reactive-array');
const IS_REACTIVE = Symbol('stateit.is-reactive');
const IS_STORE = Symbol('stateit.is-store');
const UNINITIALIZED: unique symbol = Symbol('stateit.uninitialized');

type EffectRunner = () => void;
type Subscriber = () => void;

// === SSR TRACKING PROVIDER ===

/**
 * Escape-hatch interface for replacing the reactive tracking context store.
 * Most users will not implement this directly — use {@link createAsyncProvider} instead.
 */
export interface TrackingProvider {
  get(): unknown;
  run<T>(ctx: unknown, fn: () => T): T;
}

// === TRACKING CONTEXT (internal) ===

type InternalTrackingContext = {
  cleanups: CleanupFn[] | null;
  computed: ComputedImpl<unknown> | null;
  effect: EffectRunner | null;
  /** Unsubscribe functions for all reactive sources tracked in the current computation. */
  subscriptions: Set<CleanupFn> | null;
};

let _syncTracking: InternalTrackingContext | null = null;
let _provider: TrackingProvider = {
  get: () => _syncTracking,
  run: (ctx, fn) => {
    const prev = _syncTracking;

    _syncTracking = ctx as InternalTrackingContext | null;

    try {
      return fn();
    } finally {
      _syncTracking = prev;
    }
  },
};

/**
 * Replace the tracking context provider. Returns the previous provider so it can be restored.
 * Prefer {@link createAsyncProvider} for Node.js async SSR instead of implementing this interface directly.
 */
export const setTrackingProvider = (provider: TrackingProvider): TrackingProvider => {
  const prev = _provider;

  _provider = provider;

  return prev;
};

const getTracking = (): InternalTrackingContext | null => _provider.get() as InternalTrackingContext | null;

const withTracking = <T>(ctx: InternalTrackingContext | null, fn: () => T): T => _provider.run(ctx, fn);

/**
 * Structural adapter type for `AsyncLocalStorage` (or any compatible async-context store).
 * Defined structurally so zero Node.js imports are needed in the browser bundle.
 */
type AsyncStoreLike = {
  getStore(): unknown;
  run<T>(value: unknown, fn: () => T): T;
};

/**
 * Creates a {@link TrackingProvider} backed by an `AsyncLocalStorage`-compatible store,
 * preventing tracking context from leaking between concurrent async requests in Node.js SSR.
 *
 * Call this once at server startup:
 *
 * @example
 * ```ts
 * import { AsyncLocalStorage } from 'node:async_hooks';
 * import { createAsyncProvider, setTrackingProvider } from '@vielzeug/stateit';
 *
 * setTrackingProvider(createAsyncProvider(new AsyncLocalStorage()));
 * ```
 */
export const createAsyncProvider = (als: AsyncStoreLike): TrackingProvider => ({
  get: () => als.getStore() ?? null,
  run: (ctx, fn) => als.run(ctx, fn),
});

/**
 * Runs `fn` with the given {@link TrackingProvider} active, then restores the previous one.
 * Useful for test isolation and scoped server middleware without permanently mutating global state.
 *
 * @example
 * ```ts
 * runWithProvider(createAsyncProvider(als), () => {
 *   // all reactivity here uses the async provider
 * });
 * ```
 */
export const runWithProvider = <T>(provider: TrackingProvider, fn: () => T): T => {
  const prev = setTrackingProvider(provider);

  try {
    return fn();
  } finally {
    setTrackingProvider(prev);
  }
};

/**
 * Runs `fn` inside an isolated reactive tracking context, detached from any outer
 * effect or computed. The return value is passed through unchanged.
 *
 * Use this to wrap per-request renders in SSR, or to create component root boundaries.
 * The API is identical in browser and Node.js:
 *
 * @example
 * ```ts
 * // Browser — wrap a component tree root
 * withReactiveContext(() => {
 *   const count = signal(0);
 *   effect(() => { document.title = `${count.value}`; });
 * });
 *
 * // Node.js SSR — wrap each request render
 * app.get('/page', (_req, res) => {
 *   const html = withReactiveContext(() => renderToString());
 *   res.send(html);
 * });
 * ```
 *
 * For concurrent async SSR (multiple requests with {@link effectAsync} in-flight at the
 * same time), also call `setTrackingProvider(createAsyncProvider(new AsyncLocalStorage()))`
 * once at server startup.
 */
export const withReactiveContext = <T>(fn: () => T): T => withTracking(null, fn);

// === HELPERS ===

const toSubscription = (dispose: () => void): Subscription =>
  Object.assign(dispose, { dispose, [Symbol.dispose]: dispose }) as Subscription;

const ensureError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

/**
 * Runs all items, collecting any errors. Never throws — use `runAll` when you want throwing behavior.
 */
const collectErrors = (items: Iterable<() => void>): unknown[] => {
  const errors: unknown[] = [];

  for (const fn of items) {
    try {
      fn();
    } catch (e) {
      errors.push(e);
    }
  }

  return errors;
};

const runAll = (items: Iterable<() => void>, context: string): void => {
  const errors = collectErrors(items);

  if (errors.length === 1) throw errors[0];

  if (errors.length > 1) throw new AggregateError(errors, `[stateit] ${context}`);
};

const rethrowWithCleanupErrors = (error: unknown, cleanupErrors: unknown[], context: string): never => {
  const rootCause = ensureError(error);

  if (cleanupErrors.length === 0) throw rootCause;

  throw new AggregateError([rootCause, ...cleanupErrors.map(ensureError)], `[stateit] ${context}`, {
    cause: rootCause,
  });
};

// === NOTIFICATION QUEUES ===

let batchDepth = 0;
const pendingSubscribers = new Set<Subscriber>();
const pendingDirtyComputeds = new Set<ComputedImpl<unknown>>();

const toTopologicalOrder = (dirtyComputeds: readonly ComputedImpl<unknown>[]): ComputedImpl<unknown>[] => {
  // Fast path: single node needs no sorting
  if (dirtyComputeds.length <= 1) return [...dirtyComputeds];

  const pendingSet = new Set(dirtyComputeds);
  const indegree = new Map<ComputedImpl<unknown>, number>();

  for (const computed of dirtyComputeds) {
    indegree.set(computed, 0);
  }

  for (const computed of dirtyComputeds) {
    for (const downstream of computed.computedSubscribers()) {
      if (!pendingSet.has(downstream)) continue;

      indegree.set(downstream, (indegree.get(downstream) ?? 0) + 1);
    }
  }

  const queue: ComputedImpl<unknown>[] = [];

  for (const computed of dirtyComputeds) {
    if ((indegree.get(computed) ?? 0) === 0) queue.push(computed);
  }

  const ordered: ComputedImpl<unknown>[] = [];

  while (queue.length > 0) {
    const computed = queue.shift()!;

    ordered.push(computed);

    for (const downstream of computed.computedSubscribers()) {
      if (!pendingSet.has(downstream)) continue;

      const nextIndegree = (indegree.get(downstream) ?? 0) - 1;

      indegree.set(downstream, nextIndegree);

      if (nextIndegree === 0) queue.push(downstream);
    }
  }

  // Cycle fallback: if not all nodes were ordered, a dependency cycle exists among computeds.
  // Append remaining in insertion order; the actual cycle will be caught by ComputedImpl.recompute().
  if (ordered.length < dirtyComputeds.length) {
    const orderedSet = new Set(ordered);

    for (const computed of dirtyComputeds) {
      if (!orderedSet.has(computed)) ordered.push(computed);
    }
  }

  return ordered;
};

const queueEffectsFromNode = (node: ReactiveNode): void => {
  const dirtyComputeds: ComputedImpl<unknown>[] = [...node.computedSubscribers()];
  const seenComputeds = new Set<ComputedImpl<unknown>>();

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
        if (downstream.markDirty()) pendingDirtyComputeds.add(downstream);
      }
    }
  }
};

const flushEffects = (): void => {
  let iterations = 0;

  while (pendingSubscribers.size > 0 || pendingDirtyComputeds.size > 0) {
    if (++iterations > config.maxIterations) {
      throw new StateError('INFINITE_LOOP', `infinite flush loop (> ${config.maxIterations} iterations)`);
    }

    if (pendingDirtyComputeds.size > 0) flushDirtyComputeds();

    if (pendingSubscribers.size === 0) continue;

    const subscribersToRun = [...pendingSubscribers];

    pendingSubscribers.clear();
    runAll(subscribersToRun, 'subscriber errors');
  }
};

const notifyNodeChange = (node: ReactiveNode): void => {
  if (!node.hasAnySubscribers()) return;

  queueEffectsFromNode(node);

  if (batchDepth === 0) flushEffects();
};

// === BASE REACTIVE NODE ===

class ReactiveNode {
  private computedSubs_ = new Set<ComputedImpl<unknown>>();
  private subscribers_ = new Set<Subscriber>();

  protected track(): void {
    const ctx = getTracking();

    if (!ctx?.subscriptions) return;

    if (ctx.computed !== null) {
      const owner = ctx.computed;

      this.computedSubs_.add(owner);
      ctx.subscriptions.add(() => this.computedSubs_.delete(owner));
    } else if (ctx.effect !== null) {
      const owner = ctx.effect;

      this.subscribers_.add(owner);
      ctx.subscriptions.add(() => this.subscribers_.delete(owner));
    }
  }

  protected notify(): void {
    notifyNodeChange(this);
  }

  protected clearSubscribers(): void {
    this.computedSubs_.clear();
    this.subscribers_.clear();
  }

  hasAnySubscribers(): boolean {
    return this.computedSubs_.size > 0 || this.subscribers_.size > 0;
  }

  computedSubscribers(): ReadonlySet<ComputedImpl<unknown>> {
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
  private disposed_ = false;
  [IS_SIGNAL] = true;

  constructor(initial: T, equals?: EqualityFn<T>) {
    super();
    this.value_ = initial;
    this.equals_ = equals ?? Object.is;
  }

  get value(): T {
    if (!this.disposed_) this.track();

    return this.value_;
  }

  peek(): T {
    return this.value_;
  }

  readonly subscribe = (listener: () => void): Subscription => {
    if (this.disposed_) return toSubscription(() => {});

    return super.subscribe(listener);
  };

  update(fn: (current: T) => T): void {
    this.value = fn(this.value_);
  }

  set value(next: T) {
    if (this.disposed_) return;

    if (this.equals_(this.value_, next)) return;

    this.value_ = next;
    this.notify();
  }

  /**
   * Marks the signal as permanently inert. After disposal:
   * - reads still return the last known value (but no longer track dependencies)
   * - writes are silently ignored
   * - new subscriptions are immediately unsubscribed
   * - all existing subscriber and computed-subscriber references are dropped
   */
  dispose(): void {
    if (this.disposed_) return;

    this.disposed_ = true;
    this.clearSubscribers();
  }

  derive<U>(fn: (value: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U> {
    return computed(() => fn(this.value), options);
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

// === STORE IMPLEMENTATION ===

class StoreImpl<T extends object> extends SignalImpl<T> implements Store<T> {
  private readonly initialSnapshot_: T;
  [IS_STORE] = true;

  constructor(initial: T) {
    super(structuredClone(initial));
    this.initialSnapshot_ = structuredClone(initial);
  }

  patch(partial: Partial<T>): void {
    if (typeof partial !== 'object' || partial === null || Array.isArray(partial)) {
      throw new StateError('INVALID_STORE', 'store.patch() requires a plain object partial.');
    }

    const current = this.peek();
    const hasChange = (Object.keys(partial) as Array<keyof T>).some((k) => !Object.is(current[k], partial[k]));

    if (hasChange) this.value = { ...current, ...partial };
  }

  override update(fn: (state: T) => T): void {
    const current = this.peek();
    const next = fn(current);

    if (next === current) {
      throw new StateError(
        'INVALID_STORE',
        'store.update() must return a new object — returning the same reference has no effect. ' +
          'Use store.patch() for partial updates, or spread: { ...state, key: newValue }.',
      );
    }

    this.value = next;
  }

  reset(): void {
    this.value = structuredClone(this.initialSnapshot_);
  }

  select<U>(selector: (state: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U> {
    return this.derive(selector, options);
  }
}

// === COMPUTED IMPLEMENTATION ===

class ComputedImpl<T> extends ReactiveNode implements ComputedSignal<T> {
  /** UNINITIALIZED sentinel replaces the hasValue_ flag — uninitialized state is explicit in the type. */
  private value_: T | typeof UNINITIALIZED = UNINITIALIZED;
  private dirty_ = true;
  private computing_ = false;
  private disposed_ = false;
  private subscriptions_ = new Set<CleanupFn>();
  private compute_: () => T;
  // Stored as (unknown, unknown) => boolean so ComputedImpl<T> is covariant in T,
  // enabling assignment to ComputedImpl<unknown> in the tracking-context collections.
  private equals_: (a: unknown, b: unknown) => boolean;
  [IS_SIGNAL] = true;
  [IS_COMPUTED] = true;

  constructor(compute: () => T, equals?: EqualityFn<T>) {
    super();
    this.compute_ = compute;
    this.equals_ = equals !== undefined ? (a, b) => equals(a as T, b as T) : Object.is;
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
      throw new StateError('COMPUTED_CYCLE', 'computed cycle detected');
    }

    for (const unsub of this.subscriptions_) unsub();
    this.subscriptions_.clear();

    this.computing_ = true;

    try {
      const next = withTracking(
        { cleanups: null, computed: this, effect: null, subscriptions: this.subscriptions_ },
        this.compute_,
      );

      this.dirty_ = false;

      const isNew = this.value_ === UNINITIALIZED;

      if (isNew || !this.equals_(this.value_ as T, next)) {
        this.value_ = next;

        return true;
      }

      return false;
    } catch (error) {
      const cleanupErrors = collectErrors(this.subscriptions_);

      this.subscriptions_.clear();

      return rethrowWithCleanupErrors(error, cleanupErrors, 'computed failed dependency cleanup errors');
    } finally {
      this.computing_ = false;
    }
  }

  get value(): T {
    if (this.disposed_) throw new StateError('DISPOSED_READ', 'Cannot read disposed computed signal');

    this.refreshIfDirty();
    this.track();

    return this.value_ as T;
  }

  peek(): T {
    if (this.disposed_) throw new StateError('DISPOSED_READ', 'Cannot read disposed computed signal');

    this.refreshIfDirty();

    return this.value_ as T;
  }

  readonly subscribe = (listener: () => void): Subscription => {
    if (this.disposed_) throw new StateError('DISPOSED_READ', 'Cannot subscribe to a disposed computed signal');

    // Eagerly establish dependencies so upstream writes can mark this node dirty.
    this.refreshIfDirty();

    return super.subscribe(listener);
  };

  dispose(): void {
    if (this.disposed_) return;

    this.disposed_ = true;

    for (const unsub of this.subscriptions_) unsub();
    this.subscriptions_.clear();
  }

  derive<U>(fn: (value: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U> {
    return computed(() => fn(this.value), options);
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

// === REACTIVE (FINE-GRAINED PROXY) ===

const isPlainObject = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val) && Object.getPrototypeOf(val) === Object.prototype;

const createReactiveProxy = <T extends object>(raw: T): T => {
  const propSignals = new Map<string, SignalImpl<unknown>>();
  const nestedCache = new Map<string, unknown>();

  const getPropSignal = (key: string, defaultValue: unknown): SignalImpl<unknown> => {
    if (!propSignals.has(key)) propSignals.set(key, new SignalImpl(defaultValue));

    return propSignals.get(key)!;
  };

  return new Proxy(raw, {
    deleteProperty(target, key) {
      const result = Reflect.deleteProperty(target, key);

      if (result && typeof key === 'string') {
        propSignals.delete(key);
        nestedCache.delete(key);
      }

      return result;
    },

    get(target, key) {
      if (key === IS_REACTIVE) return true;

      if (typeof key !== 'string') return Reflect.get(target, key);

      const rawVal = Reflect.get(target, key);

      if (isPlainObject(rawVal)) {
        if (!nestedCache.has(key)) nestedCache.set(key, createReactiveProxy(rawVal));

        // Register a dependency on this key so effects re-run when the property is replaced.
        void getPropSignal(key, rawVal).value;

        return nestedCache.get(key);
      }

      return getPropSignal(key, rawVal).value;
    },

    set(target, key, value) {
      if (typeof key !== 'string') return Reflect.set(target, key, value);

      // Guard against prototype chain injection: '__proto__' is an accessor on Object.prototype
      // whose setter calls Object.setPrototypeOf(). Silently drop writes to it so that
      // attacker-controlled keys cannot re-wire the reactive object's prototype chain.
      if (key === '__proto__') return true;

      // Use Object.defineProperty instead of Reflect.set / assignment to bypass any inherited
      // setters (e.g. if the prototype was already tampered with elsewhere).
      const descriptor = Object.getOwnPropertyDescriptor(target, key);

      if (descriptor && !descriptor.writable && !descriptor.set) return false;

      Object.defineProperty(target, key, { configurable: true, enumerable: true, value, writable: true });

      if (isPlainObject(value)) {
        nestedCache.set(key, createReactiveProxy(value));
      } else {
        nestedCache.delete(key);
      }

      getPropSignal(key, value).value = value;

      return true;
    },
  }) as T;
};

/**
 * Creates a deeply reactive proxy where each property has its own independent signal.
 * Effects only re-run when the specific properties they access change, not when unrelated
 * properties of the same object change.
 *
 * **Note:** only plain objects are supported. Arrays, class instances, Maps, and Sets
 * are not reactive. Nested plain objects are automatically made reactive.
 *
 * @example
 * ```ts
 * const state = reactive({ user: { name: 'Alice', age: 30 } });
 *
 * effect(() => console.log(state.user.name)); // only re-runs when name changes
 *
 * state.user.age = 31;         // effect does NOT re-run
 * state.user.name = 'Bob';     // effect re-runs
 * state.user = { name: 'Carol', age: 25 }; // effect re-runs — user replaced
 * ```
 */
export const reactive = <T extends object>(initial: T): T => {
  if (!isPlainObject(initial)) {
    throw new StateError('INVALID_REACTIVE', 'reactive() requires a plain object.');
  }

  return createReactiveProxy(structuredClone(initial));
};

export const isReactive = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && !!(value as Record<symbol, unknown>)[IS_REACTIVE];

// === CORE API ===

export const signal = <T>(initial: T, options?: ReactiveOptions<T>): Signal<T> =>
  new SignalImpl(initial, options?.equals);

/**
 * Creates a memoized derived value. Re-evaluates lazily when a dependency changes.
 *
 * **Auto-dispose:** when `computed()` is called inside an `effect()` or `scope.run()`,
 * it is automatically disposed when that owner disposes — no manual cleanup needed.
 * When called at module scope, call `.dispose()` or use the `using` declaration.
 *
 * @example
 * ```ts
 * const doubled = computed(() => count.value * 2);
 * using _ = doubled; // explicit cleanup at module scope
 *
 * effect(() => {
 *   const local = computed(() => count.value * 2); // auto-disposes with the effect
 * });
 * ```
 */
export const computed = <T>(compute: () => T, options?: ReactiveOptions<T>): ComputedSignal<T> => {
  const comp = new ComputedImpl(compute, options?.equals);
  const ctx = getTracking();

  // Auto-dispose when created inside an active effect or scope.
  if (ctx !== null && ctx.cleanups !== null) {
    ctx.cleanups.push(() => comp.dispose());
  }

  return comp;
};

export const batch = <T>(fn: () => T): T => {
  // Batch coalesces notifications. Writes that happen before an error are not rolled back.
  // Pending subscribers still flush, and caller-visible errors are aggregated.
  batchDepth++;

  let result: T | undefined;
  let bodyError: unknown = _NONE;

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
      if (bodyError !== _NONE) {
        throw new AggregateError([bodyError, flushError], '[stateit] batch error with flush errors', {
          cause: flushError,
        });
      }

      throw ensureError(flushError);
    }
  }

  if (bodyError !== _NONE) throw ensureError(bodyError);

  return result as T;
};

export const effect = (fn: EffectCallback): Subscription => {
  let cleanup: CleanupFn | undefined;
  const subscriptions = new Set<CleanupFn>();
  let isRunning = false;
  let isDirty = false;
  let isDisposed = false;

  const teardown = (): void => {
    if (!cleanup && subscriptions.size === 0) return;

    const callbacks = cleanup ? [cleanup, ...subscriptions] : [...subscriptions];

    cleanup = undefined;
    subscriptions.clear();

    runAll(callbacks, 'effect teardown errors');
  };

  // The inner do-while handles self-cascade: when the effect body writes to a signal it reads,
  // the resulting recursive flushEffects() call sets isDirty via the isRunning guard.
  // The outer flush loop handles cross-effect cascade writes.
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
        if (++iterations > config.maxIterations) {
          throw new StateError('INFINITE_LOOP', `infinite effect loop (> ${config.maxIterations} iterations)`);
        }

        isDirty = false;
        teardown();

        const localCleanups: CleanupFn[] = [];
        let returnedCleanup: CleanupFn | void = undefined;

        try {
          returnedCleanup = withTracking({ cleanups: localCleanups, computed: null, effect: run, subscriptions }, fn);
        } catch (error) {
          const cleanupErrors = [...collectErrors(subscriptions), ...collectErrors(localCleanups)];

          subscriptions.clear();
          rethrowWithCleanupErrors(error, cleanupErrors, 'effect failure with cleanup errors');
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
 * If the async callback returns a cleanup function, it is called before the next run and on
 * dispose. Errors from aborted runs are silently dropped; other errors are passed to
 * `options.onError` (defaults to surfacing as an unhandled promise rejection).
 *
 * Returns an {@link AsyncSubscription} — call `disposeAsync()` to await full teardown:
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
 * // Graceful shutdown:
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
      // Surface as an unhandled rejection so the host environment can log it.
      void Promise.reject(err);
    });

  const syncStop = effect(() => {
    // Abort previous async run and call its resolved cleanup (if any).
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

  const dispose = syncStop;

  const disposeAsync = async (): Promise<void> => {
    const runningPromise = currentRunPromise;

    syncStop(); // abort in-flight work via the effect cleanup

    if (runningPromise) await runningPromise; // wait for it to settle
  };

  return Object.assign(dispose, { dispose, disposeAsync, [Symbol.dispose]: dispose }) as AsyncSubscription;
};

export const untrack = <T>(fn: () => T): T => withTracking(null, fn);

export const readonly = <T>(source: ReadonlySignal<T>): ReadonlySignal<T> =>
  Object.assign(
    {
      derive: <U>(fn: (v: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U> => source.derive(fn, options),
      peek: () => source.peek(),
      subscribe: (listener: () => void) => source.subscribe(listener),
      get value() {
        return source.value;
      },
    },
    { [IS_SIGNAL]: true },
  ) as ReadonlySignal<T>;

export const onCleanup = (fn: CleanupFn): void => {
  const ctx = getTracking();

  if (ctx === null || ctx.cleanups === null) {
    throw new StateError('INVALID_CLEANUP', 'onCleanup() must be called from within an active effect or scope.');
  }

  ctx.cleanups.push(fn);
};

export const scope = (setup?: () => void): Scope => {
  const cleanups: CleanupFn[] = [];
  let disposed = false;

  const run = <T>(fn: () => T): T => {
    if (disposed) throw new StateError('DISPOSED_SCOPE', 'Cannot run inside a disposed scope.');

    return withTracking({ cleanups, computed: null, effect: null, subscriptions: null }, fn);
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

/**
 * Watches a signal or getter for changes and calls `cb(value, prev)` each time.
 *
 * - When `immediate: false` (default), does not fire on the first run.
 * - When `immediate: true`, fires immediately — `prev` is `undefined` on the first call.
 */
export const watch = <T>(
  source: ReadonlySignal<T> | (() => T),
  cb: (value: T, prev: T | undefined) => void,
  options?: WatchOptions<T>,
): Subscription => {
  const get = typeof source === 'function' ? source : () => source.value;
  const equals = options?.equals ?? Object.is;
  let initialized = false;
  let prev: T | undefined;

  if (options?.immediate) {
    prev = untrack(get);
    initialized = true;
    cb(prev, undefined);
  }

  return effect(() => {
    const next = get();

    if (!initialized) {
      initialized = true;
      prev = next;

      return;
    }

    if (equals(prev as T, next)) return;

    const old = prev;

    prev = next;
    cb(next, old);
  });
};

export const store = <T extends object>(initial: T): Store<T> => {
  if (typeof initial !== 'object' || initial === null || Array.isArray(initial)) {
    throw new StateError('INVALID_STORE', 'store() requires a plain object initial state.');
  }

  return new StoreImpl(initial);
};

// === TYPE GUARDS ===

export const isSignal = <T = unknown>(value: unknown): value is ReadonlySignal<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_SIGNAL, unknown>)[IS_SIGNAL];

export const isComputed = <T = unknown>(value: unknown): value is ComputedSignal<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_COMPUTED, unknown>)[IS_COMPUTED];

export const isStore = <T extends object = object>(value: unknown): value is Store<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_STORE, unknown>)[IS_STORE];

/**
 * Returns a Promise that resolves after the current microtask queue drains.
 * Useful in tests and async coordination to let pending {@link effectAsync} runs start.
 *
 * @example
 * ```ts
 * count.value = 10;
 * await tick();
 * // effectAsync handlers that depend on count have now started (but may not have completed)
 * ```
 */
export const tick = (): Promise<void> => Promise.resolve();

// === REACTIVE ARRAY ===

const MUTATING_ARRAY_METHODS = new Set([
  'copyWithin',
  'fill',
  'pop',
  'push',
  'reverse',
  'shift',
  'sort',
  'splice',
  'unshift',
]);

/**
 * Creates a reactive array where each index and `length` have independent signals.
 * Effects re-run only when the specific indices or `length` they read are written.
 *
 * Mutating methods (`push`, `pop`, `splice`, `sort`, etc.) are automatically batched so all
 * downstream effects see a consistent snapshot after each operation.
 *
 * Only standard array mutations are supported. For reactive objects, use {@link reactive}.
 *
 * @example
 * ```ts
 * const items = reactiveArray([1, 2, 3]);
 *
 * effect(() => console.log('length:', items.length));   // re-runs when length changes
 * effect(() => console.log('first:', items[0]));        // re-runs only when index 0 changes
 *
 * items.push(4);   // triggers length effect
 * items[0] = 10;   // triggers first effect
 * items.sort();    // batched — triggers effects for all changed indices
 * ```
 */
export const reactiveArray = <T>(initial: readonly T[] = []): T[] => {
  const raw: T[] = [...initial];
  const indexSignals = new Map<number, SignalImpl<T | undefined>>();
  const lengthSignal = new SignalImpl<number>(raw.length);

  const getIndexSignal = (i: number): SignalImpl<T | undefined> => {
    if (!indexSignals.has(i)) indexSignals.set(i, new SignalImpl<T | undefined>(raw[i]));

    return indexSignals.get(i)!;
  };

  let proxy: T[];

  // eslint-disable-next-line prefer-const
  proxy = new Proxy(raw, {
    deleteProperty(target, key) {
      const result = Reflect.deleteProperty(target, key);

      if (result && typeof key === 'string') {
        const numKey = Number(key);

        if (Number.isInteger(numKey) && numKey >= 0 && String(numKey) === key) {
          if (indexSignals.has(numKey)) {
            indexSignals.get(numKey)!.value = undefined;
            indexSignals.delete(numKey);
          }

          if (target.length !== lengthSignal.peek()) {
            lengthSignal.value = target.length;
          }
        }
      }

      return result;
    },

    get(target, key, receiver) {
      if (key === IS_REACTIVE_ARRAY) return true;

      if (typeof key === 'symbol') return Reflect.get(target, key, receiver);

      if (key === 'length') return lengthSignal.value;

      const numKey = Number(key);

      if (Number.isInteger(numKey) && numKey >= 0 && String(numKey) === key) {
        return getIndexSignal(numKey).value;
      }

      if (MUTATING_ARRAY_METHODS.has(key)) {
        const method = Reflect.get(target, key) as (...args: unknown[]) => unknown;

        return (...args: unknown[]) => batch(() => method.apply(proxy, args));
      }

      return Reflect.get(target, key, receiver);
    },

    set(target, key, value) {
      if (key === '__proto__') return true;

      if (typeof key === 'symbol') return Reflect.set(target, key, value);

      if (key === 'length') {
        const prevLength = target.length;
        const newLength = value as number;

        target.length = newLength;

        // Notify and clean up signals for truncated indices.
        for (let i = newLength; i < prevLength; i++) {
          if (indexSignals.has(i)) {
            indexSignals.get(i)!.value = undefined;
            indexSignals.delete(i);
          }
        }

        lengthSignal.value = newLength;

        return true;
      }

      const numKey = Number(key);

      if (Number.isInteger(numKey) && numKey >= 0 && String(numKey) === key) {
        const prevLength = target.length;

        target[numKey] = value as T;
        getIndexSignal(numKey).value = value as T;

        if (target.length !== prevLength) {
          lengthSignal.value = target.length;
        }

        return true;
      }

      return Reflect.set(target, key, value);
    },
  }) as T[];

  return proxy;
};

/** Returns `true` when `value` is a {@link reactiveArray} proxy. */
export const isReactiveArray = (value: unknown): value is unknown[] =>
  Array.isArray(value) && !!(value as unknown as Record<symbol, unknown>)[IS_REACTIVE_ARRAY];

// === MEMO ===

/**
 * Creates a memoized derived value. `fn` is re-evaluated only when the array returned by
 * `deps` changes (each element compared with `Object.is`). Signals read _inside_ `fn` do
 * **not** invalidate the memo — only changes to `deps` trigger re-evaluation.
 *
 * Use inside templates or expensive computations where you want to skip re-rendering when
 * a specific subset of reactive state changes:
 *
 * @example
 * ```ts
 * const itemView = memo(() => [item.id, item.name], () => expensiveRender(item));
 *
 * // Inside a craftit template — skips re-rendering when only unrelated signals change:
 * html`<li>${memo(() => [item.id], () => html`<span>${item.name}</span>`)}</li>`
 * ```
 */
export const memo = <T>(deps: () => readonly unknown[], fn: () => T): ReadonlySignal<T> => {
  let previousDeps: readonly unknown[] = [];
  let cached: T | undefined;
  let initialized = false;

  return computed(() => {
    const currentDeps = deps();
    const changed =
      !initialized ||
      currentDeps.length !== previousDeps.length ||
      currentDeps.some((d, i) => !Object.is(d, previousDeps[i]));

    if (changed) {
      cached = untrack(fn);
      previousDeps = currentDeps;
      initialized = true;
    }

    return cached as T;
  });
};

// ── Synced signal ─────────────────────────────────────────────────────────────

/**
 * Creates a locally-writable signal that stays in sync with an external
 * `ReadonlySignal` source. The optional `transform` function can coerce the
 * input type (e.g. `T | undefined` → `boolean`).
 *
 * Use this when a component needs to both reflect an externally-controlled
 * value AND allow internal mutations (e.g. a checkbox that can be toggled
 * locally but also reset by a parent).
 *
 * @example
 * ```ts
 * const checked = syncedSignal(props.checked, (v) => Boolean(v));
 * ```
 */
export const syncedSignal = <TIn, TOut = TIn>(
  source: ReadonlySignal<TIn>,
  transform: (v: TIn) => TOut = (v) => v as unknown as TOut,
): Signal<TOut> => {
  const local = signal(transform(source.value));

  watch(source, (next) => {
    local.value = transform(next);
  });

  return local;
};
