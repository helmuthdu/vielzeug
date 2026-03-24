/** Parse comma-separated values used by multi-select style controls. */
export function parseCsvValues(value: string | undefined): string[] {
  if (!value) return [];

  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Parse positive numeric values from optional component props. */
export function parsePositiveNumber(value: unknown): number | null {
  if (value == null) return null;

  const n = Number(value);

  return Number.isFinite(n) && n > 0 ? n : null;
}
