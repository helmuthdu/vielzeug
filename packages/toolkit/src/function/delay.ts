import type { Fn } from '../types';
import { sleep } from './sleep';

/**
 * Delays the execution of a function by a specified amount of time.
 *
 * @example
 * ```ts
 * const log = () => console.log('Hello, world!');
 *
 * delay(log, 1000); // logs 'Hello, world!' after 1 second
 * ```
 *
 * @param fn - The function to be delayed.
 * @param delay - The amount of time to delay the function execution, in milliseconds. Default is 700.
 *
 * @returns A Promise that resolves with the result of the function execution.
 */
export async function delay<T extends Fn>(fn: T, delay = 700) {
  await sleep(delay);

  return fn();
}
