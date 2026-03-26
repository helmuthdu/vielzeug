/** Parse positive numeric values from optional component props. */
export function parsePositiveNumber(value: unknown): number | null {
  if (value == null) return null;

  const n = Number(value);

  return Number.isFinite(n) && n > 0 ? n : null;
}
