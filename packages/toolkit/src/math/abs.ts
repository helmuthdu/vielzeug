/**
 * Returns the absolute value of a number.
 * Supports both regular numbers and bigint.
 *
 * @example
 * ```ts
 * abs(-5); // 5
 * abs(3); // 3
 * abs(-100n); // 100n
 * ```
 *
 * @param value - The number or bigint to get absolute value of
 * @returns Absolute value
 */
export function abs(value: number): number;
export function abs(value: bigint): bigint;
export function abs(value: number | bigint): number | bigint {
  if (typeof value === 'bigint') {
    return value < 0n ? -value : value;
  }
  return Math.abs(value);
}
