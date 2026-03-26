import { createI18n } from '../';

describe('core — BoundView (scope & withLocale)', () => {
  // ----------------------------------------------------------------
  // scope()
  // ----------------------------------------------------------------
  describe('scope()', () => {
    test('t() prefixes all keys with the namespace; missing keys include the full prefix', () => {
      const i18n = createI18n({
        messages: {
          en: {
            app: {
              nav: { about: 'About', home: 'Home' },
              welcome: 'Welcome, {name}!',
            },
          },
        },
      });

      const app = i18n.scope('app');

      expect(app.t('welcome', { name: 'Alice' })).toBe('Welcome, Alice!');
      expect(app.t('nav.home')).toBe('Home');
      expect(app.t('nav.about')).toBe('About');
      expect(app.t('missing')).toBe('app.missing'); // full prefixed key as fallback
    });

    test('has() checks key existence within the scope', () => {
      const i18n = createI18n({ messages: { en: { user: { greeting: 'Hello' } } } });
      const ns = i18n.scope('user');

      expect(ns.has('greeting')).toBe(true);
      expect(ns.has('missing')).toBe(false);
    });

    test('reacts to locale changes on the parent instance', async () => {
      const i18n = createI18n({
        locale: 'en',
        messages: {
          en: { nav: { home: 'Home' } },
          fr: { nav: { home: 'Accueil' } },
        },
      });

      const nav = i18n.scope('nav');

      expect(nav.t('home')).toBe('Home');
      await i18n.switchLocale('fr');
      expect(nav.t('home')).toBe('Accueil');
    });

    test('scope().scope() chains nested namespace prefixes', () => {
      const i18n = createI18n({
        messages: { en: { app: { ui: { btn: { cancel: 'Cancel', save: 'Save' } } } } },
      });

      const btn = i18n.scope('app').scope('ui').scope('btn');

      expect(btn.t('save')).toBe('Save');
      expect(btn.t('cancel')).toBe('Cancel');
    });

    test('exposes all BoundI18n formatting methods scoped to the current locale', () => {
      const i18n = createI18n({ locale: 'en' });
      const app = i18n.scope('app');

      expect(app.number(1234.56)).toContain('1,234');
      expect(app.date(new Date('2024-01-15'))).toContain('2024');
      expect(app.list(['A', 'B', 'C'])).toBe('A, B, and C');
      expect(app.relative(-1, 'day')).toContain('day');
      expect(app.currency(9.99, 'USD')).toContain('$');
    });
  });

  // ----------------------------------------------------------------
  // withLocale()
  // ----------------------------------------------------------------
  describe('withLocale()', () => {
    test('translates in the given locale without mutating the active locale', () => {
      const i18n = createI18n({
        locale: 'en',
        messages: {
          en: { msg: 'Hello' },
          fr: { msg: 'Bonjour' },
        },
      });

      expect(i18n.withLocale('fr').t('msg')).toBe('Bonjour');
      expect(i18n.locale).toBe('en');
    });

    test('has() checks key presence in the bound locale only', () => {
      const i18n = createI18n({
        messages: {
          en: { hello: 'Hello' },
          fr: { bonjour: 'Bonjour' },
        },
      });

      expect(i18n.withLocale('fr').has('bonjour')).toBe(true);
      expect(i18n.withLocale('fr').has('hello')).toBe(false);
    });

    test('resolves through the fallback chain for the bound locale', () => {
      const i18n = createI18n({
        fallback: 'en',
        messages: {
          en: { fallback: 'From English' },
          fr: { greeting: 'Bonjour' },
        },
      });

      expect(i18n.withLocale('fr').t('fallback')).toBe('From English');
      expect(i18n.withLocale('fr').t('greeting')).toBe('Bonjour');
    });

    test('all formatting methods use the bound locale', () => {
      const i18n = createI18n({ locale: 'en' });
      const fr = i18n.withLocale('fr');

      expect(fr.number(1234.56)).toContain('1');
      expect(fr.date(new Date('2024-01-15'))).toContain('2024');
      expect(fr.list(['Alice', 'Bob', 'Charlie'])).toBe('Alice, Bob et Charlie');
      expect(fr.relative(-1, 'day')).toContain('jour');
      expect(fr.currency(99.99, 'EUR')).toContain('99');
    });

    test('withLocale().scope() combines locale override with key namespace', () => {
      const i18n = createI18n({
        messages: {
          en: { app: { welcome: 'Welcome, {name}!' } },
          fr: { app: { welcome: 'Bienvenue, {name}!' } },
        },
      });

      expect(i18n.withLocale('fr').scope('app').t('welcome', { name: 'François' })).toBe('Bienvenue, François!');
    });

    test('scope().withLocale() also combines namespace with locale override', () => {
      const i18n = createI18n({
        messages: {
          en: { app: { welcome: 'Welcome, {name}!' } },
          fr: { app: { welcome: 'Bienvenue, {name}!' } },
        },
      });

      expect(i18n.scope('app').withLocale('fr').t('welcome', { name: 'François' })).toBe('Bienvenue, François!');
    });

    test('BoundI18n.withLocale().locale returns the bound locale', () => {
      const i18n = createI18n({ locale: 'en' });

      expect(i18n.withLocale('fr').locale).toBe('fr');
      expect(i18n.scope('nav').withLocale('de').locale).toBe('de');
    });
  });

  // ----------------------------------------------------------------
  // hasOwn()
  // ----------------------------------------------------------------
  describe('hasOwn()', () => {
    test('returns true only when the key exists in the exact locale, not via fallback', () => {
      const i18n = createI18n({
        fallback: 'en',
        locale: 'fr',
        messages: {
          en: { hello: 'Hello' },
          fr: {},
        },
      });

      expect(i18n.has('hello')).toBe(true); // found via fallback
      expect(i18n.hasOwn('hello')).toBe(false); // not in 'fr' itself
      expect(i18n.withLocale('en').hasOwn('hello')).toBe(true); // explicitly checking 'en'
    });

    test('BoundI18n.hasOwn() checks the namespace-prefixed key without fallback', () => {
      const i18n = createI18n({
        locale: 'en',
        messages: { en: { nav: { home: 'Home' } } },
      });
      const nav = i18n.scope('nav');

      expect(nav.hasOwn('home')).toBe(true);
      expect(nav.hasOwn('missing')).toBe(false);
    });
  });
});
