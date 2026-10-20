import { createThemeController } from '@vielzeug/refine/theme';

const controller = createThemeController();

/** The effective light/dark mode, following the OS until an explicit choice is made. */
export const theme = controller.resolved;

export function setTheme(mode: 'dark' | 'light'): void {
  controller.setPreference(mode);
}
