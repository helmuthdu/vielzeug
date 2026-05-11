import { createI18n, type LocaleChangeEvent } from '../';

describe('i18n — minimal runtime', () => {
  test('defaults to locale "en"', () => {
    const i18n = createI18n();

    expect(i18n.locale).toBe('en');
  });

  test('t() resolves nested keys and fallback chain', () => {
    const i18n = createI18n({
      catalogs: {
        en: { nav: { home: 'Home' }, title: 'App' },
        fr: { title: 'Appli' },
      },
      fallback: 'en',
      locale: 'fr',
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
    const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

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

  test('mergeCatalog() deep-merges locale catalog', () => {
    const i18n = createI18n({ catalogs: { en: { nav: { home: 'Home' }, title: 'App' } } });

    i18n.mergeCatalog('en', { nav: { about: 'About' } });

    expect(i18n.t('title')).toBe('App');
    expect(i18n.t('nav.home')).toBe('Home');
    expect(i18n.t('nav.about')).toBe('About');
  });

  test('setLocale() is strict and loads via loader', async () => {
    const i18n = createI18n({
      catalogs: {
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
      catalogs: {
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
      catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
      locale: 'en',
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
    expect(() => i18n.mergeCatalog('en', { hello: 'Hello' })).toThrow('Cannot call mergeCatalog() after dispose()');
    expect(() => i18n.setLoader('en', async () => ({ hello: 'Hello' }))).toThrow(
      'Cannot call setLoader() after dispose()',
    );
    await expect(i18n.preload('en')).rejects.toThrow('Cannot call preload() after dispose()');
    await expect(i18n.setLocale('en')).rejects.toThrow('Cannot call setLocale() after dispose()');
    expect(() => i18n.subscribe(() => {})).toThrow('Cannot call subscribe() after dispose()');
  });

  test('async dispose waits for in-flight loaders before disposing', async () => {
    let releaseLoader: (() => void) | undefined;

    const i18n = createI18n({
      catalogs: {
        fr: async () => {
          await new Promise<void>((resolve) => {
            releaseLoader = resolve;
          });

          return { hello: 'Bonjour' };
        },
      },
    });

    const localeChange = i18n.setLocale('fr');
    const disposePromise = i18n[Symbol.asyncDispose]();

    await Promise.resolve();

    let settled = false;

    disposePromise.then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    releaseLoader?.();

    await expect(disposePromise).resolves.toBeUndefined();
    await expect(localeChange).resolves.toBeUndefined();
    expect(() => i18n.setCatalog('fr', { hello: 'Salut' })).toThrow('Cannot call setCatalog() after dispose()');
  });

  test('t() resolves context sub-keys via dot notation', () => {
    const i18n = createI18n({
      catalogs: {
        en: {
          greet: 'Hello',
          invite: { female: 'Invite her' },
        },
      },
    });

    expect(i18n.t('greet')).toBe('Hello');
    expect(i18n.t('invite.female')).toBe('Invite her');
  });

  test('tp() supports ordinal forms', () => {
    const i18n = createI18n({
      catalogs: {
        en: {
          position: {
            few: '{count}rd place',
            one: '{count}st place',
            other: '{count}th place',
            two: '{count}nd place',
          },
        },
      },
      locale: 'en',
    });

    expect(i18n.tp('position', 1, undefined, true)).toBe('1st place');
    expect(i18n.tp('position', 2, undefined, true)).toBe('2nd place');
    expect(i18n.tp('position', 3, undefined, true)).toBe('3rd place');
    expect(i18n.tp('position', 4, undefined, true)).toBe('4th place');
  });
});
