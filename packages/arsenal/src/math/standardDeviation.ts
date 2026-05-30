import { variance } from './variance';

/**
 * Computes population standard deviation of numeric values.
 */
export function standardDeviation<T>(array: T[], callback?: (item: T) => number): number {
  return Math.sqrt(variance(array, callback));
}
