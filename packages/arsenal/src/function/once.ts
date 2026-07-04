import type { Fn } from '../types';

/**
 * A wrapped function that executes `fn` at most once and exposes a `.reset()` method
 * to allow re-invocation.
 */
export type Once<T extends Fn> = T & { reset: () => void };

/**
 * Create a function that runs once and returns the first result.
 *
 * If the first call throws, it does not count as "called" — the thrown error propagates to
 * that caller, and the next call will invoke `fn` again (rather than caching the failure).
 *
 * @example
 * ```ts
 * const onceRandom = once(() => Math.random())
 * onceRandom() // 0.3
 * onceRandom() // 0.3
 *
 * onceRandom.reset() // clears the cached result — allows one more invocation
 *
 * onceRandom() // 0.2
 * onceRandom() // 0.2
 * ```
 *
 * @param fn - The function to wrap.
 *
 * @returns A `Once<T>` — the wrapped function with a `.reset()` method to clear the cached result.
 */
export const once = <T extends Fn>(fn: T): Once<T> => {
  let result: ReturnType<T> | undefined;
  let called = false;

  const wrappedFn = ((...args: Parameters<T>): ReturnType<T> => {
    if (!called) {
      result = fn(...args) as ReturnType<T>;
      called = true;
    }

    return result as ReturnType<T>;
  }) as Once<T>;

  wrappedFn.reset = () => {
    result = undefined;
    called = false;
  };

  return wrappedFn;
};
