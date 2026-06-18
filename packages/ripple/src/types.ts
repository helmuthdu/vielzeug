// === PUBLIC TYPES ===

export type CleanupFn = () => void;
export type EffectCallback = () => CleanupFn | void;
export type AsyncEffectCallback = (signal: AbortSignal) => Promise<CleanupFn | void>;
export type EqualityFn<T> = (a: T, b: T) => boolean;

/**
 * Controls when an effect re-runs after a dependency changes.
 * - `'sync'` (default): runs immediately in the same flush.
 * - `'microtask'`: deferred to the next microtask.
 * - function: custom scheduler — receives the `run` callback and is responsible
 *   for calling it (once) at the appropriate time. Enables integration with
 *   React's scheduler, priority queues, or other custom timing strategies.
 *
 * @example Custom scheduler:
 * ```ts
 * effect(fn, { scheduler: (run) => setTimeout(run, 100) });
 * ```
 */
export type EffectScheduler = ((run: () => void) => void) | 'microtask' | 'sync';

/** Options accepted by `computed()`. */
export type ComputedOptions<T> = {
  equals?: EqualityFn<T>;
  /**
   * Called when the compute function throws during evaluation.
   * Receives the thrown error and the last successfully computed value (or
   * `undefined` on the first run). The return value is used as the node value,
   * allowing graceful degradation instead of propagating the error.
   */
  fallback?: (error: unknown, lastValue: T | undefined) => T;
  name?: string;
};

/** Options accepted by `signal()`. */
export type SignalOptions<T> = {
  /**
   * When `true`, multiple synchronous writes to this signal are coalesced into
   * a single downstream notification dispatched in the next microtask.
   * Useful for rapidly-updated values (scroll position, input events) without
   * wrapping every write site in `batch()`.
   */
  batched?: boolean;
  equals?: EqualityFn<T>;
  name?: string;
};

export type EffectOptions = {
  maxIterations?: number;
  name?: string;
  scheduler?: EffectScheduler;
};

export type EffectAsyncOptions = {
  /** Name used to identify this async effect in DevTools. */
  name?: string;
  onError?: (error: unknown) => void;
};

// ── Subscription ─────────────────────────────────────────────────────────────

export interface Subscription {
  dispose(): void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  [Symbol.dispose](): void;
}

export interface AsyncSubscription extends Subscription {
  /**
   * @deprecated Use `await using stop = effectAsync(...)` with `[Symbol.asyncDispose]` instead.
   */
  disposeAsync(): Promise<void>;
  /** ES2024 `await using` compatible async disposal. Equivalent to `disposeAsync()`. */
  [Symbol.asyncDispose](): Promise<void>;
}

// ── Watch ─────────────────────────────────────────────────────────────────────

export type WatchOptions<T> = {
  equals?: EqualityFn<T>;
  immediate?: boolean;
  name?: string;
};

// ── AsyncComputed ─────────────────────────────────────────────────────────────

export type AsyncComputedOptions<T> = {
  /** Initial value shown on `data` before the first run resolves. */
  initialValue?: T;
  /** Debug name for the internal effect. */
  name?: string;
};

/**
 * The reactive handle returned by `asyncComputed()`.
 * Exposes three flat `ReadonlySignal` projections:
 * - `data`      — latest fulfilled value (`T | undefined`)
 * - `error`     — last thrown error (`unknown | undefined`)
 * - `isLoading` — `true` while a run is in-flight (starts `true`)
 */
export interface AsyncComputedSignal<T> {
  /** The latest fulfilled value, or `undefined` while pending / after error. */
  readonly data: ReadonlySignal<T | undefined>;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  /** The last thrown error, or `undefined` when fulfilled or loading. */
  readonly error: ReadonlySignal<unknown | undefined>;
  /** `true` while the async factory is in-flight. `true` on first frame. */
  readonly isLoading: ReadonlySignal<boolean>;
  /** Disposes the underlying effect and all projections. Cancels any in-flight run. */
  dispose(): void;
  [Symbol.dispose](): void;
}

// ── Store history / time-travel ───────────────────────────────────────────────

/**
 * An external undo/redo adapter wrapping a `Store<T>`.
 * Access the underlying store via `.store` for reads and mutations.
 */
export interface StoreWithHistory<T extends object> {
  /** The underlying reactive store. Use this to read, patch, replace, or reset state. */
  readonly store: Store<T>;
  /** `true` when there is at least one snapshot to undo to. Reactive — reads inside effects re-run on change. */
  readonly canUndo: boolean;
  /** `true` when there is at least one snapshot ahead to redo. Reactive — reads inside effects re-run on change. */
  readonly canRedo: boolean;
  /** Returns a snapshot of state at the given index (0 = oldest). */
  historyAt(index: number): Readonly<T> | undefined;
  /** Number of snapshots in history. */
  readonly historyLength: number;
  /** Move back one snapshot. No-op when at the beginning. */
  undo(): void;
  /** Move forward one snapshot. No-op when at the end. */
  redo(): void;
  /** Dispose the history adapter, cursor signal, and the underlying store. */
  dispose(): void;
  [Symbol.dispose](): void;
}

// ── Core reactive interfaces ──────────────────────────────────────────────────

/**
 * The minimal read-only contract for any reactive value.
 * This is what effects and computed functions consume — `.value` for tracked reads,
 * `peek()` for untracked reads, and `subscribe()` for external imperative listeners.
 */
export interface ReadonlySignal<T> {
  /** The debug name assigned at creation time, or `undefined` if unnamed. */
  readonly name?: string;
  peek(): T;
  subscribe(listener: () => void): Subscription;
  readonly value: T;
}

export interface Signal<T> extends ReadonlySignal<T> {
  dispose(): void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  value: T;
  [Symbol.dispose](): void;
}

export interface ComputedSignal<T> extends ReadonlySignal<T> {
  dispose(): void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  [Symbol.dispose](): void;
}

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

// ── Greenfield aliases ────────────────────────────────────────────────────────

/**
 * Alias for {@link ReadonlySignal}. Prefer `Accessor<T>` for clarity —
 * the name communicates "you can read this" rather than implying the value never changes.
 */
export type Accessor<T> = ReadonlySignal<T>;

/**
 * Alias for {@link AsyncComputedOptions}. Use with {@link resource}.
 */
export type ResourceOptions<T> = AsyncComputedOptions<T>;

/**
 * Alias for {@link AsyncComputedSignal}. Returned by {@link resource}.
 */
export type ResourceSignal<T> = AsyncComputedSignal<T>;

/**
 * A fine-grained reactive store for objects.
 *
 * `lens()` is the primary reactive read/write API — it returns a `Signal` for
 * a specific property or nested path and registers fine-grained dependencies.
 * `peek()` returns a non-reactive snapshot (useful for serialization).
 * `subscribe()` fires on any mutation (useful for adapters like `storeWithHistory`).
 */
export interface Store<T extends object> {
  /**
   * Permanently disposes the store, releasing all internal reactive resources.
   * All cached lenses and prop signals are disposed.
   */
  dispose(): void;
  [Symbol.dispose](): void;
  /**
   * Returns a writable `Signal` scoped to a single property or nested path.
   * Reads register a fine-grained dependency on that property's signal —
   * unrelated patches do NOT re-run effects watching this lens.
   * Lenses are cached — `store.lens('x') === store.lens('x')`.
   */
  lens<P extends string>(path: P): Signal<PathValue<T, P>>;
  /** Whether the store has been disposed. */
  readonly disposed: boolean;
  /** The debug name assigned at creation, or `undefined` if unnamed. */
  readonly name?: string;
  /** Atomic partial update — only changed keys notify their subscribers. */
  patch(partial: Partial<T>): void;
  /**
   * Returns a non-reactive snapshot of the current state.
   * Use for serialization or one-off reads outside reactive contexts.
   */
  peek(): Readonly<T>;
  /** Resets the store to its initial state. */
  reset(): void;
  /**
   * Replaces the entire store state by passing the current state to `fn` and
   * applying the returned value. Only changed properties trigger downstream effects.
   */
  replace(fn: (state: Readonly<T>) => T): void;
  /**
   * Subscribes to any store mutation (patch / replace / reset / lens write).
   * Used by external adapters — prefer `store.lens()` for reactive reads.
   */
  subscribe(listener: () => void): Subscription;
}

export interface Scope {
  readonly dispose: () => void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
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

// ── DevTools hook types ───────────────────────────────────────────────────────
//
// Defined here (core bundle) so devtools-hook.ts can reference the type without
// importing the sub-path module (@vielzeug/ripple/devtools).
// These types are for tooling authors — exported via @vielzeug/ripple/devtools.

/** Event emitted when a signal's value changes. */
export type WriteEvent = { name: string | undefined; newValue: unknown; oldValue: unknown };

/** Event emitted when a computed recomputes, or when an effect runs. */
export type NamedEvent = { name: string | undefined };

/** Event emitted when a signal, computed, effect, or store is disposed. */
export type DisposeEvent = { kind: 'computed' | 'effect' | 'signal' | 'store'; name: string | undefined };

/** Event emitted when a store-level mutation occurs. `path` is populated for `kind: 'lens'`. */
export type MutateEvent = {
  kind: 'patch' | 'replace' | 'reset' | 'lens';
  name: string | undefined;
  path?: string;
};

export type RippleDevToolsHook = {
  /** Called when a computed signal recomputes. */
  compute?(event: NamedEvent): void;
  /** Called when a signal, computed, or effect is disposed. */
  dispose?(event: DisposeEvent): void;
  /** Called when a store-level mutation (patch/replace/reset/lens) occurs. */
  mutate?(event: MutateEvent): void;
  /** Called when an effect starts running. */
  run?(event: NamedEvent): void;
  /** Called when a signal's value changes. */
  write?(event: WriteEvent): void;
};
