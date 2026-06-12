/** A function that tears down a subscription or listener registration. */
export type Unsubscribe = () => void;

export type Fn<Args extends unknown[] = unknown[], Result = unknown> = (...args: Args) => Result;

export type Obj = Record<string, unknown>;

export type Predicate<T> = (value: T, index: number, array: readonly T[]) => boolean;

export type Sorter<T> = (a: T, b: T) => number;

export type Primitive = string | number | boolean;
