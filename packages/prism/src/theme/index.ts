import type { PrismTheme, ThemeScope } from '../types';

const MAX_THEME_COLORS = 8;

// Every scalar PrismTheme key mapped to the CSS custom property it drives. setTheme/resetTheme
// iterate this single table, so expanding the theme surface is one row here plus one field on
// PrismTheme — the two can never drift apart. `colors` is handled separately: it fans out to
// indexed slots that must all be cleared, not just overwritten.
const THEME_TOKENS = {
  axisColor: '--prism-axis-color',
  fontFamily: '--prism-font-family',
  gridColor: '--prism-grid-color',
  gridOpacity: '--prism-grid-opacity',
  textColor: '--prism-text-color',
  textColorSecondary: '--prism-text-color-secondary',
  tooltipBg: '--prism-tooltip-bg',
  tooltipBorder: '--prism-tooltip-border',
  tooltipColor: '--prism-tooltip-color',
} as const satisfies Record<keyof Omit<PrismTheme, 'colors'>, string>;

function target(options?: ThemeScope): HTMLElement {
  return options?.scope ?? document.documentElement;
}

/**
 * Apply theme tokens as CSS custom properties. Writes to `options.scope` when given, otherwise
 * to `document.documentElement`. A scoped call themes one subtree (charts render inside it, so
 * their `var(--prism-*)` lookups resolve against it) without touching `:root`.
 */
export function setTheme(theme: PrismTheme, options?: ThemeScope): void {
  const root = target(options);

  if (theme.colors) {
    // Clear (not just overwrite) every color slot a previous setTheme() may have used, so a
    // theme with fewer colors than the last one leaves no stale values on higher-index slots.
    for (let i = 0; i < MAX_THEME_COLORS; i++) {
      const color = theme.colors[i];

      if (color) {
        root.style.setProperty(`--prism-color-${i + 1}`, color);
      } else {
        root.style.removeProperty(`--prism-color-${i + 1}`);
      }
    }
  }

  for (const [key, property] of Object.entries(THEME_TOKENS)) {
    const value = theme[key as keyof typeof THEME_TOKENS];

    if (value !== undefined) root.style.setProperty(property, String(value));
  }
}

/** Clear every custom property `setTheme()` can set on `options.scope` (default `documentElement`), restoring prism's default theme from `theme.css`. */
export function resetTheme(options?: ThemeScope): void {
  const root = target(options);

  for (let i = 1; i <= MAX_THEME_COLORS; i++) root.style.removeProperty(`--prism-color-${i}`);

  for (const property of Object.values(THEME_TOKENS)) root.style.removeProperty(property);
}

export function seriesColor(index: number, override?: string): string {
  return override ?? `var(--prism-color-${(index % MAX_THEME_COLORS) + 1})`;
}
