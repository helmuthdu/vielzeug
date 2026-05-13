import { createI18n } from '../';

describe('i18n — redesigned runtime', () => {
  test('defaults to locale "en"', () => {
    const i18n = createI18n();

    expect(i18n.locale).toBe('en');
    expect(i18n.getSnapshot().locale).toBe('en');
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

  test('t() uses unified onMissing callback for missing keys', () => {
    const i18n = createI18n({
      onMissing: (info) => `[${info.type}:${info.key}]`,
    });

    expect(i18n.t('unknown')).toBe('[key:unknown]');
  });

  test('t() uses unified onMissing callback for missing vars', () => {
    const i18n = createI18n({
      catalogs: { en: { greeting: 'Hello, {name}!' } },
      onMissing: (info) => (info.type === 'var' ? `<${info.varName}>` : info.key),
    });

    expect(i18n.t('greeting')).toBe('Hello, <name>!');
  });

  test('register() replaces locale source with static catalog', () => {
    const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

    i18n.register('en', { bye: 'Bye' });

    expect(i18n.t('hello')).toBe('hello');
    expect(i18n.t('bye')).toBe('Bye');
  });

  test('setLocale() loads via dynamic source then switches', async () => {
    const i18n = createI18n({ locale: 'en' });

    i18n.register('fr', async () => ({ hello: 'Bonjour' }));
    await i18n.setLocale('fr');

    expect(i18n.locale).toBe('fr');
    expect(i18n.t('hello')).toBe('Bonjour');
  });

  test('setLocale() throws when locale source is missing', async () => {
    const i18n = createI18n({ locale: 'en' });

    await expect(i18n.setLocale('de')).rejects.toThrow('Missing locale source for locale "de"');
  });

  test('setLocale() is a no-op when locale is unchanged', async () => {
    const i18n = createI18n({
      catalogs: { en: { hello: 'Hello' } },
      locale: 'en',
    });
    const listener = vi.fn<() => void>();

    i18n.subscribe(listener);
    await i18n.setLocale('en');

    expect(listener).not.toHaveBeenCalled();
  });

  test('setLocale() race guard: last call wins', async () => {
    let resolveFirst!: () => void;
    const i18n = createI18n({ locale: 'en' });

    i18n.register(
      'fr',
      () =>
        new Promise<{ hello: string }>((resolve) => {
          resolveFirst = () => resolve({ hello: 'Bonjour' });
        }),
    );
    i18n.register('de', async () => ({ hello: 'Hallo' }));

    const frSwitch = i18n.setLocale('fr');
    const deSwitch = i18n.setLocale('de');

    resolveFirst();
    await Promise.all([frSwitch, deSwitch]);

    expect(i18n.locale).toBe('de');
  });

  test('preload() loads locale messages without switching locale', async () => {
    const i18n = createI18n({
      catalogs: {
        en: { hello: 'Hello' },
        es: async () => ({ hello: 'Hola' }),
      },
      locale: 'en',
    });

    await i18n.preload('es');

    expect(i18n.locale).toBe('en');
    await i18n.setLocale('es');
    expect(i18n.t('hello')).toBe('Hola');
  });

  test('preload() deduplicates concurrent loads', async () => {
    let calls = 0;
    const i18n = createI18n({
      catalogs: {
        en: {},
        es: async () => {
          calls++;
          await new Promise((r) => setTimeout(r, 10));

          return { hello: 'Hola' };
        },
      },
      locale: 'en',
    });

    await Promise.all([i18n.preload('es'), i18n.preload('es'), i18n.preload('es')]);

    expect(calls).toBe(1);
  });

  test('subscribe() does not fire immediately by default', () => {
    const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } }, locale: 'en' });
    const listener = vi.fn<() => void>();

    i18n.subscribe(listener);

    expect(listener).not.toHaveBeenCalled();
  });

  test('subscribe({ immediate: true }) fires once', () => {
    const i18n = createI18n({ locale: 'en' });
    const listener = vi.fn<() => void>();

    i18n.subscribe(listener, { immediate: true });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('subscribe() tracks version changes from locale transitions', async () => {
    const i18n = createI18n({
      catalogs: {
        en: { hello: 'Hello' },
        fr: { hello: 'Bonjour' },
      },
      locale: 'en',
    });
    const versions: number[] = [];

    i18n.subscribe(() => {
      versions.push(i18n.getSnapshot().version);
    });

    await i18n.setLocale('fr');

    expect(versions.length).toBe(1);
    expect(versions[0]).toBeGreaterThan(0);
  });

  test('subscribe() isolates listener failures', async () => {
    const i18n = createI18n({
      catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
      locale: 'en',
    });
    const bad = vi.fn<() => void>(() => {
      throw new Error('boom');
    });
    const good = vi.fn<() => void>();

    i18n.subscribe(bad);
    i18n.subscribe(good);

    await expect(i18n.setLocale('fr')).resolves.toBeUndefined();
    expect(good).toHaveBeenCalled();
  });

  test('t() handles plural branches when count is provided', () => {
    const i18n = createI18n({
      catalogs: {
        en: {
          inbox: {
            one: 'One message',
            other: '{count} messages',
            zero: 'No messages',
          },
        },
      },
      locale: 'en',
    });

    expect(i18n.t('inbox', { count: 0 })).toBe('No messages');
    expect(i18n.t('inbox', { count: 1 })).toBe('One message');
    expect(i18n.t('inbox', { count: 3 })).toBe('3 messages');
  });

  test('t() supports ordinal forms with count + ordinal option', () => {
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

    expect(i18n.t('position', { count: 1, ordinal: true })).toBe('1st place');
    expect(i18n.t('position', { count: 2, ordinal: true })).toBe('2nd place');
    expect(i18n.t('position', { count: 3, ordinal: true })).toBe('3rd place');
    expect(i18n.t('position', { count: 4, ordinal: true })).toBe('4th place');
  });

  test('t() preserves Intl decimal plural behavior', () => {
    const i18n = createI18n({
      catalogs: {
        en: {
          inbox: {
            one: 'One message',
            other: '{count} messages',
          },
        },
      },
      locale: 'en',
    });

    expect(i18n.t('inbox', { count: 1.2 })).toBe('1.2 messages');
  });

  test('locale canonicalization normalizes casing', () => {
    const i18n = createI18n({ locale: 'EN' });

    expect(i18n.locale).toBe('en');
  });

  test('locale canonicalization deduplicates equivalent catalog keys', () => {
    const i18n = createI18n({
      catalogs: { 'en-US': { hello: 'Hello' } },
      locale: 'en-us',
    });

    expect(i18n.t('hello')).toBe('Hello');
  });

  test('has() supports both leaf and branch keys', () => {
    const i18n = createI18n({
      catalogs: {
        en: {
          inbox: { one: 'One', other: '{count}' },
          nav: { home: 'Home' },
        },
      },
      locale: 'en',
    });

    expect(i18n.has('nav.home')).toBe(true);
    expect(i18n.has('inbox')).toBe(true);
    expect(i18n.has('nav.missing')).toBe(false);
  });
});
