import { createI18n } from '../';

describe('core — minimal API', () => {
  test('exposes locale and catalog metadata', () => {
    const i18n = createI18n({
      loaders: { fr: async () => ({ hello: 'Bonjour' }) },
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    });

    expect(i18n.locale).toBe('en');
    expect(i18n.locales).toEqual(['en']);
    expect(i18n.loadableLocales).toEqual(['fr']);
  });

  test('has() checks translated key existence across the fallback chain', () => {
    const i18n = createI18n({
      fallback: 'en',
      locale: 'fr',
      messages: {
        en: { nav: { home: 'Home' } },
        fr: {},
      },
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
