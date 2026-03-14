/** biome-ignore-all lint/suspicious/noExplicitAny: - */

/** A function that tears down a subscription or listener registration. */
export type Unsubscribe = () => void;

export type Fn = (...args: any[]) => any;

export type Obj = Record<string, unknown>;

export type Predicate<T> = (value: T, index: number, array: readonly T[]) => boolean;

export type Sorter<T> = (a: T, b: T) => number;

export type Primitive = string | number | boolean;

// #region Selector
export type Selector<T> = keyof T | ((item: T) => Primitive);
// #endregion Selector
