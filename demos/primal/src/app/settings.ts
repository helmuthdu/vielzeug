import { setLocale } from './i18n';
import type { AppLocale, Settings } from './persistence';
import { DEFAULT_SETTINGS } from './persistence';
import { persistSettings, settings } from './subject-state';
// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** The one settings write path: patch the fields that changed, persist, and let the observer carry it. */
export function patchSettings(patch: Partial<Settings>): void {
  settings.update((current) => ({ ...current, ...patch }));
  persistSettings(settings.value);
}

/** Language is the one setting with a side effect: the catalog must load before the switch. */
export function setLanguage(language: AppLocale): void {
  patchSettings({ language });
  void setLocale(language);
}

export function resetSettings(): void {
  settings.update(() => ({ ...DEFAULT_SETTINGS }));
  void setLocale(DEFAULT_SETTINGS.language);
  persistSettings(settings.value);
}
