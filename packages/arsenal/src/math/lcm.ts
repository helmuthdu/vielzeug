import { gcd } from './gcd';

/**
 * Computes the least common multiple of two integers.
 *
 * @example
 * ```ts
 * lcm(4, 6); // 12
 * lcm(0, 5); // 0
 * ```
 *
 * @param a - The first integer.
 * @param b - The second integer.
 * @returns The least common multiple of `a` and `b`, or `0` if either is `0`.
 */
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;

  return Math.abs(a * b) / gcd(a, b);
}
