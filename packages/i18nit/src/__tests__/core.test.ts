import { createI18n } from '../';

describe('core — minimal API', () => {
  test('exposes locale and catalog metadata', () => {
    const i18n = createI18n({
      catalogs: {
        en: { hello: 'Hello' },
        fr: async () => ({ hello: 'Bonjour' }),
      },
      locale: 'en',
    });

    expect(i18n.locale).toBe('en');
    expect(i18n.loadedLocales).toEqual(['en']);
    expect(i18n.loadableLocales).toEqual(['fr']);
  });

  test('has() checks translated key existence across the fallback chain', () => {
    const i18n = createI18n({
      catalogs: {
        en: { nav: { home: 'Home' } },
        fr: {},
      },
      fallback: 'en',
      locale: 'fr',
    });

    expect(i18n.has('nav.home')).toBe(true);
    expect(i18n.has('nav.missing')).toBe(false);
  });

  test('setLoader() updates loadableLocales', () => {
    const i18n = createI18n();

    expect(i18n.loadableLocales).toEqual([]);

    i18n.setLoader('de', async () => ({ hello: 'Hallo' }));
    expect(i18n.loadableLocales).toEqual(['de']);
  });
});
