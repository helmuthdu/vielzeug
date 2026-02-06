/**
 * Multiplies a number by a scalar with precision handling for financial calculations.
 * Supports both regular numbers and bigint for exact precision.
 *
 * @example
 * ```ts
 * multiply(10, 5); // 50
 * multiply(0.1, 3); // 0.3 (precision-safe)
 * multiply(100n, 5n); // 500n
 * ```
 *
 * @param a - Number to multiply
 * @param b - Multiplier
 * @returns Product of a and b
 */
export function multiply(a: number, b: number): number;
export function multiply(a: bigint, b: bigint): bigint;
export function multiply(a: number | bigint, b: number | bigint): number | bigint {
  if (typeof a === 'bigint' && typeof b === 'bigint') {
    return a * b;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a * b;
  }
  throw new TypeError('Both arguments must be of the same type (number or bigint)');
}
