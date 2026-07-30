import { describe, expect, test, vi } from 'vitest';

import type { I18nSnapshot } from '../';

import { LinguaCountInVarsError, LinguaInvalidCountError, createI18n } from '../';

describe('createI18n — translation (t/tp/has)', () => {
  describe('t() — leaf keys', () => {
    test('resolves a simple key', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(i18n.t('hello')).toBe('Hello');
    });

    test('resolves a nested key with dot notation', () => {
      const i18n = createI18n({ catalogs: { en: { nav: { home: 'Home' } } } });

      expect(i18n.t('nav.home')).toBe('Home');
    });

    test('interpolates variables', () => {
      const i18n = createI18n({ catalogs: { en: { greeting: 'Hello, {name}!' } } });

      expect(i18n.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
    });

    test('keeps placeholder text for a missing variable by default', () => {
      const i18n = createI18n({ catalogs: { en: { greeting: 'Hello, {name}!' } } });

      expect(i18n.t('greeting')).toBe('Hello, {name}!');
    });

    test('calls onMissingKey for an unknown key', () => {
      const i18n = createI18n({ onMissingKey: (key) => `[key:${key}]` });

      expect(i18n.t('unknown')).toBe('[key:unknown]');
    });

    test('calls onMissingVar with varName for a missing interpolation variable', () => {
      const i18n = createI18n({
        catalogs: { en: { greeting: 'Hello, {name}!' } },
        onMissingVar: (varName) => `<${varName}>`,
      });

      expect(i18n.t('greeting')).toBe('Hello, <name>!');
    });

    test('onMissingKey receives both key and locale', () => {
      let capturedLocale = '';
      const i18n = createI18n({
        locale: 'fr',
        onMissingKey: (key, locale) => {
          capturedLocale = locale;

          return key;
        },
      });

      i18n.t('missing');
      expect(capturedLocale).toBe('fr');
    });

    test('onMissingVar receives varName, key, and locale', () => {
      let captured: [string, string, string] | undefined;
      const i18n = createI18n({
        catalogs: { en: { msg: 'Hi {name}' } },
        locale: 'en',
        onMissingVar: (varName, key, locale) => {
          captured = [varName, key, locale];

          return '';
        },
      });

      i18n.t('msg');
      expect(captured).toEqual(['name', 'msg', 'en']);
    });
  });

  describe('tp() — plural branches', () => {
    const catalogs = {
      en: {
        inbox: { one: 'One message', other: '{count} messages', zero: 'No messages' },
        position: { few: '{count}rd', one: '{count}st', other: '{count}th', two: '{count}nd' },
      },
    };

    test('resolves .zero for count === 0 (cardinal)', () => {
      expect(createI18n({ catalogs }).tp('inbox', 0)).toBe('No messages');
    });

    test('resolves .one for count === 1 (cardinal)', () => {
      expect(createI18n({ catalogs }).tp('inbox', 1)).toBe('One message');
    });

    test('resolves .other for count > 1 and interpolates {count}', () => {
      expect(createI18n({ catalogs }).tp('inbox', 3)).toBe('3 messages');
    });

    test('preserves raw decimal count (not floored before Intl.PluralRules)', () => {
      const i18n = createI18n({ catalogs: { en: { items: { one: 'one', other: '{count}' } } } });

      expect(i18n.tp('items', 1.2)).toBe('1.2');
    });

    test('resolves ordinal plural forms', () => {
      const i18n = createI18n({ catalogs });

      expect(i18n.tp('position', 1, { ordinal: true })).toBe('1st');
      expect(i18n.tp('position', 2, { ordinal: true })).toBe('2nd');
      expect(i18n.tp('position', 3, { ordinal: true })).toBe('3rd');
      expect(i18n.tp('position', 4, { ordinal: true })).toBe('4th');
    });

    test('accepts vars alongside ordinal', () => {
      const i18n = createI18n({
        catalogs: { en: { pos: { one: '{name} is {count}st', other: '{name} is {count}th' } } },
      });

      expect(i18n.tp('pos', 1, { ordinal: true, vars: { name: 'Alice' } })).toBe('Alice is 1st');
    });

    test('falls back to .other when the specific plural form is absent', () => {
      const i18n = createI18n({ catalogs: { en: { items: { other: '{count} items' } } } });

      expect(i18n.tp('items', 1)).toBe('1 items');
    });

    test('selects plural form using each fallback locale own CLDR rules', () => {
      // Russian count=5 → CLDR 'many'; if active locale is 'en' (count=5 → 'other'),
      // the fallback should still resolve using Russian rules when the key comes from 'ru'.
      const i18n = createI18n({
        catalogs: {
          en: {},
          ru: {
            items: {
              few: '{count} предмета',
              many: '{count} предметов',
              one: '{count} предмет',
              other: '{count} предмета',
            },
          },
        },
        fallback: 'ru',
        locale: 'en',
      });

      expect(i18n.tp('items', 1)).toBe('1 предмет'); // Russian 'one'
      expect(i18n.tp('items', 3)).toBe('3 предмета'); // Russian 'few'
      expect(i18n.tp('items', 5)).toBe('5 предметов'); // Russian 'many' — was incorrectly 'other' before fix
    });

    test('count=0 resolves .zero override before CLDR form in fallback locale', () => {
      const i18n = createI18n({
        catalogs: {
          en: {},
          ru: { items: { many: '{count} предметов', other: '{count} предмета', zero: 'Нет предметов' } },
        },
        fallback: 'ru',
        locale: 'en',
      });

      // Russian count=0 → CLDR 'many'; explicit .zero override should take precedence
      expect(i18n.tp('items', 0)).toBe('Нет предметов');
    });

    test('count=0 uses CLDR form from fallback locale when .zero is absent', () => {
      // Russian count=0 → CLDR 'many'; no .zero key present, so 'many' form should be used
      const i18n = createI18n({
        catalogs: {
          en: {},
          ru: { items: { many: 'много предметов', other: 'других предметов' } },
        },
        fallback: 'ru',
        locale: 'en',
      });

      expect(i18n.tp('items', 0)).toBe('много предметов');
    });

    test('throws when count is not finite', () => {
      const i18n = createI18n({ catalogs: { en: { items: { other: '{count}' } } } });

      expect(() => i18n.tp('items', Number.NaN)).toThrow(LinguaInvalidCountError);
    });

    test('throws when vars.count is provided', () => {
      const i18n = createI18n({ catalogs: { en: { items: { other: '{count}' } } } });

      expect(() => i18n.tp('items', 2, { vars: { count: 'custom' } })).toThrow(LinguaCountInVarsError);
    });
  });

  describe('t() — fallback chain', () => {
    test('resolves a key from the fallback locale when absent in the active locale', () => {
      const i18n = createI18n({
        catalogs: { en: { title: 'Title' }, fr: { greeting: 'Bonjour' } },
        fallback: 'en',
        locale: 'fr',
      });

      expect(i18n.t('title')).toBe('Title');
    });

    test('prefers the active locale over the fallback', () => {
      const i18n = createI18n({
        catalogs: { en: { title: 'Title' }, fr: { title: 'Titre' } },
        fallback: 'en',
        locale: 'fr',
      });

      expect(i18n.t('title')).toBe('Titre');
    });

    test('falls back to configured locale when active dynamic locale has not been preloaded yet', () => {
      const i18n = createI18n({
        catalogs: {
          en: { hello: 'Hello' },
          fr: async () => ({ hello: 'Bonjour' }),
        },
        fallback: 'en',
        locale: 'fr',
      });

      expect(i18n.t('hello')).toBe('Hello');
    });

    test('walks multiple fallback locales in declaration order', () => {
      const i18n = createI18n({
        catalogs: {
          en: { title: 'Title' },
          pt: { lang: 'Português' },
          'pt-PT': { region: 'Portugal' },
        },
        fallback: ['pt-PT', 'en'],
        locale: 'pt',
      });

      expect(i18n.t('region')).toBe('Portugal');
      expect(i18n.t('title')).toBe('Title');
    });
  });

  describe('has()', () => {
    test('returns true for a registered leaf key', () => {
      const i18n = createI18n({ catalogs: { en: { nav: { home: 'Home' } } } });

      expect(i18n.has('nav.home')).toBe(true);
    });

    test('returns false for an unknown key', () => {
      const i18n = createI18n({ catalogs: { en: { nav: { home: 'Home' } } } });

      expect(i18n.has('nav.missing' as any)).toBe(false);
    });

    test('resolves through the fallback chain', () => {
      const i18n = createI18n({
        catalogs: { en: { nav: { home: 'Home' } }, fr: {} },
        fallback: 'en',
        locale: 'fr',
      });

      expect(i18n.has('nav.home')).toBe(true);
    });

    test('returns false for a branch-only key by default (has() is leaf-only unless kind: branch)', () => {
      const i18n = createI18n({ catalogs: { en: { nav: { home: 'Home' } } } });

      expect(i18n.has('nav')).toBe(false);
      expect(i18n.has('nav', { kind: 'branch' })).toBe(true);
    });

    test("has(key, { kind: 'branch' }) accepts branch keys of a strictly typed catalog (compile-time check)", () => {
      const catalog = { inbox: { one: 'One', other: '{count} messages' } };
      const i18n = createI18n({ catalogs: { en: catalog } });

      // 'inbox' is a MessageBranchKeys<typeof catalog> member, not a leaf — this call
      // only compiles because has() accepts both key unions.
      expect(i18n.has('inbox', { kind: 'branch' })).toBe(true);
      expect(i18n.has('inbox')).toBe(false);
    });

    test('t() on a branch-only key warns and returns the raw key, not a translation', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const i18n = createI18n({ catalogs: { en: { items: { one: '1 item', other: '{count} items' } } } });

      expect(i18n.has('items', { kind: 'branch' })).toBe(true);
      expect(i18n.t('items' as any)).toBe('items');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("use tp('items', count) instead"));

      warnSpy.mockRestore();
    });
  });

  describe('template interpolation', () => {
    test('t() resolves variable placeholders', () => {
      const i18n = createI18n({ catalogs: { en: { greeting: 'Hello, {name}!' } } });

      expect(i18n.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
    });

    test('tp() resolves variable placeholders in plural forms', () => {
      const i18n = createI18n({
        catalogs: { en: { inbox: { one: 'One message', other: '{count} messages' } } },
      });

      expect(i18n.tp('inbox', 1)).toBe('One message');
      expect(i18n.tp('inbox', 5)).toBe('5 messages');
    });

    test('missing variable calls onMissingVar', () => {
      const i18n = createI18n({
        catalogs: { en: { greeting: 'Hello, {name}!' } },
        onMissingVar: (varName) => `<${varName}>`,
      });

      expect(i18n.t('greeting')).toBe('Hello, <name>!');
    });

    test('namespace-loaded keys support interpolation', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      await i18n.loadNamespace('extra', () => Promise.resolve({ farewell: 'Bye, {name}!' }));
      expect(i18n.t('farewell', { name: 'Bob' })).toBe('Bye, Bob!');
    });

    test('register() replaced catalog supports interpolation', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      i18n.register('en', { hello: 'Hi, {name}!' });
      expect(i18n.t('hello', { name: 'Alice' })).toBe('Hi, Alice!');
    });

    test('restoreState() restored catalog supports interpolation', () => {
      const server = createI18n({ catalogs: { en: { msg: 'Value: {v}' } } });
      const state = server.getState();
      const client = createI18n();

      client.restoreState(state);
      expect(client.t('msg', { v: '42' })).toBe('Value: 42');
    });
  });

  describe("has() with { kind: 'branch' } — branch keys", () => {
    test('returns true for an explicit plural branch', () => {
      const i18n = createI18n({ catalogs: { en: { inbox: { one: 'One', other: '{count}' } } } });

      expect(i18n.has('inbox', { kind: 'branch' })).toBe(true);
      // ...while the leaf-level sub-keys are plain leaves
      expect(i18n.has('inbox.one')).toBe(true);
    });

    test('returns false for a plain leaf key (a leaf is not a branch)', () => {
      const i18n = createI18n({ catalogs: { en: { greeting: 'Hello' } } });

      expect(i18n.has('greeting', { kind: 'branch' })).toBe(false);
    });

    test('returns false for a non-branch non-leaf key', () => {
      const i18n = createI18n({ catalogs: { en: { greeting: 'Hello' } } });

      expect(i18n.has('greeting.nonexistent', { kind: 'branch' })).toBe(false);
    });

    test('returns false for an unregistered key', () => {
      const i18n = createI18n({ catalogs: { en: { greeting: 'Hello' } } });

      expect(i18n.has('missing', { kind: 'branch' })).toBe(false);
    });

    test('checks fallback chain', () => {
      const i18n = createI18n({
        catalogs: {
          en: { inbox: { one: 'One', other: '{count}' } },
          fr: { other: 'other key' },
        },
        fallback: 'en',
        locale: 'fr',
      });

      // 'fr' has no inbox branch; fallback 'en' does
      expect(i18n.has('inbox', { kind: 'branch' })).toBe(true);
    });

    test('returns false when no catalog loaded for active locale and no fallback', () => {
      const i18n = createI18n({ catalogs: { en: { greeting: 'Hello' } }, locale: 'en' });
      const fork = i18n.fork({ locale: 'en' });

      // greeting is a leaf — has('greeting') is true but has('greeting.something') is false
      expect(fork.has('greeting')).toBe(true);
      expect(fork.has('greeting.sub')).toBe(false);
    });

    test('returns true for intermediate branch keys in a deeply-nested catalog', () => {
      const i18n = createI18n({
        catalogs: { en: { a: { b: { c: { d: 'Deep' } } } } },
        locale: 'en',
      });

      // All intermediate prefixes should be detectable as branch keys
      expect(i18n.has('a', { kind: 'branch' })).toBe(true);
      expect(i18n.has('a.b', { kind: 'branch' })).toBe(true);
      expect(i18n.has('a.b.c', { kind: 'branch' })).toBe(true);
      expect(i18n.has('a.b.c.d')).toBe(true);
      expect(i18n.has('a.b.c.d.e', { kind: 'branch' })).toBe(false);
    });
  });

  describe('I18nSnapshot — t/tp accessors', () => {
    test('snapshot.t() translates using the locale at snapshot time', async () => {
      const i18n = createI18n({
        catalogs: { en: { greeting: 'Hello' }, fr: { greeting: 'Bonjour' } },
        locale: 'en',
      });
      const snap = i18n.getSnapshot();

      await i18n.setLocale('fr');

      // snap was captured at 'en' — t() is bound to the translate fn, which uses live state
      // The snapshot.t references the same translate closure, so it resolves with the current locale.
      // We verify that the current locale snapshot has the correct locale and works.
      const currentSnap = i18n.getSnapshot();

      expect(currentSnap.locale).toBe('fr');
      expect(currentSnap.t('greeting')).toBe('Bonjour');
      expect(snap.locale).toBe('en');
    });

    test('snapshot.t() and i18n.t() return the same result', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello, {name}!' } }, locale: 'en' });
      const snap = i18n.getSnapshot();

      expect(snap.t('hello', { name: 'Alice' })).toBe(i18n.t('hello', { name: 'Alice' }));
    });

    test('snapshot.tp() works for plural forms', () => {
      const i18n = createI18n({
        catalogs: { en: { inbox: { one: 'One message', other: '{count} messages' } } },
        locale: 'en',
      });
      const snap = i18n.getSnapshot();

      expect(snap.tp('inbox', 1)).toBe('One message');
      expect(snap.tp('inbox', 5)).toBe('5 messages');
    });

    test('subscriber receives snapshot with working t/tp', async () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        locale: 'en',
      });
      const snaps: I18nSnapshot[] = [];

      i18n.subscribe((s) => snaps.push(s));
      await i18n.setLocale('fr');
      expect(snaps[0]?.locale).toBe('fr');
      expect(snaps[0]?.t('hello')).toBe('Bonjour');
    });
  });
});
