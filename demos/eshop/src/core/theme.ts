import { createThemeController, type ThemePreference } from '@vielzeug/refine/theme';
import { effect, signal } from '@vielzeug/ripple';

export type { ThemePreference };

/** A quiet, neutral steel-blue: used everywhere, on every surface, at low intensity. Real OEM
 * configurator sites (Mercedes-Benz, BMW) spend almost no color at all outside of links/CTAs; a
 * single restrained accent shared by the whole app reads as considered, not a missed opportunity
 * for "brand personality." */
export const DEFAULT_ACCENT_HUE = 222;
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'light';

/**
 * Light by default: every real car-configurator reference (Mercedes-Benz Store, BMW's
 * Neuwagensuche) is a bright, white-canvas retail site, not a dark showroom stage. `dark`/
 * `system` stay one click away in Settings for anyone who prefers them.
 */
const controller = createThemeController({ initial: DEFAULT_THEME_PREFERENCE });

/** The user's light/dark/system selection. */
export const themePreference = controller.preference;

/** Drives `--color-primary-hue`: refine's secondary/derived tokens re-derive from it automatically. */
export const accentHue = signal<number>(DEFAULT_ACCENT_HUE);

export function setThemePreference(preference: ThemePreference): void {
  controller.setPreference(preference);
}

export function setAccentHue(hue: number): void {
  accentHue.value = hue;
}

effect(() => {
  document.documentElement.style.setProperty('--color-primary-hue', `${accentHue.value}deg`);

  return undefined;
});
