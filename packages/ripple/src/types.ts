// === PUBLIC TYPES ===

export type CleanupFn = () => void;
export type EffectCallback = () => CleanupFn | void;
export type AsyncEffectCallback = (signal: AbortSignal, owner: Scope) => Promise<CleanupFn | void>;
export type EqualityFn<T> = (a: T, b: T) => boolean;

/**
 * Controls when an effect re-runs after a dependency changes.
 * - `'sync'` (default): runs immediately in the same flush.
 * - `'microtask'`: deferred to the next microtask.
 */
export type EffectScheduler = 'microtask' | 'sync';

/** Options accepted by `computed()`. */
export type ComputedOptions<T> = {
  equals?: EqualityFn<T>;
  name?: string;
};

/** Options accepted by `signal()`. */
export type SignalOptions<T> = {
  equals?: EqualityFn<T>;
  name?: string;
};

export type EffectOptions = {
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

/**
 * A snapshot of one reactive dependency recorded by an effect.
 * Returned by `EffectHandle.getDependencies()`.
 */
export type DepInfo = {
  readonly kind: 'computed' | 'signal';
  readonly name?: string;
};

/**
 * Extended handle returned by `effect()`.
 * Extends `Subscription` with `getDependencies()` for reactive graph introspection.
 *
 * @example
 * ```ts
 * const handle = effect(() => { console.log(count.value); });
 * console.log(handle.getDependencies()); // [{ name: 'count' }]
 * handle.dispose();
 * ```
 */
export interface EffectHandle extends Subscription {
  /**
   * Returns the reactive sources the effect is currently subscribed to.
   * Reflects the deps collected during the last completed run.
   * Returns an empty array after `dispose()`.
   */
  getDependencies(): ReadonlyArray<DepInfo>;
}

/**
 * Extended async subscription returned by `effectAsync()`.
 * Adds `run()` for structured concurrency — await the current async run before proceeding.
 */
export interface AsyncSubscription extends Subscription {
  /** Awaits the current async run without disposing the effect. Resolves immediately if idle. */
  run(): Promise<void>;
  /** ES2024 `await using` compatible async disposal. Stops the effect and awaits full teardown. */
  [Symbol.asyncDispose](): Promise<void>;
}

// ── Watch ─────────────────────────────────────────────────────────────────────

export type WatchOptions<T> = {
  equals?: EqualityFn<T>;
  immediate?: boolean;
  name?: string;
  /** Auto-dispose the watch after the first callback invocation. */
  once?: boolean;
};

// ── Resource (async computed) ─────────────────────────────────────────────────

export type ResourceOptions<T> = {
  /** Value exposed via `data` while the first run is loading. */
  initialValue?: T;
  /** Debug name for the internal effect and state signal. */
  name?: string;
};

/**
 * Discriminated-union state emitted by a `resource()` signal.
 *
 * - `'loading'` — async factory is in-flight. `data` carries the last fulfilled value (if any).
 * - `'ready'`   — factory resolved. `data` is the fulfilled value.
 * - `'error'`   — factory rejected. `error` holds the thrown value. `data` carries the last fulfilled value (if any).
 *
 * @example
 * ```ts
 * const user = resource(async () => fetchUser(id.value));
 *
 * effect(() => {
 *   const s = user.value;
 *   if (s.status === 'loading') return showSpinner();
 *   if (s.status === 'error')   return showError(s.error);
 *   renderUser(s.data);
 * });
 * ```
 */
export type ResourceState<T> =
  | { readonly data?: T; readonly status: 'loading' }
  | { readonly data: T; readonly status: 'ready' }
  | { readonly data?: T; readonly error: unknown; readonly status: 'error' };

// ── Store history / time-travel ───────────────────────────────────────────────

/**
 * A single snapshot entry in `StoreWithHistory`.
 * Carries the frozen state and an optional label for annotated checkpoints.
 */
export type HistoryEntry<T> = {
  readonly label?: string;
  readonly state: Readonly<T>;
};

// ── Core reactive interfaces ──────────────────────────────────────────────────

/**
 * The minimal read-only contract for consuming any reactive value.
 * Effects and computed functions read `.value` (tracked) or `peek()` (untracked).
 * Use `subscribe()` for external imperative listeners.
 */
export interface Readable<T> {
  /** `true` after the underlying node has been disposed. */
  readonly disposed: boolean;
  /** The debug name assigned at creation time, or `undefined` if unnamed. */
  readonly name?: string;
  peek(): T;
  /**
   * Subscribes a listener to value change notifications.
   * Implementations MUST NOT invoke `listener` synchronously during registration.
   */
  subscribe(listener: () => void): Subscription;
  readonly value: T;
}

/**
 * A disposable derived value. The holder is responsible for calling `dispose()`.
 * Returned by `computed()`, `readonly()`, and `resource()`.
 */
export interface Computed<T> extends Readable<T> {
  dispose(): void;
  [Symbol.dispose](): void;
}

/**
 * A writable owned signal. The holder can both read and write `.value`,
 * and is responsible for calling `dispose()` when done.
 */
export interface Signal<T> extends Computed<T> {
  value: T;
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

/**
 * A fine-grained reactive store for objects.
 * Extends `Computed<Readonly<T>>` — `store.value` provides a tracked whole-store read.
 *
 * `lens()` is the primary reactive read/write API — it returns a `Signal` for
 * a specific property or nested path and registers fine-grained dependencies.
 * `peek()` returns a non-reactive snapshot (useful for serialization).
 * `subscribe()` fires on any mutation (useful for adapters like `storeWithHistory`).
 */
export interface Store<T extends object> extends Computed<Readonly<T>> {
  /**
   * Returns a writable `Signal` scoped to a single property or nested path.
   * Reads register a fine-grained dependency on that property's signal —
   * unrelated patches do NOT re-run effects watching this lens.
   * Lenses are cached — `store.lens('x') === store.lens('x')`.
   */
  lens<P extends string>(path: P): Signal<PathValue<T, P>>;
  /** Atomic partial update — only changed keys notify their subscribers. */
  patch(partial: Partial<T>): void;
  /**
   * Returns a non-reactive snapshot of the current state.
   * Use for serialization or one-off reads outside reactive contexts.
   */
  peek(): Readonly<T>;
  /**
   * Replaces the entire store state by passing the current state to `fn` and
   * applying the returned value. Only changed properties trigger downstream effects.
   */
  replace(fn: (state: Readonly<T>) => T): void;
  /** Resets the store to its initial state. */
  reset(): void;
  /**
   * Subscribes to any store mutation (patch / replace / reset / lens write).
   * Used by external adapters — prefer `store.lens()` for reactive reads.
   */
  subscribe(listener: () => void): Subscription;
}

/**
 * A lifecycle scope that collects cleanup functions and runs them on dispose.
 * Effects and computeds created inside `scope.run()` auto-register their disposal.
 */
export interface Scope {
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  /**
   * Registers `fn` to run when this scope is disposed.
   * Throws `DISPOSED_SCOPE` if called on an already-disposed scope.
   * Use this from within an effect body to explicitly direct a cleanup into the scope
   * rather than the effect's own cleanup queue.
   */
  add(fn: CleanupFn): void;
  dispose(): void;
  /**
   * Runs `fn` inside this scope's cleanup context.
   * `onCleanup()` calls and resource auto-disposals inside `fn` are registered
   * to this scope when there is no enclosing effect or computed context.
   * Reactive reads inside `fn` are tracked normally against any enclosing effect.
   * Throws `DISPOSED_SCOPE` if the scope has already been disposed.
   */
  run<T>(fn: () => T): T;
  [Symbol.dispose](): void;
}

/**
 * An undo/redo adapter wrapping a `Store<T>`.
 * Extends `Store<T>` directly — all store mutations (`patch`, `replace`, `reset`, `lens`)
 * work on the history adapter without `.store` indirection.
 *
 * History is **explicit** — call `push()` or `pushNamed()` after any mutation you want undoable.
 *
 * @example
 * ```ts
 * const h = storeWithHistory({ count: 0 });
 *
 * h.patch({ count: 1 });
 * h.push();           // save a checkpoint
 * h.undo();           // restore to { count: 0 }
 * h.redo();           // restore to { count: 1 }
 * ```
 */
export interface StoreWithHistory<T extends object> extends Store<T> {
  /** `true` when there is at least one snapshot ahead to redo. Reactive — reads inside effects re-run on change. */
  readonly canRedo: boolean;
  /** `true` when there is at least one snapshot to undo to. Reactive — reads inside effects re-run on change. */
  readonly canUndo: boolean;
  /** Returns the history entry at the given index (0 = oldest). */
  historyAt(index: number): HistoryEntry<T> | undefined;
  /** Number of snapshots currently in history. */
  readonly historyLength: number;
  /** Saves the current store state as an explicit undo checkpoint. */
  push(): void;
  /**
   * Saves the current store state as an annotated checkpoint.
   * Use to mark significant transitions (e.g. `'import'`, `'reset'`) so time-travel
   * debuggers can distinguish user-initiated from programmatic mutations.
   */
  pushNamed(label: string): void;
  /** Move forward one snapshot. No-op when at the most recent checkpoint. */
  redo(): void;
  /** The underlying store — kept as an escape hatch for adapters that need direct store access. */
  readonly store: Store<T>;
  /** Move back one snapshot. No-op when at the oldest checkpoint. */
  undo(): void;
}

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
