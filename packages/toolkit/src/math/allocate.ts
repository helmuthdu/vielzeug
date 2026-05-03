/**
 * Distributes an amount proportionally according to given ratios.
 * Handles rounding to ensure the sum equals the original amount exactly.
 * Critical for financial operations like splitting payments to avoid rounding errors.
 *
 * @example
 * ```ts
 * // Split $100 in ratio 1:2:3
 * allocate(100, [1, 2, 3]);
 * // [17, 33, 50] - sum is exactly 100
 *
 * // Split $100 evenly among 3 (equivalent to distribute)
 * allocate(100, 3);
 * // [34, 33, 33] - sum is exactly 100
 *
 * // Split with bigint (e.g., cents)
 * allocate(10000n, [1, 1, 1]);
 * // [3334n, 3333n, 3333n] - sum is exactly 10000n
 * ```
 *
 * @param amount - Total amount to allocate
 * @param ratios - Array of ratios for distribution or number of equal parts
 * @returns Array of allocated amounts (sum equals original amount)
 * @throws {Error} If ratios are invalid or parts < 1
 */
export function allocate(amount: number, ratios: number[] | number): number[];
export function allocate(amount: bigint, ratios: number[] | number): bigint[];
export function allocate(amount: number | bigint, ratios: number[] | number): (number | bigint)[] {
  // If second param is a number, treat it as number of equal parts
  const actualRatios = Array.isArray(ratios) ? ratios : Array(ratios).fill(1);

  if (actualRatios.length === 0) {
    throw new Error('Ratios array cannot be empty');
  }

  if (actualRatios.some((r) => r < 0)) {
    throw new Error('Ratios must be non-negative');
  }

  const totalRatio = actualRatios.reduce((sum, ratio) => sum + ratio, 0);

  if (totalRatio === 0) {
    throw new Error('Total ratio cannot be zero');
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

  // Handle number type - for equal distribution, use simple division
  if (actualRatios.every((r) => r === 1)) {
    const baseShare = Math.floor(amount / actualRatios.length);
    const remainder = amount - baseShare * actualRatios.length;

    return Array.from({ length: actualRatios.length }, (_, i) => (i < remainder ? baseShare + 1 : baseShare));
  }

  // For weighted ratios, use proportional allocation
  const results = Array.from({ length: actualRatios.length - 1 }, (_, i) =>
    Math.floor((amount * actualRatios[i]) / totalRatio),
  );

  results.push(amount - results.reduce((s, v) => s + v, 0));

  return results;
}
