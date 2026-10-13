export type Cleanup = () => void;
export type Equality<T> = (previous: T, next: T) => boolean;
export type Unsubscribe = () => void;

export type SignalOptions<T> = {
  equals?: Equality<T>;
  name?: string;
};

export type ComputedOptions<T> = {
  equals?: Equality<T>;
  name?: string;
};

export type EffectOptions = {
  name?: string;
};

export interface Readable<T> {
  readonly name?: string;
  peek(): T;
  subscribe(listener: () => void): Unsubscribe;
  readonly value: T;
}

export interface Signal<T> extends Readable<T> {
  update(updater: (prev: T) => T): void;
  value: T;
}

export interface Disposable {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  [Symbol.dispose](): void;
}

export type EffectHandle = Disposable;

export interface Scope extends Disposable {
  run<T>(fn: () => T): T;
}

/**
 * Structural contract for external state sources that expose a snapshot and a
 * subscription pair: the same shape React's `useSyncExternalStore` consumes.
 * Packages can implement this without importing Ripple; `fromSubscribable()`
 * bridges them into a reactive graph.
 */
export interface Subscribable<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): Unsubscribe;
}

export type RippleErrorContext = {
  readonly kind: 'cleanup' | 'computed' | 'effect' | 'flush' | 'listener';
  readonly name?: string;
};

export type RippleOptions = {
  /**
   * Handles failures in runtime callbacks, cleanups, and listeners. Defaults to
   * rethrowing asynchronously via `queueMicrotask`, so failures surface as
   * unhandled errors instead of being swallowed. Provide a no-op function to
   * silence rethrow. Failures inside one node never interrupt sibling
   * propagation either way.
   */
  onError?: (error: unknown, context: RippleErrorContext) => void;
};
