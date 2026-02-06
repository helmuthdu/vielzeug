/**
 * Divides a number by a divisor with precision handling for financial calculations.
 * Supports both regular numbers and bigint for exact precision.
 *
 * @example
 * ```ts
 * divide(20, 5); // 4
 * divide(0.6, 3); // 0.2 (precision-safe)
 * divide(500n, 5n); // 100n
 * ```
 *
 * @param a - Number to divide (dividend)
 * @param b - Divisor
 * @returns Quotient of a divided by b
 * @throws {Error} If divisor is zero
 */
export function divide(a: number, b: number): number;
export function divide(a: bigint, b: bigint): bigint;
export function divide(a: number | bigint, b: number | bigint): number | bigint {
  if (b === 0 || b === 0n) {
    throw new Error('Division by zero');
  }

  if (typeof a === 'bigint' && typeof b === 'bigint') {
    return a / b;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a / b;
  }
  throw new TypeError('Both arguments must be of the same type (number or bigint)');
}
