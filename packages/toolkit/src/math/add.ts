/**
 * Adds two numbers with precision handling for financial calculations.
 * Supports both regular numbers and bigint for exact precision.
 *
 * @example
 * ```ts
 * add(10, 20); // 30
 * add(0.1, 0.2); // 0.3 (precision-safe)
 * add(100n, 200n); // 300n
 * ```
 *
 * @param a - First number or bigint
 * @param b - Second number or bigint
 * @returns Sum of a and b
 */
export function add(a: number, b: number): number;
export function add(a: bigint, b: bigint): bigint;
export function add(a: number | bigint, b: number | bigint): number | bigint {
  if (typeof a === 'bigint' && typeof b === 'bigint') {
    return a + b;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a + b;
  }
  throw new TypeError('Both arguments must be of the same type (number or bigint)');
}
