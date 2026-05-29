// === PUBLIC TYPES ===

export type CleanupFn = () => void;
export type EffectCallback = () => CleanupFn | void;
export type AsyncEffectCallback = (signal: AbortSignal) => Promise<CleanupFn | void>;
export type EqualityFn<T> = (a: T, b: T) => boolean;
export type EffectScheduler = 'microtask' | 'raf' | 'sync';
export type ReactiveOptions<T> = { equals?: EqualityFn<T>; name?: string };

export type EffectOptions = {
  maxIterations?: number;
  name?: string;
  scheduler?: EffectScheduler;
  /** When true, logs which reactive sources changed before each re-run. */
  trace?: boolean;
};

export type BatchOptions = {
  maxIterations?: number;
};

export interface Subscription {
  (): void;
  dispose(): void;
  [Symbol.dispose](): void;
}

export interface AsyncSubscription extends Subscription {
  disposeAsync(): Promise<void>;
}

export interface ReadonlySignal<T> {
  filter<U extends T>(predicate: (value: T) => value is U): ComputedSignal<U | undefined>;
  filter(predicate: (value: T) => boolean): ComputedSignal<T | undefined>;
  map<U>(fn: (value: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U>;
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

export interface Store<T extends object> extends ReadonlySignal<T> {
  /**
   * Returns a writable `Signal` scoped to a single property or nested path of the store.
   * Accepts dot-separated paths for nested access: `store.lens('user.address.city')`.
   * Reads only the specific path — unrelated patches do not notify this signal.
   * Writes reconstruct the object immutably up the path.
   * Lenses are cached — `store.lens('x') === store.lens('x')`.
   */
  lens<P extends string>(path: P): Signal<PathValue<T, P>>;
  patch(partial: Partial<T>): void;
  reset(): void;
  update(fn: (state: T) => T): void;
}

export interface Scope {
  readonly dispose: () => void;
  readonly run: <T>(fn: () => T) => T;
  readonly [Symbol.dispose]: () => void;
}

// === INTERNAL TYPES ===

export type Subscriber = () => void;

/**
 * Interface implemented by ComputedImpl and exposed to `scheduling.ts` to break
 * the potential circular dependency: scheduling ↔ computed.
 */
export interface DirtyComputed {
  computedSubs(): ReadonlySet<DirtyComputed>;
  hasSubscribers(): boolean;
  markDirty(): boolean;
  refreshIfDirty(): boolean;
  removeComputedSub(c: DirtyComputed): void;
  subscribers(): ReadonlySet<Subscriber>;
  readonly version: number;
}

/**
 * A recorded dependency entry used for version-based cache invalidation.
 * Avoids cleanup-set allocation on every computed recompute.
 */
export interface DepSource {
  addComputedSub(c: DirtyComputed): void;
  addEffectSub(subscriber: Subscriber): void;
  removeComputedSub(c: DirtyComputed): void;
  removeEffectSub(subscriber: Subscriber): void;
  readonly name: string | undefined;
  readonly version: number;
}

export type DepEntry = { source: DepSource; version: number };

/** Minimal interface for nodes that can notify downstream subscribers. Used by scheduling. */
export interface ReactiveNode {
  computedSubs(): ReadonlySet<DirtyComputed>;
  hasSubscribers(): boolean;
  subscribers(): ReadonlySet<Subscriber>;
}

/**
 * Discriminated union tracking context — each variant contains only the fields valid for its
 * mode, making invalid combinations (e.g. a computed context with subscriptions) unrepresentable.
 */
export type TrackingCtx =
  | { readonly computed: DirtyComputed; readonly depCollector: DepEntry[]; readonly kind: 'computed' }
  | {
      cleanups: CleanupFn[];
      /** Non-null only when effect trace mode is enabled. */
      depCollector: DepEntry[] | null;
      readonly effect: Subscriber;
      readonly kind: 'effect';
      readonly subscriptions: Set<CleanupFn>;
    }
  | { cleanups: CleanupFn[]; readonly kind: 'scope' };
