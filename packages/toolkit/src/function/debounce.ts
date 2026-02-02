import type { Fn } from '../types';

/**
 * Creates a debounced function that delays invoking the provided function until after
 * a specified wait time has elapsed since the last invocation.
 *
 * @example
 * ```ts
 * const debouncedLog = debounce(console.log, 1000);
 *
 * debouncedLog('Hello'); // Will log after 1 second if not called again
 * debouncedLog('World'); // Resets the timer, will log 'World' after 1 second
 * ```
 *
 * @param fn - The function to debounce.
 * @param [delay=300] - - The number of milliseconds to delay invoking the function.
 *
 * @returns - A debounced function
 */
export function debounce<T extends Fn>(fn: T, delay = 300): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
