/** stateit -- Lightweight reactive state
 *
 * Reactive primitives:
 *   Signal<T>         -- synchronous, fine-grained reactive atom
 *   ReadonlySignal<T> -- read-only view of a signal
 *   Store<T>          -- object-state store with set/freeze/reset/select
 *
 * All primitives interoperate: computed, derived, effect, watch, batch,
 * untrack, onCleanup, toValue, configureStateit work uniformly
 * on Signal<T> and Store<T>.
 */

/* ========== Internal reactive runtime ========== */

/** A function that tears down a subscription or effect. */
export type CleanupFn = () => void;
/** The shape of a function passed to `effect()`. Can return an optional cleanup. */
export type EffectCallback = () => CleanupFn | void;
type EffectFn = EffectCallback; // internal alias

/** @internal Active reactive tracking scope — null outside any effect/computed. */
const scope = {
  cleanups: null as CleanupFn[] | null,
  deps: null as Set<CleanupFn> | null,
  effect: null as EffectFn | null,
};

/** @internal Deferred notification queue — active only during batch(). */
const queue = {
  depth: 0,
  pending: new Set<EffectFn>(),
};

export const _SIGNAL_BRAND = Symbol('stateit.signal');
export const _STORE_BRAND = Symbol('stateit.store');

const _UNINITIALIZED = Symbol('stateit.uninitialized');

/** @internal True outside of production builds; gates dev-only warnings. */
const _DEV = import.meta.env.DEV;

export type EqualityFn<T> = (a: T, b: T) => boolean;

/** Options accepted by signal(), computed(), writable(), and store(). */
export type ReactiveOptions<T> = { equals?: EqualityFn<T> };

/** Shared interface for disposable reactive values (computed, writable). Supports the TC39 `using` declaration. */
export interface Disposable {
  dispose(): void;
  [Symbol.dispose](): void;
}

/**
 * A callable subscription handle returned by `effect()` and `watch()`.
 * Can be called directly or via `.dispose()` to stop the subscription.
 * Supports the TC39 `using` declaration via `[Symbol.dispose]`.
 */
export interface Subscription {
  (): void;
  dispose(): void;
  [Symbol.dispose](): void;
}

/* ========== configureStateit ========== */

let _maxEffectIterations = 100;

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

/* ========== ReactiveNode — shared subscriber-management base ========== */

/** @internal Base reactive node: manages a subscriber set and batch-aware notification. */
class ReactiveNode {
  #subscribers = new Set<EffectFn>();

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

/* ========== Signal ========== */

/** Public read-only signal interface. */
export interface ReadonlySignal<T> {
  readonly [_SIGNAL_BRAND]: true;
  readonly value: T;
  peek(): T;
}

/** Public read/write signal interface. */
export interface Signal<T> extends ReadonlySignal<T> {
  value: T;
  /** Update the value by applying a function to the current value. */
  update(fn: (current: T) => T): void;
}

/** @internal */
class SignalImpl<T> extends ReactiveNode implements Signal<T> {
  readonly [_SIGNAL_BRAND] = true as const;
  #value: T;
  #equals: EqualityFn<T>;

  constructor(initial: T, options?: ReactiveOptions<T>) {
    super();
    this.#value = initial;
    this.#equals = options?.equals ?? Object.is;
  }

  get value(): T {
    this._track();

    return this.#value;
  }

  set value(next: T) {
    if (this.#equals(this.#value, next)) return;

    this.#value = next;
    this._notify();
  }

  update(fn: (current: T) => T): void {
    this.value = fn(this.#value);
  }

  peek(): T {
    return this.#value;
  }
}

/** Creates a reactive signal holding a single value. */
export const signal = <T>(initial: T, options?: ReactiveOptions<T>): Signal<T> => new SignalImpl(initial, options);

const _readonlyCache = new WeakMap<object, ReadonlySignal<unknown>>();

/**
 * Returns a stable read-only view of a signal. Hides the setter at both type and runtime
 * level. The wrapper is cached — repeated calls with the same signal return the same reference.
 */
export const readonly = <T>(sig: ReadonlySignal<T>): ReadonlySignal<T> => {
  const cached = _readonlyCache.get(sig as object);

  if (cached) return cached as ReadonlySignal<T>;

  const wrapper: ReadonlySignal<T> = {
    get [_SIGNAL_BRAND]() {
      return true as const;
    },
    peek: () => sig.peek(),
    get value() {
      return sig.value;
    },
  };

  _readonlyCache.set(sig as object, wrapper as ReadonlySignal<unknown>);

  return wrapper;
};

/** Type guard -- identifies Signal instances (works through composition and subclasses). */
export const isSignal = <T = unknown>(value: unknown): value is ReadonlySignal<T> =>
  typeof value === 'object' && value !== null && _SIGNAL_BRAND in (value as object);

/** Unwraps a plain value or Signal to its current value. Reads are tracked if called inside an effect. */
export const toValue = <T>(v: T | ReadonlySignal<T>): T => (isSignal<T>(v) ? v.value : v);

/* ========== effect / untrack / onCleanup ========== */

/** @internal Save scope fields, swap to new tracking context, call fn, restore. */
const _withCtx = <T>(
  eff: EffectFn | null,
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
  let deps = new Set<CleanupFn>();
  let running = false;
  let dirty = false;
  let disposed = false;
  const maxIter = options?.maxIterations ?? _maxEffectIterations;

  /** Runs a single iteration: tears down previous deps/cleanup, re-executes fn, registers fresh deps.
   *  Returns true if onError handled a throw (caller should break the loop). */
  const runIteration = (): boolean => {
    dirty = false;
    cleanup?.();
    cleanup = undefined;
    for (const unsub of deps) unsub();
    deps = new Set();

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
      options!.onError!(thrownError);
      disposed = true;
      for (const unsub of deps) unsub();
      deps = new Set();
    }

    return threw;
  };

  const runner: EffectFn = () => {
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
    cleanup?.();
    cleanup = undefined;
    for (const unsub of deps) unsub();
    deps = new Set();
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
  scope.cleanups?.push(fn);
};

/* ========== computed / writable ========== */

/** A derived read-only signal with an explicit dispose method. */
export interface ComputedSignal<T> extends ReadonlySignal<T>, Disposable {
  /** True when the computed value is stale (deps changed but not yet re-read) or disposed. */
  readonly stale: boolean;
}

/** @internal
 * Lazy computed node. Seeded once at construction so .peek() is immediately valid
 * (unless { lazy: true } is passed, in which case first compute defers to first read).
 *  - On dep change: marks dirty, notifies downstream (no recompute yet).
 *  - On .value read: recomputes if dirty, re-tracks fresh deps.
 *  - After dispose: _track() is skipped to prevent leaking outer effects.
 * Directly implements ComputedSignal<T> — no wrapper object allocation.
 */
class ComputedNode<T> extends ReactiveNode implements ComputedSignal<T> {
  readonly [_SIGNAL_BRAND] = true as const;
  #compute: () => T;
  #value: T | typeof _UNINITIALIZED = _UNINITIALIZED;
  #dirty = true;
  #disposed = false;
  #equals: EqualityFn<T>;
  #deps = new Set<CleanupFn>();

  readonly #onDepChange: EffectFn = () => {
    if (!this.#dirty) {
      this.#dirty = true;
      this._notify();
    }
  };

  constructor(compute: () => T, options?: ReactiveOptions<T> & { lazy?: boolean }) {
    super();
    this.#compute = compute;
    this.#equals = options?.equals ?? Object.is;

    if (!options?.lazy) this.#recompute(); // seed: ensures peek() is valid immediately
  }

  #recompute(): void {
    for (const unsub of this.#deps) unsub();
    this.#deps = new Set();

    const result = _withCtx(this.#onDepChange, this.#deps, null, this.#compute);

    this.#dirty = false;

    if (this.#value === _UNINITIALIZED || !this.#equals(this.#value as T, result)) {
      this.#value = result;
    }
  }

  get value(): T {
    if (this.#disposed) {
      if (_DEV) console.warn('[stateit] Reading a disposed ComputedSignal returns a stale value.');

      return this.#value as T;
    }

    if (this.#dirty) this.#recompute();

    this._track();

    return this.#value as T;
  }

  peek(): T {
    if (this.#value === _UNINITIALIZED) this.#recompute();

    return this.#value as T;
  }

  get stale(): boolean {
    return this.#dirty || this.#disposed;
  }

  dispose(): void {
    if (this.#disposed) return;

    this.#disposed = true;
    for (const unsub of this.#deps) unsub();
    this.#deps = new Set();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

/** Creates a derived read-only Signal whose value is recomputed lazily on `.value` read
 * when dependencies have changed. Call `.dispose()` to stop tracking and free dependencies.
 * Pass `{ lazy: true }` to defer the initial computation until the first `.value` read. */
export const computed = <T>(compute: () => T, options?: ReactiveOptions<T> & { lazy?: boolean }): ComputedSignal<T> => {
  const node = new ComputedNode(compute, options);

  return {
    get [_SIGNAL_BRAND]() {
      return true as const;
    },
    dispose: () => node.dispose(),
    peek: () => node.peek(),
    get stale() {
      return node.stale;
    },
    [Symbol.dispose]: () => node.dispose(),
    get value() {
      return node.value;
    },
  };
};

/** A bidirectional computed Signal with an explicit dispose method. */
export interface WritableSignal<T> extends Signal<T>, Disposable {
  /** True when the backing computed value is stale (deps changed but not yet re-read) or disposed. */
  readonly stale: boolean;
}

/** Creates a bidirectional computed Signal. Reads track the getter reactively;
 * writes are forwarded to `set`. Call `.dispose()` to stop tracking and free dependencies. */
export const writable = <T>(get: () => T, set: (value: T) => void, options?: ReactiveOptions<T>): WritableSignal<T> => {
  const node = new ComputedNode(get, options);

  return {
    get [_SIGNAL_BRAND]() {
      return true as const;
    },
    dispose: () => node.dispose(),
    peek: () => node.peek(),
    get stale() {
      return node.stale;
    },
    [Symbol.dispose]: () => node.dispose(),
    update: (fn: (current: T) => T) => {
      set(fn(node.peek()));
    },
    get value() {
      return node.value;
    },
    set value(v: T) {
      set(v);
    },
  } as WritableSignal<T>;
};

/**
 * Creates a derived ComputedSignal by combining multiple source signals through a projector
 * function. Each source is passed as a positional argument to `fn`; the projector is
 * re-evaluated whenever any source changes.
 *
 * @example
 * const total = derived([price, quantity, discount], (p, q, d) => p * q * (1 - d));
 */
export const derived = <const Srcs extends ReadonlyArray<ReadonlySignal<unknown>>, R>(
  sources: Srcs,
  fn: (...values: { [K in keyof Srcs]: Srcs[K] extends ReadonlySignal<infer V> ? V : never }) => R,
  options?: ReactiveOptions<R>,
): ComputedSignal<R> => computed(() => (fn as (...args: any[]) => R)(...sources.map((s) => s.value)), options);

/* ========== batch ========== */

/** @internal Drain and run all pending effects from the batch queue, collecting errors. */
const _flushPending = (): void => {
  const toFlush = [...queue.pending];

  queue.pending.clear();

  const errors: unknown[] = [];

  for (const f of toFlush) {
    try {
      f();
    } catch (e) {
      errors.push(e);
    }
  }

  if (errors.length) throw errors.length === 1 ? errors[0] : new AggregateError(errors, '[stateit] batch errors');
};

/** Runs fn and defers all Signal notifications until fn returns, then flushes once. */
export const batch = <T>(fn: () => T): T => {
  queue.depth++;

  try {
    const result = fn();

    if (--queue.depth === 0) _flushPending();

    return result;
  } catch (e) {
    if (--queue.depth === 0) {
      try {
        _flushPending();
      } catch {
        /* fn error takes precedence */
      }
    }

    throw e;
  }
};

/* ========== watch ========== */

export type WatchOptions<T> = {
  /** Custom equality; suppresses the callback when old and new values are equal. Default: Object.is */
  equals?: EqualityFn<T>;
  /** Fire the callback immediately with the current value on subscribe. */
  immediate?: boolean;
  /**
   * Auto-unsubscribe after the first *change* invocation.
   * When combined with `immediate`, the immediate call does not count against this quota —
   * the callback may fire up to twice total.
   */
  once?: boolean;
};

/**
 * Watches a Signal and calls cb when its value changes. Returns a dispose handle.
 * Does not fire on initial subscription unless `{ immediate: true }` is passed.
 * To watch a derived slice, compose with `store.select()` or `computed()`:
 *
 * @example
 * const stop = watch(count, (next, prev) => console.log(prev, '->', next));
 * const stop = watch(userStore.select(s => s.name), (name) => ...);
 */
export const watch = <T>(
  source: ReadonlySignal<T>,
  cb: (value: T, prev: T) => void,
  options?: WatchOptions<T>,
): Subscription => {
  const eq: EqualityFn<T> = options?.equals ?? Object.is;
  let prev = source.peek();

  if (options?.immediate) cb(prev, prev);

  const dispose = effect(() => {
    const next = source.value;

    if (!eq(prev, next)) {
      const old = prev;

      prev = next;
      cb(next, old);

      if (options?.once) dispose();
    }
  });

  return dispose;
};

/**
 * Returns a Promise that resolves with the next value of `source` that satisfies the optional predicate.
 * Disposes automatically after one emission — no cleanup needed.
 *
 * @example
 * const name = await nextValue(userStore.select(s => s.name));
 * const nonZero = await nextValue(count, v => v > 0);
 */
export const nextValue = <T>(source: ReadonlySignal<T>, predicate?: (v: T) => boolean): Promise<T> =>
  new Promise<T>((resolve) => {
    const stop = watch(source, (v) => {
      if (!predicate || predicate(v)) {
        stop();
        resolve(v);
      }
    });
  });

/* ========== Store ========== */

/**
 * Shallow structural equality — compares own enumerable keys by reference.
 * This is the default equality function used by `store()`. Export it to avoid
 * reimplementation when composing custom `StoreOptions.equals`.
 */
export const shallowEqual: EqualityFn<unknown> = (a, b) => {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
  }

  return true;
};

export type StoreOptions<T extends object> = {
  /** Custom equality for top-level change detection. Default: shallowEqual */
  equals?: EqualityFn<T>;
};

/** Reactive store for object state. Implements Signal<T> so all signal primitives work natively. */
export interface Store<T extends object> extends Signal<T> {
  readonly frozen: boolean;
  /** Shallow-merge a partial object into the current state. */
  patch(partial: Partial<T>): void;
  /** Derive the next state from the current state via an updater function.
   *  Receives a shallow copy of the current state — mutations in the updater are safe. */
  update(fn: (s: T) => T): void;
  /** Reset to the original initial state. */
  reset(): void;
  /** Create a lazily recomputed derived signal from a slice of this store's state. */
  select<U>(selector: (s: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U>;
  /** Freeze the store. Further writes via patch/update/reset are silently ignored. */
  freeze(): void;
}

/** @internal */
class StoreImpl<T extends object> extends SignalImpl<T> implements Store<T> {
  readonly [_STORE_BRAND] = true as const;

  readonly #initial: T;
  #frozen = false;

  constructor(initial: T, options?: StoreOptions<T>) {
    super(initial, { equals: options?.equals ?? (shallowEqual as EqualityFn<T>) });
    this.#initial = { ...initial }; // defensive copy — external mutation cannot corrupt reset()
  }

  get frozen(): boolean {
    return this.#frozen;
  }

  override get value(): T {
    return super.value;
  }

  override set value(next: T) {
    if (!this.#frozen) super.value = next;
  }

  patch(partial: Partial<T>): void {
    if (!this.#frozen) this.value = { ...this.peek(), ...partial };
  }

  update(fn: (s: T) => T): void {
    if (!this.#frozen) this.value = fn({ ...this.peek() });
  }

  reset(): void {
    if (!this.#frozen) this.value = this.#initial;
  }

  select<U>(selector: (s: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U> {
    return computed(() => selector(this.value), options);
  }

  freeze(): void {
    this.#frozen = true;
  }
}

/** Creates a reactive store for the object state. */
export const store = <T extends object>(initial: T, options?: StoreOptions<T>): Store<T> =>
  new StoreImpl(initial, options);

/** Type guard -- identifies Store instances. */
export const isStore = <T extends object = Record<string, unknown>>(value: unknown): value is Store<T> =>
  typeof value === 'object' && value !== null && _STORE_BRAND in value;
