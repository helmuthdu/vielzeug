import { average } from './average';

/**
 * Computes population variance of numeric values.
 */
export function variance<T>(array: T[], callback?: (item: T) => number): number {
  if (array.length === 0) return 0;

  const values = callback ? array.map(callback) : (array as unknown as number[]);
  const mean = average(values) ?? 0;

  return average(values.map((value) => (value - mean) ** 2)) ?? 0;
}
