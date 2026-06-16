/** A function that tears down a subscription or listener registration. */
export type Unsubscribe = () => void;

export type Fn<Args extends unknown[] = unknown[], Result = unknown> = (...args: Args) => Result;

export type Obj = Record<string, unknown>;

/**
 * A predicate that takes a single value and returns a boolean.
 * Assignable to `Array.prototype.filter` callbacks since TypeScript allows
 * callbacks with fewer parameters.
 */
export type Predicate<T> = (value: T) => boolean;

export type Sorter<T> = (a: T, b: T) => number;

export type Primitive = string | number | boolean;
