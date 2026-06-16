import type { Fn } from '../types';

type FirstParameters<T extends readonly Fn[]> = T extends [infer First extends Fn, ...unknown[]]
  ? Parameters<First>
  : never;
type LastReturnType<T extends readonly Fn[]> = T extends [...unknown[], infer Last extends Fn]
  ? ReturnType<Last>
  : never;

/**
 * Pipes multiple functions into a single function. It starts from the leftmost function and proceeds to the right.
 *
 * The TypeScript overload captures the input type from the first function and the output type from the last.
 * Intermediate steps are typed as `unknown` at the call site — TypeScript cannot infer a safe chain across
 * heterogeneous function signatures without explicit overloads for every arity.
 *
 * `pipe()` with no arguments returns an identity function `<T>(x: T) => T`.
 *
 * @example
 * ```ts
 * const add = (x: number) => x + 2;
 * const multiply = (x: number) => x * 3;
 * const subtract = (x: number) => x - 4;
 * const pipedFn = pipe(subtract, multiply, add);
 *
 * pipedFn(5); // ((5-4) * 3) + 2 = 5
 *
 * // Zero-arg identity
 * pipe()(42); // 42
 * ```
 *
 * @param fns - List of functions to be piped.
 * @returns A new function that is the pipe of the input functions.
 */
export function pipe(): <T>(x: T) => T;
export function pipe<T extends readonly [Fn, ...Fn[]]>(...fns: T): (...args: FirstParameters<T>) => LastReturnType<T>;
export function pipe(...fns: Fn[]): Fn {
  if (fns.length === 0) return <T>(x: T): T => x;

  const [firstFn, ...restFns] = fns;

  return (...args: unknown[]) => restFns.reduce((prev: unknown, fn) => fn(prev), firstFn!(...args));
}
