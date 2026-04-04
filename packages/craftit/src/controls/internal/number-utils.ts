export const toFiniteNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
};

export const toFiniteNumberOr = (value: unknown, fallback: number): number => {
  return toFiniteNumber(value) ?? fallback;
};

export const toPositiveStep = (value: unknown, fallback: number): number => {
  return Math.abs(toFiniteNumberOr(value, fallback)) || fallback;
};

export const normalizeFinite = (value: number, fallback: number): number => {
  return Number.isFinite(value) ? value : fallback;
};

export const clampNumber = (value: number, min?: number, max?: number): number => {
  if (min != null && value < min) return min;

  if (max != null && value > max) return max;

  return value;
};
