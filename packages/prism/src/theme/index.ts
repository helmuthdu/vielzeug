export const PRISM_COLORS = [
  'var(--prism-color-1)',
  'var(--prism-color-2)',
  'var(--prism-color-3)',
  'var(--prism-color-4)',
  'var(--prism-color-5)',
  'var(--prism-color-6)',
  'var(--prism-color-7)',
  'var(--prism-color-8)',
] as const;

export function getSeriesColor(index: number): string {
  return PRISM_COLORS[index % PRISM_COLORS.length];
}
