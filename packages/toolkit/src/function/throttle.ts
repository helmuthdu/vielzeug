import type { Fn } from '../types';

/**
 * Creates a throttled function that only invokes the provided function at most once per every specified milliseconds.
 *
 * @example
 * ```ts
 * const log = () => console.log('Hello, world!');
 * const throttledLog = throttle(log, 1000);
 *
 * throttledLog(); // logs 'Hello, world!' immediately
 * throttledLog(); // does nothing because less than 1 second has passed since the last invocation
 * setTimeout(throttledLog, 1000); // logs 'Hello, world!' after 1 second
 * ```
 *
 * @param fn - The function to throttle.
 * @param [delay=700] - The number of milliseconds to wait before invoking the function again.
 *
 * @returns A new function that throttles the input function.
 */
export function throttle<T extends Fn>(fn: T, delay = 700): (...args: Parameters<T>) => void {
  let elapsed = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - elapsed >= delay) {
      elapsed = now;
      fn(...args);
    }
  };
}
