import type { PrismTheme } from '../types';

export function setTheme(theme: PrismTheme): void {
  const root = document.documentElement;

  if (theme.colors) {
    theme.colors.forEach((c, i) => root.style.setProperty(`--prism-color-${i + 1}`, c));
  }

  if (theme.fontFamily) root.style.setProperty('--prism-font-family', theme.fontFamily);

  if (theme.gridColor) root.style.setProperty('--prism-grid-color', theme.gridColor);

  if (theme.gridOpacity !== undefined) root.style.setProperty('--prism-grid-opacity', String(theme.gridOpacity));
}

export function seriesColor(index: number, override?: string): string {
  return override ?? `var(--prism-color-${(index % 8) + 1})`;
}
