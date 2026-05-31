// ── Number helpers ────────────────────────────────────────────────────────────

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
