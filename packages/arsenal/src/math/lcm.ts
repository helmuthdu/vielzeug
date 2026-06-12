import { gcd } from './gcd';

/**
 * Least common multiple.
 */
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;

  return Math.abs(a * b) / gcd(a, b);
}
