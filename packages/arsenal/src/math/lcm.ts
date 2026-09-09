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
  const divisor = gcd(a, b);

  if (divisor === 0) return 0;

  const result = Math.abs((a / divisor) * b);

  if (!Number.isSafeInteger(result)) throw new RangeError('lcm: result exceeds the safe integer range');

  return result;
}
