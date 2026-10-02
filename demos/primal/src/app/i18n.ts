import { createI18n, type PluralKey, type TextKey } from '@vielzeug/lingua';
import { shallowRef } from 'vue';
import { en } from './locales/en';
import type { AppLocale } from './persistence';

/** The English catalog is the canonical shape; every key the app may ask for is a path through it. */
export type MessageKey = TextKey<typeof en>;
/** Keys whose catalog entry is a plural message: the only ones `tp` accepts. */
export type PluralMessageKey = PluralKey<typeof en>;

export const i18n = createI18n({
  catalogs: { en },
  // German is a lazy chunk: only the active language loads at boot, and
  // setLocale('de') resolves before the locale switches, so translations never
  // render half-loaded: English simply persists until the catalog arrives.
  loadCatalog: (locale) => (locale === 'de' ? import('./locales/de').then((m) => m.de) : en),
  locale: 'en',
});

/**
 * Bridges lingua's subscribe() into a Vue ref so template bindings built on `t()` re-render
 * the instant `setLocale()` resolves: the returned string itself is not reactive.
 */
export const currentLocale = shallowRef<AppLocale>(i18n.locale as AppLocale);

i18n.subscribe((snapshot) => {
  currentLocale.value = snapshot.locale as AppLocale;
  if (typeof document !== 'undefined') document.documentElement.lang = snapshot.locale;
});

export function setLocale(locale: AppLocale): Promise<void> {
  return i18n.setLocale(locale);
}

export function t(key: MessageKey, vars?: Record<string, unknown>): string {
  void currentLocale.value;
  return i18n.translateDynamic(key, vars ? { values: vars } : undefined);
}

/** Plural-aware variant: `count` selects the CLDR category and is merged into values for `{count}`. */
export function tp(key: PluralMessageKey, count: number, vars?: Record<string, unknown>): string {
  void currentLocale.value;
  return i18n.translateDynamic(key, { count, values: vars });
}
