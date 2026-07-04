/**
 * Computes the greatest common divisor of two integers using the Euclidean algorithm.
 * The sign of the inputs is ignored — the result is always non-negative.
 *
 * @example
 * ```ts
 * gcd(12, 18); // 6
 * gcd(-12, 18); // 6
 * gcd(0, 5); // 5
 * gcd(0, 0); // 0
 * ```
 *
 * @param a - The first integer.
 * @param b - The second integer.
 * @returns The greatest common divisor of `a` and `b`.
 */
export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const temp = y;

    y = x % y;
    x = temp;
  }

  return x;
}
