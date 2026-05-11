/**
 * Greatest common divisor.
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
