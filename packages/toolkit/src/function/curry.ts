/** biome-ignore-all lint/suspicious/noExplicitAny: - */

/**
 * Curries a function, allowing it to be called with partial arguments.
 *
 * @example
 * ```ts
 * const add = (a: number, b: number) => a + b;
 * const curriedAdd = curry(add);
 * curriedAdd(1)(2) // 3;
 * ```
 *
 * @param fn - The function to curry.
 * @param arity - The number of arguments the function expects. Defaults to the function's length.
 *
 * @returns A curried version of the function.
 */

// Take first N items from tuple T
type Take<N extends number, T extends readonly unknown[], Acc extends readonly unknown[] = []> = Acc['length'] extends N
  ? Acc
  : T extends readonly [infer H, ...infer R]
    ? Take<N, R, readonly [...Acc, H]>
    : Acc;
// Curried: at each step, accept a non-empty tuple of args A,
// ensure it's a prefix of P, then either return R (if done) or recurse.
export type Curried<P extends readonly unknown[], R> = P extends readonly []
  ? () => R
  : <A extends readonly [unknown, ...(readonly unknown[])]>(
      ...args: A
    ) => P extends readonly [...A, ...infer Rest] ? (Rest extends readonly [] ? R : Curried<Rest, R>) : never;
// Overloads to reflect default arity vs. a custom arity.
export function curry<T extends (...args: any[]) => any>(fn: T): Curried<Parameters<T>, ReturnType<T>>;
export function curry<T extends (...args: any[]) => any, N extends number>(
  fn: T,
  arity: N,
): Curried<Take<N, Parameters<T>>, ReturnType<T>>;
// Runtime implementation
export function curry(fn: (...args: any[]) => any, arity = fn.length) {
  const curried = (...args: any[]): any => {
    if (args.length >= arity) {
      return fn(...args);
    }
    return (...rest: any[]) => curried(...args, ...rest);
  };
  return curried as any;
}
