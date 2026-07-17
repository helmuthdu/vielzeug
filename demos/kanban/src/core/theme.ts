import { effect, signal } from '@vielzeug/ripple';

export type ThemePreference = 'dark' | 'light' | 'system';

const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export const themePreference = signal<ThemePreference>('system');

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

effect(() => applyTheme(themePreference.value));

const colorSchemeQuery = globalThis.matchMedia?.(DARK_MODE_MEDIA_QUERY);

if (colorSchemeQuery) {
  const onColorSchemeChange = (): void => {
    if (themePreference.value === 'system') applyTheme('system');
  };

  colorSchemeQuery.addEventListener('change', onColorSchemeChange);
}
