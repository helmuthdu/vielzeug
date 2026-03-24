/** A function that tears down a subscription or effect. */
export type CleanupFn = () => void;

/** The shape of a function passed to `effect()`. Can return an optional cleanup. */
export type EffectCallback = () => CleanupFn | void;

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

export const _SIGNAL_BRAND = Symbol('stateit.signal');
export const _STORE_BRAND = Symbol('stateit.store');

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
