import type { Fn } from '../types';

/**
 * Create a function that runs once and returns the first result.
 *
 * @example
 * ```ts
 * const onceRandom = once(() => Math.random())
 * onceRandom() // 0.3
 * onceRandom() // 0.3
 *
 * onceRandom.reset()
 *
 * onceRandom() // 0.2
 * onceRandom() // 0.2
 * ```
 *
 * @param fn - The function to wrap.
 *
 * @returns A function that can only be called once.
 */
export const once = <T extends Fn>(fn: T): T & { reset: () => void } => {
  let result: ReturnType<T> | undefined;
  let called = false;

  const wrappedFn = ((...args: Parameters<T>): ReturnType<T> => {
    if (!called) {
      result = fn(...args);
      called = true;
    }
    return result as ReturnType<T>;
  }) as T & { reset: () => void };

  wrappedFn.reset = () => {
    result = undefined;
    called = false;
  };

  return wrappedFn;
};
