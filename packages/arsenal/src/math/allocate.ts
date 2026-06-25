import { ArsenalError } from '../errors';

/**
 * Distributes an amount proportionally according to given ratios.
 * Handles rounding to ensure the sum equals the original amount exactly.
 * The indivisible remainder is allocated to the last bucket.
 * Critical for financial operations like splitting payments to avoid rounding errors.
 *
 * @example
 * ```ts
 * // Split $100 in ratio 1:2:3 (total ratio = 6)
 * allocate(100, [1, 2, 3]);
 * // [16, 33, 51] - sum is exactly 100
 *
 * // Split $100 evenly among 3 parts
 * allocate(100, 3);
 * // [33, 33, 34] - sum is exactly 100
 *
 * // Split with bigint (e.g., cents)
 * allocate(10000n, [1, 1, 1]);
 * // [3333n, 3333n, 3334n] - sum is exactly 10000n
 * ```
 *
 * @param amount - Total amount to allocate
 * @param ratios - Array of ratios for distribution or number of equal parts
 * @returns Array of allocated amounts with remainder applied to last bucket (sum equals original amount)
 * @throws {Error} If ratios array is empty, contains negative values, or sum to zero
 * @throws {ArsenalError} If parts is not a positive integer
 */
export function allocate(amount: number, ratios: number[] | number): number[];
export function allocate(amount: bigint, ratios: number[] | number): bigint[];
export function allocate(amount: number | bigint, ratios: number[] | number): (number | bigint)[] {
  // If second param is a number, validate and treat it as number of equal parts
  if (typeof ratios === 'number') {
    if (!Number.isInteger(ratios) || ratios < 1) {
      throw new ArsenalError(`Parts must be a positive integer, got ${ratios}`);
    }
  }

  const actualRatios = Array.isArray(ratios) ? ratios : Array(ratios).fill(1);

  if (actualRatios.length === 0) {
    throw new ArsenalError('Ratios array cannot be empty');
  }

  if (actualRatios.some((r) => r < 0)) {
    throw new ArsenalError('Ratios must be non-negative');
  }

  const totalRatio = actualRatios.reduce((sum, ratio) => sum + ratio, 0);

  if (totalRatio === 0) {
    throw new ArsenalError('Total ratio cannot be zero');
  }

  if (typeof amount === 'bigint') {
    const totalRatioBigInt = BigInt(totalRatio);
    const results = Array.from(
      { length: actualRatios.length - 1 },
      (_, i) => (amount * BigInt(actualRatios[i])) / totalRatioBigInt,
    );

    results.push(amount - results.reduce((s, v) => s + v, 0n));

    return results;
  }

  // For number type, use proportional allocation for all ratios uniformly
  const results = Array.from({ length: actualRatios.length - 1 }, (_, i) =>
    Math.floor((amount * actualRatios[i]) / totalRatio),
  );

  results.push(amount - results.reduce((s, v) => s + v, 0));

  return results;
}
