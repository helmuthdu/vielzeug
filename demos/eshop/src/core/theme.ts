import { effect, signal } from '@vielzeug/ripple';

export type ThemePreference = 'dark' | 'light' | 'system';

const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/** A quiet, neutral steel-blue — used everywhere, on every surface, at low intensity. Real OEM
 * configurator sites (Mercedes-Benz, BMW) spend almost no color at all outside of links/CTAs; a
 * single restrained accent shared by the whole app reads as considered, not a missed opportunity
 * for "brand personality." */
const DEFAULT_ACCENT_HUE = 222;

/**
 * Light by default — every real car-configurator reference (Mercedes-Benz Store, BMW's
 * Neuwagensuche) is a bright, white-canvas retail site, not a dark showroom stage. `dark`/
 * `system` stay one click away in Settings for anyone who prefers them.
 */
export const themePreference = signal<ThemePreference>('light');

/** Drives `--color-primary-hue` — refine's secondary/derived tokens re-derive from it automatically. */
export const accentHue = signal<number>(DEFAULT_ACCENT_HUE);

function resolveDarkMode(preference: ThemePreference): boolean {
  if (preference === 'dark') return true;

  if (preference === 'light') return false;

  return globalThis.matchMedia?.(DARK_MODE_MEDIA_QUERY).matches ?? false;
}

function applyTheme(preference: ThemePreference): void {
  const isDark = resolveDarkMode(preference);
  const root = document.documentElement;

  root.classList.toggle('dark', isDark);
  root.classList.toggle('light', !isDark);
}

export function setThemePreference(preference: ThemePreference): void {
  themePreference.value = preference;
}

export function setAccentHue(hue: number): void {
  accentHue.value = hue;
}

effect(() => {
  applyTheme(themePreference.value);

  return undefined;
});

effect(() => {
  document.documentElement.style.setProperty('--color-primary-hue', `${accentHue.value}deg`);

  return undefined;
});

const colorSchemeQuery = globalThis.matchMedia?.(DARK_MODE_MEDIA_QUERY);

if (colorSchemeQuery) {
  const onColorSchemeChange = (): void => {
    if (themePreference.value === 'system') applyTheme('system');
  };

  colorSchemeQuery.addEventListener('change', onColorSchemeChange);
}
