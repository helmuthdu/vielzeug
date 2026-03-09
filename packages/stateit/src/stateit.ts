/** stateit -- Lightweight reactive state
 *
 * Reactive primitives:
 *   Signal<T>         -- synchronous, fine-grained reactive atom
 *   ReadonlySignal<T> -- read-only view of a signal
 *   ComputedSignal<T> -- derived read-only signal with dispose()
 *   Store<T>          -- object-state store with set/reset/watch/dispose
 *
 * Store is Signal-compatible: computed, effect, watch, batch, readonly, toValue
 * all accept Signal<T> and work on Store<T> natively.
 */

/* ========== Internal reactive runtime ========== */

/** A function that tears down a subscription or effect. */
export type CleanupFn = () => void;
// biome-ignore lint/suspicious/noConfusingVoidType: void needed for optional cleanup return
export type EffectFn = () => CleanupFn | void;

/** @internal Centralised reactive context -- avoids scattered module-level globals. */
const ctx = {
  batchDepth: 0,
  currentDeps: null as Set<SignalImpl<unknown>> | null,
  currentEffect: null as EffectFn | null,
  pendingEffects: new Set<EffectFn>(),
};

const _SIGNAL_BRAND = Symbol('stateit.signal');
const _STORE_BRAND = Symbol('stateit.store');
const _REMOVE_SUBSCRIBER = Symbol('stateit.removeSubscriber');

/* ========== Signal ========== */

/** Public read-only signal interface -- minimal surface: value and peek only. */
export interface ReadonlySignal<T> {
  readonly [_SIGNAL_BRAND]: true;
  readonly value: T;
  peek(): T;
}

/** Public read/write signal interface. */
export interface Signal<T> extends ReadonlySignal<T> {
  value: T;
}

/** @internal Implementation class -- not intended for direct subclassing by consumers. */
class SignalImpl<T> implements Signal<T> {
  readonly [_SIGNAL_BRAND] = true as const;

  #subscribers = new Set<EffectFn>();
  #value: T;

  constructor(initial: T) {
    this.#value = initial;
  }

  get value(): T {
    if (ctx.currentDeps) {
      this.#subscribers.add(ctx.currentEffect!);
      ctx.currentDeps.add(this as SignalImpl<unknown>);
    }
    return this.#value;
  }

  set value(next: T) {
    this.#notify(next);
  }

  #notify(next: T): void {
    if (Object.is(this.#value, next)) return;
    this.#value = next;
    if (ctx.batchDepth > 0) {
      for (const fn of this.#subscribers) ctx.pendingEffects.add(fn);
      return;
    }
    // Snapshot before iterating -- effect runners unsubscribe and re-subscribe during execution.
    // Collect errors so all subscribers are notified even when one throws.
    const errors: unknown[] = [];
    for (const fn of [...this.#subscribers]) {
      try {
        fn();
      } catch (e) {
        errors.push(e);
      }
    }
    _rethrow(errors, '[stateit] multiple subscriber errors');
  }

  [_REMOVE_SUBSCRIBER](fn: EffectFn): void {
    this.#subscribers.delete(fn);
  }

  peek(): T {
    return this.#value;
  }
}

/** Creates a reactive signal holding a single value. */
export const signal = <T>(initial: T): Signal<T> => new SignalImpl(initial);

const _noop: CleanupFn = () => {};

/** @internal Rethrow collected subscriber errors -- 1 error rethrown as-is, multiple as AggregateError. */
const _rethrow = (errors: unknown[], msg: string): void => {
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, msg);
};

/** Type guard -- identifies Signal instances without instanceof (works through Proxies and subclasses). */
export const isSignal = <T = unknown>(value: unknown): value is ReadonlySignal<T> =>
  typeof value === 'object' && value !== null && _SIGNAL_BRAND in value;

/** Unwraps a plain value or Signal to its current value. Reads are tracked if called inside an effect. */
export const toValue = <T>(v: T | ReadonlySignal<T>): T => (isSignal<T>(v) ? v.value : v);

// biome-ignore lint/suspicious/noExplicitAny: required to bind internal fields through Proxy
const _proxyGet = (target: ReadonlySignal<any>, prop: string | symbol) => {
  const val = Reflect.get(target, prop, target);
  return typeof val === 'function' ? val.bind(target) : val;
};

/** Wraps a Signal in a Proxy that throws on writes to `value`. */
export const readonly = <T>(s: ReadonlySignal<T>): ReadonlySignal<T> =>
  new Proxy(s, {
    get: _proxyGet,
    set(_target, prop, _value, receiver) {
      if (prop === 'value') throw new TypeError('[stateit] Cannot assign to value on a ReadonlySignal');
      return Reflect.set(_target, prop, _value, receiver);
    },
  }) as ReadonlySignal<T>;

/* ========== effect / untrack ========== */

/** @internal Save ctx, set to (eff, deps), call fn, restore -- shared by effect and untrack. */
const _withCtx = <T>(eff: EffectFn | null, deps: Set<SignalImpl<unknown>> | null, fn: () => T): T => {
  const pe = ctx.currentEffect;
  const pd = ctx.currentDeps;
  ctx.currentEffect = eff;
  ctx.currentDeps = deps;
  try {
    return fn();
  } finally {
    ctx.currentEffect = pe;
    ctx.currentDeps = pd;
  }
};

/** Runs fn immediately and re-runs it whenever any Signal read inside it changes. Returns a dispose fn. */
export const effect = (fn: EffectFn): CleanupFn => {
  let cleanup: CleanupFn | undefined;
  let deps = new Set<SignalImpl<unknown>>();
  let running = false;
  let dirty = false;

  const runner: EffectFn = () => {
    // Re-entrancy guard: if fn() writes to a signal it reads, defer the re-run until the
    // current execution finishes rather than recursing. The do-while loop then replays it.
    if (running) {
      dirty = true;
      return;
    }
    running = true;
    try {
      let iterations = 0;
      do {
        if (++iterations > 100) throw new Error('[stateit] effect: possible infinite reactive loop (> 100 iterations)');
        dirty = false;
        // Clear cleanup before calling it -- prevents double-call when fn() throws.
        const prev = cleanup;
        cleanup = undefined;
        prev?.();
        for (const sig of deps) sig[_REMOVE_SUBSCRIBER](runner);
        deps = new Set();
        _withCtx(runner, deps, () => {
          const result = fn();
          cleanup = typeof result === 'function' ? result : undefined;
        });
      } while (dirty);
    } finally {
      running = false;
    }
  };

  runner();

  return () => {
    cleanup?.();
    cleanup = undefined;
    for (const sig of deps) sig[_REMOVE_SUBSCRIBER](runner);
    deps = new Set();
  };
};

/** Runs fn without registering any reactive dependencies. Useful for reading signals inside an effect
 * without creating subscriptions. */
export const untrack = <T>(fn: () => T): T => _withCtx(null, null, fn);

/* ========== ComputedSignal / writable ========== */

/** A computed (derived) Signal: read-only value + a `dispose()` to stop recomputation and free deps. */
export class ComputedSignal<T> implements ReadonlySignal<T> {
  readonly [_SIGNAL_BRAND] = true as const;
  readonly dispose: CleanupFn;

  readonly #sig: SignalImpl<T>;

  constructor(compute: () => T) {
    this.#sig = new SignalImpl<T>(null!);
    this.dispose = effect(() => {
      this.#sig.value = compute();
    });
  }

  get value(): T {
    return this.#sig.value;
  }

  peek(): T {
    return this.#sig.peek();
  }
}

/** Creates a derived read-only Signal whose value is recomputed whenever its dependencies change.
 * Call `.dispose()` when the computed is no longer needed to stop recomputation and free deps. */
export const computed = <T>(compute: () => T): ComputedSignal<T> => new ComputedSignal(compute);

/** A bi-directional computed Signal: reactive read, writes forwarded to a setter, `dispose()` to stop tracking. */
export interface WritableSignal<T> extends Signal<T> {
  dispose(): void;
}

/**
 * Creates a bi-directional computed Signal. Reads track the getter reactively;
 * writes are forwarded to `set`. Useful for form adapters and transformations that write back.
 * Call `.dispose()` to stop tracking the getter.
 */
export const writable = <T>(get: () => T, set: (value: T) => void): WritableSignal<T> => {
  const s = new ComputedSignal<T>(get);
  return new Proxy(s, {
    get: _proxyGet,
    set(_target, prop, newValue) {
      if (prop === 'value') {
        set(newValue as T);
        return true;
      }
      return Reflect.set(_target, prop, newValue, _target);
    },
  }) as unknown as WritableSignal<T>;
};

/* ========== batch ========== */

/** Runs fn and defers all Signal notifications until fn returns, then flushes once. */
export const batch = <T>(fn: () => T): T => {
  ctx.batchDepth++;
  try {
    return fn();
  } finally {
    if (--ctx.batchDepth === 0) {
      const toFlush = [...ctx.pendingEffects];
      ctx.pendingEffects.clear();
      const errors: unknown[] = [];
      for (const f of toFlush) {
        try {
          f();
        } catch (e) {
          errors.push(e);
        }
      }
      _rethrow(errors, '[stateit] multiple batch flush errors');
    }
  }
};

/* ========== watch ========== */

export type EqualityFn<T> = (a: T, b: T) => boolean;
export type WatchOptions = { immediate?: boolean; once?: boolean };
export type WatchSelectorOptions<U> = WatchOptions & { equals?: EqualityFn<U> };

function _watch<T, U>(
  sig: ReadonlySignal<T>,
  select: (s: T) => U,
  cb: (next: U, prev: U) => void,
  opts?: WatchSelectorOptions<U>,
): CleanupFn {
  const eq: EqualityFn<U> = opts?.equals ?? Object.is;
  let prev = select(sig.peek());
  if (opts?.immediate) cb(prev, prev);
  let dispose: CleanupFn = _noop;
  dispose = effect(() => {
    const next = select(sig.value);
    if (!eq(prev, next)) {
      const old = prev;
      prev = next;
      cb(next, old);
      if (opts?.once) dispose();
    }
  });
  return dispose;
}

/**
 * Watches a Signal and calls cb when its value changes. Returns a dispose function.
 *
 * @example Plain signal
 * watch(count, (next, prev) => console.log(prev, '->', next));
 *
 * @example With selector (only fires when the selected value changes)
 * watch(userStore, s => s.name, (next, prev) => ...);
 */
export function watch<T>(source: ReadonlySignal<T>, cb: (value: T, prev: T) => void, options?: WatchOptions): CleanupFn;
export function watch<T, U>(
  source: ReadonlySignal<T>,
  selector: (state: T) => U,
  cb: (value: U, prev: U) => void,
  options?: WatchSelectorOptions<U>,
): CleanupFn;
export function watch<T>(
  source: ReadonlySignal<T>,
  cbOrSelector: ((value: T, prev: T) => void) | ((state: T) => unknown),
  cbOrOptions?: ((value: unknown, prev: unknown) => void) | WatchOptions,
  options?: WatchSelectorOptions<unknown>,
): CleanupFn {
  if (typeof cbOrOptions === 'function') {
    return _watch(source as ReadonlySignal<T>, cbOrSelector as (s: T) => unknown, cbOrOptions, options);
  }
  return _watch(source as ReadonlySignal<T>, (v: T) => v, cbOrSelector as (value: T, prev: T) => void, cbOrOptions);
}

/* ========== Store ========== */

/** Shallow structural equality -- compares own enumerable keys by reference. */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) return false;
  }

  return true;
}

export type StoreOptions<T extends object> = {
  /** Custom equality for top-level change detection. Default: shallowEqual */
  equals?: EqualityFn<T>;
};

/**
 * Store<T> is Signal-compatible: computed, effect, watch, batch, readonly, and toValue
 * all accept Signal<T> and work natively with Store<T>.
 *
 * Extra helpers: set(patch|updater), reset(), watch(), dispose().
 */
export class Store<T extends object> implements Signal<T> {
  readonly [_SIGNAL_BRAND] = true as const;
  readonly [_STORE_BRAND] = true;

  readonly #sig: SignalImpl<T>;
  readonly #initial: T;
  readonly #equals: EqualityFn<T>;
  readonly #watchCleanups = new Set<CleanupFn>();
  #disposed = false;

  constructor(initial: T, options?: StoreOptions<T>) {
    this.#sig = new SignalImpl(initial);
    this.#initial = initial;
    this.#equals = options?.equals ?? (shallowEqual as EqualityFn<T>);
  }

  #write(next: T): void {
    const prev = this.#sig.peek();
    if (Object.is(prev, next) || this.#equals(prev, next)) return;
    this.#sig.value = next;
  }

  get value(): T {
    return this.#sig.value;
  }

  set value(next: T) {
    if (this.#disposed) return;
    this.#write(next);
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  peek(): T {
    return this.#sig.peek();
  }

  /**
   * Shallow-merge a partial object, or replace the full state via an updater function.
   * - `set({ count: 1 })` -- shallow-merges with the current state
   * - `set(s => ({ ...s, count: s.count + 1 }))` -- full replacement; return the complete next state
   */
  set(patch: Partial<T>): void;
  set(updater: (s: T) => T): void;
  set(patchOrUpdater: Partial<T> | ((s: T) => T)): void {
    if (this.#disposed) return;
    const current = this.#sig.peek();
    this.#write(
      typeof patchOrUpdater === 'function' ? patchOrUpdater(current) : ({ ...current, ...patchOrUpdater } as T),
    );
  }

  /** Reset to the original initial state. */
  reset(): void {
    if (this.#disposed) return;
    this.#write(this.#initial);
  }

  /** Watch the full state. */
  watch(cb: (value: T, prev: T) => void, options?: WatchOptions): CleanupFn;
  watch<U>(selector: (state: T) => U, cb: (value: U, prev: U) => void, options?: WatchSelectorOptions<U>): CleanupFn;
  watch<U>(
    cbOrSelector: ((value: T, prev: T) => void) | ((state: T) => U),
    cbOrOptions?: ((value: U, prev: U) => void) | WatchOptions,
    options?: WatchSelectorOptions<U>,
  ): CleanupFn {
    if (this.#disposed) return _noop;
    const cleanup =
      typeof cbOrOptions === 'function'
        ? _watch(this, cbOrSelector as (s: T) => U, cbOrOptions, options)
        : _watch(
            this,
            (v: T) => v as unknown as U,
            cbOrSelector as unknown as (value: U, prev: U) => void,
            cbOrOptions,
          );
    this.#watchCleanups.add(cleanup);
    return () => {
      cleanup();
      this.#watchCleanups.delete(cleanup);
    };
  }

  /**
   * Clear all `store.watch` subscriptions and freeze the store. Further writes are silently ignored.
   *
   * Note: does not tear down external `effect`/`watch` calls that read `store.value` directly.
   * Those must be disposed where they are created.
   */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const cleanup of this.#watchCleanups) cleanup();
    this.#watchCleanups.clear();
  }
}

/** Creates a reactive store for object state. */
export const store = <T extends object>(initial: T, options?: StoreOptions<T>): Store<T> => new Store(initial, options);

/** Type guard -- identifies Store instances. */
export const isStore = <T extends object = Record<string, unknown>>(value: unknown): value is Store<T> =>
  typeof value === 'object' && value !== null && _STORE_BRAND in (value as object);
