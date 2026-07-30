import { describe, expect, test } from 'vitest';

import { createI18n } from '../';

describe('createI18n — scope()', () => {
  describe('scope()', () => {
    const catalogs = {
      en: {
        messages: {
          inbox: { one: 'One message', other: '{count} messages', zero: 'No messages' },
        },
        nav: { about: 'About', home: 'Home' },
      },
      fr: {
        messages: {
          inbox: { one: 'Un message', other: '{count} messages', zero: 'Aucun message' },
        },
        nav: { about: 'À propos', home: 'Accueil' },
      },
    };

    test('has() checks existence within the scope', () => {
      const i18n = createI18n({ catalogs });
      const nav = i18n.scope('nav');

      expect(nav.has('home')).toBe(true);
      expect(nav.has('missing')).toBe(false);
    });

    test('has() resolves through the fallback chain', () => {
      const i18n = createI18n({
        catalogs: { en: { nav: { home: 'Home' } }, fr: { nav: {} } },
        fallback: 'en',
        locale: 'fr',
      });
      const nav = i18n.scope('nav');

      expect(nav.has('home')).toBe(true);
    });

    test('t() prefixes the key with the given scope', () => {
      const i18n = createI18n({ catalogs });
      const nav = i18n.scope('nav');

      expect(nav.t('home')).toBe('Home');
      expect(nav.t('about')).toBe('About');
    });

    test('tp() prefixes the key with the given scope', () => {
      const i18n = createI18n({ catalogs });
      const msgs = i18n.scope('messages');

      expect(msgs.tp('inbox', 0)).toBe('No messages');
      expect(msgs.tp('inbox', 1)).toBe('One message');
      expect(msgs.tp('inbox', 3)).toBe('3 messages');
    });

    test('t() passes vars through correctly', () => {
      const i18n = createI18n({ catalogs: { en: { user: { greeting: 'Hello, {name}!' } } } });
      const user = i18n.scope('user');

      expect(user.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
    });

    test('t() returns onMissingKey value for unknown scoped key', () => {
      const i18n = createI18n({ catalogs, onMissingKey: (key) => `[${key}]` });
      const nav = i18n.scope('nav');

      expect(nav.t('missing')).toBe('[nav.missing]');
    });

    test('follows active locale changes', async () => {
      const i18n = createI18n({ catalogs, locale: 'en' });
      const nav = i18n.scope('nav');

      expect(nav.t('home')).toBe('Home');
      await i18n.setLocale('fr');
      expect(nav.t('home')).toBe('Accueil');
    });

    test('multiple independent scopes on the same instance', () => {
      const i18n = createI18n({ catalogs });
      const nav = i18n.scope('nav');
      const msgs = i18n.scope('messages');

      expect(nav.t('home')).toBe('Home');
      expect(msgs.tp('inbox', 1)).toBe('One message');
    });

    test('fmt is the same formatter instance as the parent i18n.fmt', () => {
      const i18n = createI18n({ catalogs });
      const nav = i18n.scope('nav');

      expect(nav.fmt).toBe(i18n.fmt);
    });

    test('tp() passes TpOptions through correctly', () => {
      const i18n = createI18n({
        catalogs: {
          en: {
            leaderboard: {
              place: { few: '{count}rd', one: '{count}st', other: '{count}th', two: '{count}nd' },
            },
          },
        },
      });
      const board = i18n.scope('leaderboard');

      expect(board.tp('place', 1, { ordinal: true })).toBe('1st');
      expect(board.tp('place', 2, { ordinal: true })).toBe('2nd');
      expect(board.tp('place', 4, { ordinal: true })).toBe('4th');
    });

    test("has(key, { kind: 'branch' }) returns true for a direct nested branch key (non-CLDR)", () => {
      const i18n = createI18n({
        catalogs: { en: { ui: { nav: { about: 'About', home: 'Home' } } } },
      });
      const ui = i18n.scope('ui');

      expect(ui.has('nav', { kind: 'branch' })).toBe(true);
      expect(ui.has('nav.home')).toBe(true);
      expect(ui.has('nav.missing')).toBe(false);
      expect(ui.has('nav')).toBe(false);
    });

    test("has(key, { kind: 'branch' }) returns true for a plural branch within scope (CLDR forms)", () => {
      const i18n = createI18n({ catalogs });
      const msgs = i18n.scope('messages');

      expect(msgs.has('inbox', { kind: 'branch' })).toBe(true);
      expect(msgs.has('inbox.one')).toBe(true);
      expect(msgs.has('inbox')).toBe(false);
    });
  });

  describe('scope()', () => {
    test('scope().t() resolves the scoped key', () => {
      const i18n = createI18n({ catalogs: { en: { nav: { about: 'About', home: 'Home' } } } });
      const nav = i18n.scope('nav');

      expect(nav.t('home')).toBe('Home');
    });

    test('scope().t() supports variable interpolation', () => {
      const i18n = createI18n({ catalogs: { en: { user: { greeting: 'Hello, {name}!' } } } });
      const user = i18n.scope('user');

      expect(user.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
    });

    test('scope().t() follows locale changes', async () => {
      const i18n = createI18n({
        catalogs: {
          de: { nav: { home: 'Startseite' } },
          en: { nav: { home: 'Home' } },
        },
      });
      const nav = i18n.scope('nav');

      expect(nav.t('home')).toBe('Home');
      await i18n.setLocale('de');
      expect(nav.t('home')).toBe('Startseite');
    });

    test('scope().t() calls onMissingKey for unknown key', () => {
      const i18n = createI18n({ onMissingKey: (k) => `[missing:${k}]` });
      const nav = i18n.scope('nav');

      expect(nav.t('home')).toBe('[missing:nav.home]');
    });

    test('scope().tp() resolves plural forms', () => {
      const i18n = createI18n({
        catalogs: { en: { ui: { inbox: { one: 'One message', other: '{count} messages', zero: 'No messages' } } } },
      });
      const ui = i18n.scope('ui');

      expect(ui.tp('inbox', 0)).toBe('No messages');
      expect(ui.tp('inbox', 1)).toBe('One message');
      expect(ui.tp('inbox', 5)).toBe('5 messages');
    });

    test('scope().tp() follows locale changes', async () => {
      const i18n = createI18n({
        catalogs: {
          de: { ui: { count: { one: 'Ein Element', other: '{count} Elemente' } } },
          en: { ui: { count: { one: 'One item', other: '{count} items' } } },
        },
      });
      const ui = i18n.scope('ui');

      expect(ui.tp('count', 1)).toBe('One item');
      await i18n.setLocale('de');
      expect(ui.tp('count', 1)).toBe('Ein Element');
      expect(ui.tp('count', 3)).toBe('3 Elemente');
    });

    test('scope().has() returns true for existing key', () => {
      const i18n = createI18n({ catalogs: { en: { nav: { home: 'Home' } } } });
      const nav = i18n.scope('nav');

      expect(nav.has('home')).toBe(true);
      expect(nav.has('missing')).toBe(false);
    });
  });

  describe('scope() — memoization', () => {
    test('returns same object reference for same prefix', () => {
      const i18n = createI18n({ catalogs: { en: { nav: { home: 'Home' } } } });

      expect(i18n.scope('nav')).toBe(i18n.scope('nav'));
    });

    test('returns different object references for different prefixes', () => {
      const i18n = createI18n({ catalogs: { en: { footer: { info: 'Info' }, nav: { home: 'Home' } } } });

      expect(i18n.scope('nav')).not.toBe(i18n.scope('footer'));
    });

    test('is bounded — the oldest prefix evicts once the cache exceeds its cap, instead of growing unboundedly', () => {
      const i18n = createI18n({ catalogs: { en: {} } });
      const first = i18n.scope('prefix-0');

      // One more than the cache's cap — walks the oldest entry (`prefix-0`) out.
      for (let n = 1; n <= 128; n++) i18n.scope(`prefix-${n}`);

      expect(i18n.scope('prefix-0')).not.toBe(first);

      // Still memoizes within the bound — the most recently created prefix is unaffected.
      const recent = i18n.scope('prefix-128');

      expect(i18n.scope('prefix-128')).toBe(recent);
    });
  });
});
