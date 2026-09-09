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
  scheduler?: 'microtask' | 'sync';
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
 * subscription pair — the same shape React's `useSyncExternalStore` consumes.
 * Packages can implement this without importing Ripple; `fromSubscribable()`
 * bridges them into a reactive graph.
 */
export interface Subscribable<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): Unsubscribe;
}

export type RippleErrorContext = {
  readonly kind: 'cleanup' | 'computed' | 'effect' | 'listener';
  readonly name?: string;
};

export type RippleEvent =
  | { readonly type: 'compute'; readonly name?: string }
  | { readonly type: 'effect'; readonly name?: string }
  | { readonly type: 'write'; readonly name?: string; readonly next: unknown; readonly previous: unknown }
  | { readonly type: 'dispose'; readonly name?: string; readonly node: 'effect' | 'graph' | 'scope' }
  | { readonly type: 'error'; readonly error: unknown; readonly context: RippleErrorContext };

/**
 * Deterministic error policy for runtime callback, cleanup, and listener
 * failures. Error events are always emitted through `tap()` regardless of
 * policy — this controls only whether failures also rethrow.
 *
 * - `'throw'` (default): rethrows the error asynchronously via `queueMicrotask`.
 * - `'swallow'`: silences rethrow; observe failures only through `tap()`.
 */
export type RippleErrorPolicy = 'throw' | 'swallow';

export type RippleOptions = {
  errorPolicy?: RippleErrorPolicy;
};
