// === PUBLIC TYPES ===

export type CleanupFn = () => void;
export type EffectCallback = () => CleanupFn | void;
export type AsyncEffectCallback = (signal: AbortSignal) => Promise<CleanupFn | void>;
export type EqualityFn<T> = (a: T, b: T) => boolean;
export type EffectScheduler = 'microtask' | 'raf' | 'sync';

export type ReactiveOptions<T> = {
  equals?: EqualityFn<T>;
  /**
   * Called when the compute function throws during evaluation.
   * Receives the thrown error and the last successfully computed value (or
   * `undefined` on the first run). The return value is used as the node value,
   * allowing graceful degradation instead of propagating the error (F4).
   */
  fallback?: (error: unknown, lastValue: T | undefined) => T;
  name?: string;
};

/** Options accepted by `signal()` — extends ReactiveOptions with `batched`. */
export type SignalOptions<T> = ReactiveOptions<T> & {
  /**
   * When `true`, multiple synchronous writes to this signal are coalesced into
   * a single downstream notification dispatched in the next microtask.
   * Useful for rapidly-updated values (scroll position, input events) without
   * wrapping every write site in `batch()` (F3).
   */
  batched?: boolean;
};

export type EffectOptions = {
  maxIterations?: number;
  name?: string;
  scheduler?: EffectScheduler;
};

export type BatchOptions = {
  maxIterations?: number;
};

// ── Subscription (R9) ────────────────────────────────────────────────────────
//
// Subscription is now a plain object interface — no longer callable.
// Use `sub.dispose()` or `using sub = ...` everywhere `sub()` was used.

export interface Subscription {
  dispose(): void;
  [Symbol.dispose](): void;
}

export interface AsyncSubscription extends Subscription {
  disposeAsync(): Promise<void>;
}

// ── Core reactive interfaces ──────────────────────────────────────────────────

export interface ReadonlySignal<T> {
  filter<U extends T>(predicate: (value: T) => value is U): ComputedSignal<U | undefined>;
  filter(predicate: (value: T) => boolean): ComputedSignal<T | undefined>;
  map<U>(fn: (value: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U>;
  peek(): T;
  subscribe(listener: () => void): Subscription;
  readonly value: T;
}

export interface Signal<T> extends ReadonlySignal<T> {
  dispose(): void;
  update(fn: (current: T) => T): void;
  value: T;
  [Symbol.dispose](): void;
}

export interface ComputedSignal<T> extends ReadonlySignal<T> {
  dispose(): void;
  [Symbol.dispose](): void;
}

export type WatchOptions<T> = ReactiveOptions<T> & { immediate?: boolean };

/**
 * Extracts the value type at a dot-separated path `P` within object type `T`.
 *
 * @example
 * type City = PathValue<{ user: { address: { city: string } } }, 'user.address.city'>
 * // → string
 */
export type PathValue<T, P extends string> = P extends keyof T
  ? T[P]
  : P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? PathValue<T[K], Rest>
      : never
    : never;

export interface Store<T extends object> extends ReadonlySignal<Readonly<T>> {
  /**
   * Returns a writable `Signal` scoped to a single property or nested path.
   * Reads register a fine-grained dependency on just that property's signal —
   * unrelated patches do NOT re-run effects watching this lens.
   * Lenses are cached — `store.lens('x') === store.lens('x')`.
   */
  lens<P extends string>(path: P): Signal<PathValue<T, P>>;
  patch(partial: Partial<T>): void;
  reset(): void;
  /**
   * Replaces the entire store state by passing the current state to `fn` and
   * applying the returned value. Only changed properties trigger downstream effects.
   *
   * Renamed from `update()` (F2) to avoid confusion with `signal.update(fn)` which
   * performs an atomic read-modify-write on a single value.
   */
  replace(fn: (state: Readonly<T>) => T): void;
}

export interface Scope {
  readonly dispose: () => void;
  readonly run: <T>(fn: () => T) => T;
  readonly [Symbol.dispose]: () => void;
}

/**
 * A Scope variant for async setup functions.
 * Captures `onCleanup()` registrations from the synchronous preamble of `setup`
 * (before the first `await`), awaits the rest of setup, then returns the scope.
 */
export type AsyncScopeSetup = () => Promise<void>;

// Needed by reactive-base.ts (kept here to avoid the circular dep
// reactive-base → types → reactive-base).
export type Subscriber = () => void;
