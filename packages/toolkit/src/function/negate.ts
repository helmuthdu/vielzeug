import type { Fn } from '../types';

/**
 * Inverts a predicate result.
 */
export function negate<T extends Fn>(predicate: T) {
  return (...args: Parameters<T>): boolean => !predicate(...args);
}
