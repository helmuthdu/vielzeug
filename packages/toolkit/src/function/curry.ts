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
 *
 * @returns A curried version of the function.
 */

// biome-ignore lint/suspicious/noExplicitAny: -
export const curry = <T extends (...args: any[]) => any>(fn: T) => {
  // biome-ignore lint/suspicious/noExplicitAny: -
  const curried = (...args: Parameters<T>): any => {
    if (args.length >= fn.length) {
      return fn(...args);
    }
    return (...rest: Exclude<Parameters<T>, typeof args>) => curried(...(args.concat(rest) as Parameters<T>));
  };
  return curried as T extends (...args: infer P) => infer R ? CurriedFunction<P, R> : never;
};

// biome-ignore lint/suspicious/noExplicitAny: -
type CurriedFunction<Params extends any[], R> = Params extends [infer A, ...infer Rest]
  ? (arg: A) => CurriedFunction<Rest, R>
  : R;
