import { describe, expect, test, vi } from 'vitest';

import {
  LinguaCountInVarsError,
  LinguaInvalidCountError,
  LinguaInvalidLocaleError,
  createI18n,
  createTranslator,
} from '../';

describe('createTranslator()', () => {
  describe('t()', () => {
    test('resolves a leaf key and interpolates vars', () => {
      const { t } = createTranslator({ greeting: 'Hello, {name}!' });

      expect(t('greeting', { name: 'Ada' })).toBe('Hello, Ada!');
    });

    test('resolves nested dot-notation keys', () => {
      const { t } = createTranslator({ nav: { home: 'Home', settings: { title: 'Settings' } } });

      expect(t('nav.home')).toBe('Home');
      expect(t('nav.settings.title')).toBe('Settings');
    });

    test('missing key returns the key string', () => {
      const { t } = createTranslator({ hello: 'Hello' });

      expect(t('missing' as never)).toBe('missing');
    });

    test('missing var keeps the {placeholder}', () => {
      const { t } = createTranslator({ greeting: 'Hello, {name}!' });

      expect(t('greeting')).toBe('Hello, {name}!');
    });
  });

  describe('tp()', () => {
    const catalog = { inbox: { one: 'One message', other: '{count} messages', zero: 'No messages' } };

    test('selects CLDR forms and auto-injects count', () => {
      const { tp } = createTranslator(catalog);

      expect(tp('inbox', 0)).toBe('No messages');
      expect(tp('inbox', 1)).toBe('One message');
      expect(tp('inbox', 5)).toBe('5 messages');
    });

    test('supports ordinal plurals and extra vars', () => {
      const { tp } = createTranslator({ place: { one: '{count}st', other: '{count}th', two: '{count}nd' } });

      expect(tp('place', 1, { ordinal: true })).toBe('1st');
      expect(tp('place', 2, { ordinal: true })).toBe('2nd');
      expect(tp('place', 5, { ordinal: true })).toBe('5th');
    });

    test('locale option changes CLDR form selection', () => {
      // Arabic distinguishes zero/two/few/many — English does not.
      const { tp } = createTranslator(
        {
          items: {
            few: '{count} قليل',
            many: '{count} كثير',
            one: 'واحد',
            other: '{count} أخرى',
            two: 'اثنان',
            zero: 'صفر',
          },
        },
        { locale: 'ar' },
      );

      expect(tp('items', 0)).toBe('صفر');
      expect(tp('items', 2)).toBe('اثنان');
      expect(tp('items', 3)).toBe('3 قليل');
    });

    test('throws LinguaInvalidCountError for non-finite count and LinguaCountInVarsError for vars.count', () => {
      const { tp } = createTranslator(catalog);

      expect(() => tp('inbox', Number.NaN)).toThrow(LinguaInvalidCountError);
      expect(() => tp('inbox', 1, { vars: { count: 9 } })).toThrow(LinguaCountInVarsError);
    });
  });

  describe('locale option', () => {
    test('invalid locale tag throws LinguaInvalidLocaleError', () => {
      expect(() => createTranslator({ hello: 'Hello' }, { locale: 'not_valid!' })).toThrow(LinguaInvalidLocaleError);
    });
  });

  describe('missing handlers', () => {
    test('onMissingKey override applies to t() and ti()', () => {
      const { t, ti } = createTranslator({ hello: 'Hello' }, { onMissingKey: (key) => `??${key}??` });

      expect(t('nope' as never)).toBe('??nope??');
      expect(ti('nope' as never, {})).toEqual(['??nope??']);
    });

    test('onMissingVar override applies to t() and ti()', () => {
      const { t, ti } = createTranslator({ greeting: 'Hello, {name}!' }, { onMissingVar: (varName) => `<${varName}>` });

      expect(t('greeting')).toBe('Hello, <name>!');
      expect(ti('greeting', {})).toEqual(['Hello, ', '<name>', '!']);
    });
  });

  describe('ti()', () => {
    test('returns string segments and typed replacement values', () => {
      const { ti } = createTranslator({ error: 'Try to {reload} or {support} for help.' });
      const reload = { href: '/reload' };
      const support = { href: '/support' };

      expect(ti('error', { reload, support })).toEqual(['Try to ', reload, ' or ', support, ' for help.']);
    });

    test('missing var keeps the {placeholder} segment', () => {
      const { ti } = createTranslator({ error: 'Try to {reload} now.' });

      expect(ti('error', {})).toEqual(['Try to ', '{reload}', ' now.']);
    });

    test('omits empty string segments', () => {
      const { ti } = createTranslator({ compact: '{a}{b}' });

      expect(ti('compact', { a: 'X', b: 'Y' })).toEqual(['X', 'Y']);
    });

    test('missing key returns [key]', () => {
      const { ti } = createTranslator({ hello: 'Hello' });

      expect(ti('missing' as never, {})).toEqual(['missing']);
    });

    test('null var is embedded as-is (unlike t(), where null counts as missing)', () => {
      const { ti } = createTranslator({ row: 'Value: {v}' });

      expect(ti('row', { v: null })).toEqual(['Value: ', null]);
    });

    test('plural-branch key via ti returns the fallback and warns in dev', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { ti } = createTranslator({ inbox: { one: 'One', other: '{count} messages' } });

      expect(ti('inbox' as never, {})).toEqual(['inbox']);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('plural branch'));

      warnSpy.mockRestore();
    });
  });

  describe('tpi()', () => {
    const catalog = {
      inbox: {
        one: 'One message from {sender}',
        other: '{count} messages from {sender}',
        zero: 'No messages from {sender}',
      },
    };

    test('segments a plural branch with count as a raw-number segment', () => {
      const { tpi } = createTranslator(catalog);
      const sender = { name: 'Ada' };

      expect(tpi('inbox', 1, { vars: { sender } })).toEqual(['One message from ', sender]);
      expect(tpi('inbox', 5, { vars: { sender } })).toEqual([5, ' messages from ', sender]);
      expect(tpi('inbox', 0, { vars: { sender } })).toEqual(['No messages from ', sender]);
    });

    test('missing branch falls back through onMissingKey', () => {
      const { tpi } = createTranslator(catalog, { onMissingKey: (key) => `??${key}??` });

      expect(tpi('missing' as never, 2)).toEqual(['??missing??']);
    });

    test('shares tp() validation: invalid count and vars.count throw', () => {
      const { tpi } = createTranslator(catalog);

      expect(() => tpi('inbox', Number.NaN)).toThrow(LinguaInvalidCountError);
      expect(() => tpi('inbox', 1, { vars: { count: 9 } })).toThrow(LinguaCountInVarsError);
    });
  });

  describe('is static — no subscriptions, loaders, or disposal', () => {
    test('catalog edits after creation are not visible (compiled at registration)', () => {
      const catalog = { greeting: 'Hello' };
      const { t } = createTranslator(catalog);

      catalog.greeting = 'Changed';

      expect(t('greeting')).toBe('Hello');
    });
  });
});

describe('ti() on I18n instances', () => {
  test('resolves and segments like t()', async () => {
    const i18n = createI18n({ catalogs: { en: { error: 'Try to {reload} now.' } } });
    const reload = { href: '/reload' };

    expect(i18n.ti('error', { reload })).toEqual(['Try to ', reload, ' now.']);
  });

  test('resolves through the fallback chain', () => {
    const i18n = createI18n({
      catalogs: { en: { error: 'Try to {reload} now.' }, fr: {} },
      fallback: 'en',
      locale: 'fr',
    });

    expect(i18n.ti('error', { reload: 'R' })).toEqual(['Try to ', 'R', ' now.']);
  });

  test('missing key falls back through onMissingKey', () => {
    const i18n = createI18n({ catalogs: { en: {} }, onMissingKey: (key) => `[${key}]` });

    expect(i18n.ti('missing' as never, {})).toEqual(['[missing]']);
  });

  test('missing var keeps the {placeholder} segment', () => {
    const i18n = createI18n({ catalogs: { en: { error: 'Try to {reload} now.' } } });

    expect(i18n.ti('error', {})).toEqual(['Try to ', '{reload}', ' now.']);
  });
});

describe('tpi() on I18n and ScopedI18n', () => {
  test('instance tpi resolves through the fallback chain with count injection', () => {
    const i18n = createI18n({
      catalogs: {
        en: { inbox: { one: 'One from {sender}', other: '{count} from {sender}' } },
        fr: {},
      },
      fallback: 'en',
      locale: 'fr',
    });
    const sender = { name: 'Ada' };

    expect(i18n.tpi('inbox', 5, { vars: { sender } })).toEqual([5, ' from ', sender]);
  });

  test('scoped tpi applies the prefix', () => {
    const i18n = createI18n({
      catalogs: { en: { mail: { inbox: { one: 'One', other: '{count}' } } } },
    });
    const mail = i18n.scope('mail');

    expect(mail.tpi('inbox', 3)).toEqual([3]);
  });

  test('snapshot exposes tpi', () => {
    const i18n = createI18n({ catalogs: { en: { inbox: { one: 'One', other: '{count} messages' } } } });

    expect(i18n.getSnapshot().tpi('inbox', 7)).toEqual([7, ' messages']);
  });
});

describe('ti() on ScopedI18n', () => {
  test('applies the scope prefix', () => {
    const i18n = createI18n({ catalogs: { en: { errors: { retry: 'Try to {reload} now.' } } } });
    const errors = i18n.scope('errors');

    expect(errors.ti('retry', { reload: 'R' })).toEqual(['Try to ', 'R', ' now.']);
  });

  test('missing scoped key falls back through onMissingKey', () => {
    const i18n = createI18n({ catalogs: { en: {} }, onMissingKey: (key) => `[${key}]` });
    const errors = i18n.scope('errors');

    expect(errors.ti('missing', {})).toEqual(['[errors.missing]']);
  });
});

describe('dev-mode catalog validation', () => {
  test('warns for a catalog missing CLDR forms for its locale', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    createTranslator({ items: { one: '1', other: '{count}' } }, { locale: 'ar' });

    await vi.waitFor(() => expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing plural form')));

    warnSpy.mockRestore();
  });
});
