import { describe, expect, test } from 'vitest';

import { LinguaInvalidCatalogError, LinguaInvalidPluralCountError, createTranslator } from '../';

const catalogs = {
  en: {
    error: 'Try {retry}.',
    inbox: { plural: { one: 'One message', other: '{count} messages', zero: 'No messages' } },
    nav: { home: 'Home' },
  },
  ru: {
    inbox: { plural: { few: '{count} few', many: '{count} many', one: '{count} one', other: '{count} other' } },
  },
} as const;

describe('createTranslator', () => {
  test('resolves explicit text nodes and nested keys', () => {
    const translator = createTranslator(catalogs, { locale: 'en' });

    expect(translator.translate('nav.home')).toBe('Home');
    expect(translator.translate('error', { values: { retry: 'again' } })).toBe('Try again.');
  });

  test('uses explicit plural nodes with zero override and CLDR categories', () => {
    const translator = createTranslator(catalogs, { locale: 'en' });

    expect(translator.translate('inbox', { count: 0 })).toBe('No messages');
    expect(translator.translate('inbox', { count: 1 })).toBe('One message');
    expect(translator.translate('inbox', { count: 3 })).toBe('3 messages');
  });

  test('selects plural category using locale that supplied fallback message', () => {
    const translator = createTranslator(catalogs, { fallback: 'ru', locale: 'en' });

    expect(translator.translate('inbox', { count: 5 })).toBe('5 messages');
    expect(
      createTranslator({ en: {}, ru: catalogs.ru }, { fallback: 'ru', locale: 'en' }).translate('inbox', { count: 5 }),
    ).toBe('5 many');
  });

  test('returns typed segments without a second interpolation API family', () => {
    const retry = { href: '/retry' };
    const translator = createTranslator(catalogs, { locale: 'en' });

    expect(translator.segments('error', { values: { retry } })).toEqual(['Try ', retry, '.']);
    expect(translator.segments('inbox', { count: 3 })).toEqual([3, ' messages']);
  });

  test('uses configured handlers for missing keys and values', () => {
    const translator = createTranslator(catalogs, {
      locale: 'en',
      onMissingKey: (key) => `[${key}]`,
      onMissingValue: (name) => `<${name}>`,
    });

    expect(translator.translateDynamic('unknown')).toBe('[unknown]');
    expect(translator.translate('error')).toBe('Try <retry>.');
  });

  test('rejects non-finite plural counts', () => {
    const translator = createTranslator(catalogs, { locale: 'en' });

    expect(() => translator.translate('inbox', { count: Number.NaN })).toThrow(LinguaInvalidPluralCountError);
  });

  test('compiles immutable catalog data at creation', () => {
    const catalog = { en: { greeting: 'Hello' } };
    const translator = createTranslator(catalog, { locale: 'en' });

    catalog.en.greeting = 'Changed';

    expect(translator.translate('greeting')).toBe('Hello');
  });

  test('looks up dynamic keys only through the explicit escape hatch', () => {
    const translator = createTranslator(catalogs, { locale: 'en' });

    expect(translator.translateDynamic('missing')).toBe('missing');
  });

  test('rejects malformed and unsafe catalog nodes at the resource boundary', () => {
    expect(() => createTranslator({ en: { item: { plural: null } } as never })).toThrow(LinguaInvalidCatalogError);
    expect(() => createTranslator({ en: JSON.parse('{"__proto__":"unsafe"}') as never })).toThrow(
      LinguaInvalidCatalogError,
    );
  });
});
