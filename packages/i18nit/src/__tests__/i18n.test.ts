import { createI18n, type LocaleChangeEvent } from '../';

describe('i18n — minimal runtime', () => {
  test('defaults to locale "en"', () => {
    const i18n = createI18n();

    expect(i18n.locale).toBe('en');
  });

  test('t() resolves nested keys and fallback chain', () => {
    const i18n = createI18n({
      fallback: 'en',
      locale: 'fr',
      messages: {
        en: { nav: { home: 'Home' }, title: 'App' },
        fr: { title: 'Appli' },
      },
    });

    expect(i18n.t('title')).toBe('Appli');
    expect(i18n.t('nav.home')).toBe('Home');
  });

  test('t() uses onMissing fallback', () => {
    const i18n = createI18n({
      onMissing: (key) => `[missing:${key}]`,
    });

    expect(i18n.t('unknown')).toBe('[missing:unknown]');
  });

  test('setCatalog() replaces locale catalog', () => {
    const i18n = createI18n({ messages: { en: { hello: 'Hello' } } });

    i18n.setCatalog('en', { bye: 'Bye' });

    expect(i18n.t('hello')).toBe('hello');
    expect(i18n.t('bye')).toBe('Bye');
  });

  test('setCatalog() clones input', () => {
    const source = { user: { name: 'Alice' } };
    const i18n = createI18n();

    i18n.setCatalog('en', source);
    source.user.name = 'Mutated';

    expect(i18n.t('user.name')).toBe('Alice');
  });

  test('setLocale() is strict and loads via loader', async () => {
    const i18n = createI18n({
      loaders: {
        fr: async () => ({ hello: 'Bonjour' }),
      },
      locale: 'en',
    });

    await i18n.setLocale('fr');

    expect(i18n.locale).toBe('fr');
    expect(i18n.t('hello')).toBe('Bonjour');
  });

  test('setLocale() throws when no catalog and no loader', async () => {
    const i18n = createI18n({ locale: 'en' });

    await expect(i18n.setLocale('de')).rejects.toThrow('Missing loader for locale "de"');
  });

  test('preload() is tolerant and does not switch locale', async () => {
    const i18n = createI18n({ locale: 'en' });

    await expect(i18n.preload('de')).resolves.toBeUndefined();
    expect(i18n.locale).toBe('en');
  });

  test('preload() deduplicates concurrent loads', async () => {
    let calls = 0;
    const i18n = createI18n({
      loaders: {
        es: async () => {
          calls++;
          await new Promise((r) => setTimeout(r, 10));

          return { hello: 'Hola' };
        },
      },
    });

    await Promise.all([i18n.preload('es'), i18n.preload('es'), i18n.preload('es')]);

    expect(calls).toBe(1);
    await i18n.setLocale('es');
    expect(i18n.t('hello')).toBe('Hola');
  });

  test('subscribe() emits immediate, locale-change, and catalog-update events', async () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
    });
    const handler = vi.fn<(event: LocaleChangeEvent) => void>();

    i18n.subscribe(handler, true);
    expect(handler).toHaveBeenCalledWith({ locale: 'en', reason: 'init' });

    await i18n.setLocale('fr');
    expect(handler).toHaveBeenCalledWith({ locale: 'fr', reason: 'locale-change' });

    i18n.setCatalog('fr', { hello: 'Salut' });
    expect(handler).toHaveBeenCalledWith({ locale: 'fr', reason: 'catalog-update' });
  });

  test('dispose() prevents mutating methods', async () => {
    const i18n = createI18n();

    i18n.dispose();

    expect(() => i18n.setCatalog('en', { hello: 'Hello' })).toThrow('Cannot call setCatalog() after dispose()');
    expect(() => i18n.setLoader('en', async () => ({ hello: 'Hello' }))).toThrow(
      'Cannot call setLoader() after dispose()',
    );
    await expect(i18n.preload('en')).rejects.toThrow('Cannot call preload() after dispose()');
    await expect(i18n.setLocale('en')).rejects.toThrow('Cannot call setLocale() after dispose()');
    expect(() => i18n.subscribe(() => {})).toThrow('Cannot call subscribe() after dispose()');
  });
});
