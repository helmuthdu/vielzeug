/** biome-ignore-all lint/suspicious/noExplicitAny: - */

export type Callback<T = any, R = any> = (value: T, index: number, array: T[]) => R;
export type CallbackAsync<T = any, R = any> = (value: T, index: number, array: T[]) => Promise<R>;
export type CallbackDynamic<T = any, R = any> = (value: T, index: number, array: T[]) => R | Promise<R>;

export type Fn<P = any, R = any> = (...args: P[]) => R;
export type FnAsync<P = any, R = any> = (...args: P[]) => Promise<R>;
export type FnDynamic<P = any, R = any> = (...args: P[]) => R | Promise<R>;

export type ResultArray<C extends FnDynamic> = C extends FnAsync ? Promise<Awaited<ReturnType<C>>[]> : ReturnType<C>[];

export type Result<C extends FnDynamic> = C extends FnAsync ? Promise<Awaited<ReturnType<C>>> : ReturnType<C>;

export type Obj = Record<string, any>;

export type Predicate<T> = (value: T, index: number, array: T[]) => boolean | boolean[];

export type Primitive = string | number | boolean;

export type Selector<T> = keyof T | ((item: T) => Primitive);
