/** A function that tears down a subscription or listener registration. */
export type Unsubscribe = () => void;

/**
 * Canonical read-only observable contract: `getSnapshot()` reads current state,
 * `subscribe()` registers a change listener and returns an unsubscribe function.
 * Structural by design: implementations live in other packages (ripple,
 * sentinel, wayfinder, ledger) without depending on arsenal at runtime.
 */
export interface Subscribable<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): Unsubscribe;
}

export type Fn<Args extends unknown[] = never[], Result = unknown> = (...args: Args) => Result;

export type Obj = Record<string, unknown>;

/**
 * A predicate that takes a single value and returns a boolean.
 * Assignable to `Array.prototype.filter` callbacks since TypeScript allows
 * callbacks with fewer parameters.
 */
export type Predicate<T> = (value: T) => boolean;

export type Sorter<T> = (a: T, b: T) => number;

export type Primitive = string | number | boolean;
