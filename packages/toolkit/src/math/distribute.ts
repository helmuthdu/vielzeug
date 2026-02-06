/**
 * Distributes an amount evenly among N parties.
 * Handles rounding to ensure the sum equals the original amount exactly.
 * Useful for splitting bills, costs, or payments equally.
 *
 * @example
 * ```ts
 * // Split $100 among 3 people
 * distribute(100, 3);
 * // [34, 33, 33] - sum is exactly 100
 *
 * // Split with bigint (e.g., cents)
 * distribute(10000n, 3);
 * // [3334n, 3333n, 3333n] - sum is exactly 10000n
 * ```
 *
 * @param amount - Total amount to distribute
 * @param parts - Number of parts to divide into
 * @returns Array of distributed amounts (a sum equals original amount)
 * @throws {Error} If parts are less than 1
 */
export function distribute(amount: number, parts: number): number[];
export function distribute(amount: bigint, parts: number): bigint[];
export function distribute(amount: number | bigint, parts: number): (number | bigint)[] {
  if (parts < 1) {
    throw new Error('Parts must be at least 1');
  }

  if (typeof amount === 'bigint') {
    const baseShare = amount / BigInt(parts);
    const remainder = amount % BigInt(parts);
    const results: bigint[] = [];

    for (let i = 0; i < parts; i++) {
      // Distribute the remainder to first items
      results.push(i < Number(remainder) ? baseShare + 1n : baseShare);
    }

    return results;
  }

  // Handle number type
  const baseShare = Math.floor(amount / parts);
  const remainder = amount - baseShare * parts;
  const results: number[] = [];

  for (let i = 0; i < parts; i++) {
    // Distribute the remainder to first items
    results.push(i < remainder ? baseShare + 1 : baseShare);
  }

  return results;
}
