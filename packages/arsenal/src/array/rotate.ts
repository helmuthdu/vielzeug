/** Rotates or drops leading items without mutating the input. */
export function rotate<T>(array: T[], positions: number, options?: { wrap?: boolean }): T[];
export function rotate<T>(array: readonly T[], positions: number, options?: { wrap?: boolean }): readonly T[];
export function rotate<T>(
  array: readonly T[],
  positions: number,
  { wrap = false }: { wrap?: boolean } = {},
): readonly T[] {
  if (array.length === 0) return array;

  const normalizedPosition = ((positions % array.length) + array.length) % array.length;
  const rotated = array.slice(normalizedPosition);

  return wrap ? [...rotated, ...array.slice(0, normalizedPosition)] : rotated;
}
