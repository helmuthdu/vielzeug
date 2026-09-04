import { effect, signal } from '@vielzeug/ripple';

export type ThemePreference = 'dark' | 'light' | 'system';
export const themePreference = signal<ThemePreference>('system');
const systemTheme = matchMedia('(prefers-color-scheme: dark)');

function applyTheme(preference: ThemePreference): void {
  const dark = preference === 'dark' || (preference === 'system' && systemTheme.matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.classList.toggle('light', !dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

export function setThemePreference(preference: ThemePreference): void {
  themePreference.value = preference;
}

effect(() => {
  applyTheme(themePreference.value);
});
systemTheme.addEventListener('change', () => {
  if (themePreference.value === 'system') applyTheme('system');
});
