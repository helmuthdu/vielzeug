// === PUBLIC TYPES ===

export type CleanupFn = () => void;
export type EffectCallback = () => CleanupFn | void;
export type AsyncEffectCallback = (signal: AbortSignal) => Promise<CleanupFn | void>;
export type EqualityFn<T> = (a: T, b: T) => boolean;
export type EffectScheduler = 'microtask' | 'raf' | 'sync';
export type ReactiveOptions<T> = { equals?: EqualityFn<T>; name?: string };

export interface Subscription {
  (): void;
  dispose(): void;
  [Symbol.dispose](): void;
}

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
  lens<K extends keyof T & string>(key: K): Signal<T[K]>;
  patch(partial: Partial<T>): void;
  reset(): void;
  select<U>(selector: (state: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U>;
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
  removeComputedSub(c: DirtyComputed): void;
  readonly version: number;
}

export type DepEntry = { source: DepSource; version: number };

export type TrackingCtx = {
  cleanups: CleanupFn[] | null;
  computed: DirtyComputed | null;
  depCollector: DepEntry[] | null;
  effect: Subscriber | null;
  subscriptions: Set<CleanupFn> | null;
};
