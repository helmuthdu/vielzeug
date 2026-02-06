/**
 * Subtracts one number from another with precision handling for financial calculations.
 * Supports both regular numbers and bigint for exact precision.
 *
 * @example
 * ```ts
 * subtract(20, 10); // 10
 * subtract(0.3, 0.1); // 0.2 (precision-safe)
 * subtract(300n, 100n); // 200n
 * ```
 *
 * @param a - Number to subtract from
 * @param b - Number to subtract
 * @returns Difference of a and b
 */
export function subtract(a: number, b: number): number;
export function subtract(a: bigint, b: bigint): bigint;
export function subtract(a: number | bigint, b: number | bigint): number | bigint {
  if (typeof a === 'bigint' && typeof b === 'bigint') {
    return a - b;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  throw new TypeError('Both arguments must be of the same type (number or bigint)');
}
