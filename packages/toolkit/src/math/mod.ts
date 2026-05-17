/**
 * Sign-correct modulo.
 */
export function mod(a: number, b: number): number {
  if (b === 0) return Number.NaN;

  return ((a % b) + b) % b;
}
