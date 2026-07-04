import { ArsenalValidationError } from '../errors';

/**
 * Sign-correct modulo — unlike the native `%` operator, the result always has the same sign
 * as the divisor `b` (e.g. `mod(-1, 4)` is `3`, not `-1`).
 *
 * @example
 * ```ts
 * mod(-1, 4); // 3
 * mod(5, 3); // 2
 * ```
 *
 * @param a - The dividend.
 * @param b - The divisor. Must not be `0`.
 * @returns The sign-correct modulo of `a` by `b`.
 *
 * @throws {ArsenalValidationError} If `b` is `0`.
 */
export function mod(a: number, b: number): number {
  if (b === 0) throw new ArsenalValidationError('mod: divisor cannot be 0');

  return ((a % b) + b) % b;
}
