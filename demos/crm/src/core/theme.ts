import { createThemeController, type ThemePreference } from '@vielzeug/refine/theme';

export type { ThemePreference };

const controller = createThemeController();

/** The user's light/dark/system selection. */
export const themePreference = controller.preference;

export function setThemePreference(preference: ThemePreference): void {
  controller.setPreference(preference);
}
