import { createI18n } from '../';

describe('core — redesigned API', () => {
  test('getSupportedLocales() returns all known locales', () => {
    const i18n = createI18n({
      catalogs: {
        en: { hello: 'Hello' },
      },
      locale: 'en',
    });

    i18n.register('fr', async () => ({ hello: 'Bonjour' }));

    expect(i18n.getSupportedLocales()).toEqual(['en', 'fr']);
  });

  test('getSupportedLocales({ sorted: true }) returns locales in alphabetical order', () => {
    const i18n = createI18n({
      catalogs: { en: { hello: 'Hello' }, zh: { hello: '你好' } },
    });

    expect(i18n.getSupportedLocales({ sorted: true })).toEqual(['en', 'zh']);
  });

  test('has() checks key existence across fallback chain', () => {
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

  test('register() updates getSupportedLocales()', () => {
    const i18n = createI18n();

    expect(i18n.getSupportedLocales()).toEqual([]);

    i18n.register('de', async () => ({ hello: 'Hallo' }));
    expect(i18n.getSupportedLocales()).toEqual(['de']);
  });

  test('catalogs accepts mixed static messages and async loaders', async () => {
    const i18n = createI18n({
      catalogs: {
        en: { hello: 'Hello' },
        fr: async () => ({ hello: 'Bonjour' }),
      },
      locale: 'en',
    });

    await i18n.setLocale('fr');

    expect(i18n.locale).toBe('fr');
    expect(i18n.t('hello')).toBe('Bonjour');
  });
});
