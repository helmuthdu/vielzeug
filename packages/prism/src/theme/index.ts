import type { PrismTheme } from '../types';

const MAX_THEME_COLORS = 8;

export function setTheme(theme: PrismTheme): void {
  const root = document.documentElement;

  if (theme.colors) {
    // Clear (not just overwrite) every color slot the previous setTheme() call may have
    // used — otherwise a theme with fewer colors than the last one leaves stale values
    // on the untouched higher-index custom properties.
    for (let i = 0; i < MAX_THEME_COLORS; i++) {
      const color = theme.colors[i];

      if (color) {
        root.style.setProperty(`--prism-color-${i + 1}`, color);
      } else {
        root.style.removeProperty(`--prism-color-${i + 1}`);
      }
    }
  }

  if (theme.fontFamily) root.style.setProperty('--prism-font-family', theme.fontFamily);

  if (theme.gridColor) root.style.setProperty('--prism-grid-color', theme.gridColor);

  if (theme.gridOpacity !== undefined) root.style.setProperty('--prism-grid-opacity', String(theme.gridOpacity));
}

/** Clears every CSS custom property `setTheme()` can set, restoring prism's default theme (from `prism.css`). */
export function resetTheme(): void {
  const root = document.documentElement;

  for (let i = 1; i <= MAX_THEME_COLORS; i++) root.style.removeProperty(`--prism-color-${i}`);

  root.style.removeProperty('--prism-font-family');
  root.style.removeProperty('--prism-grid-color');
  root.style.removeProperty('--prism-grid-opacity');
}

export function seriesColor(index: number, override?: string): string {
  return override ?? `var(--prism-color-${(index % MAX_THEME_COLORS) + 1})`;
}
