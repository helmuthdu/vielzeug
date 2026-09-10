import { signal } from '@vielzeug/ripple';

export type Theme = 'dark' | 'light';
const systemTheme: Theme = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
export const theme = signal<Theme>(systemTheme);

theme.subscribe(() => applyTheme());

export function applyTheme(): void {
  document.documentElement.classList.toggle('dark', theme.value === 'dark');
  document.documentElement.classList.toggle('light', theme.value === 'light');
  document.documentElement.style.colorScheme = theme.value;
}

export function toggleTheme(): void {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}

applyTheme();
