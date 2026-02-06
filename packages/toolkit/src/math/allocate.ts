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
 * // Split with bigint (e.g., cents)
 * allocate(10000n, [1, 1, 1]);
 * // [3334n, 3333n, 3333n] - sum is exactly 10000n
 * ```
 *
 * @param amount - Total amount to allocate
 * @param ratios - Array of ratios for distribution
 * @returns Array of allocated amounts (sum equals original amount)
 * @throws {Error} If ratios array is empty or contains negative values
 */
export function allocate(amount: number, ratios: number[]): number[];
export function allocate(amount: bigint, ratios: number[]): bigint[];
export function allocate(amount: number | bigint, ratios: number[]): (number | bigint)[] {
  if (ratios.length === 0) {
    throw new Error('Ratios array cannot be empty');
  }

  if (ratios.some((r) => r < 0)) {
    throw new Error('Ratios must be non-negative');
  }

  const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);

  if (totalRatio === 0) {
    throw new Error('Total ratio cannot be zero');
  }

  if (typeof amount === 'bigint') {
    const results: bigint[] = [];
    let remainder = amount;

    for (let i = 0; i < ratios.length - 1; i++) {
      const share = (amount * BigInt(Math.floor(ratios[i] * 1000000))) / BigInt(Math.floor(totalRatio * 1000000));
      results.push(share);
      remainder -= share;
    }

    // Last allocation gets the remainder to ensure exact sum
    results.push(remainder);
    return results;
  }

  // Handle number type
  const results: number[] = [];
  let remainder = amount;

  for (let i = 0; i < ratios.length - 1; i++) {
    const share = Math.floor((amount * ratios[i]) / totalRatio);
    results.push(share);
    remainder -= share;
  }

  // Last allocation gets the remainder to ensure exact sum
  results.push(remainder);
  return results;
}
