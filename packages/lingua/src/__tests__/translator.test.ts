import { describe, expect, expectTypeOf, test } from 'vitest';

import {
  type Catalog,
  LinguaInvalidCatalogError,
  LinguaInvalidPluralCountError,
  createCatalogTranslator,
  createTranslator,
} from '../';

const catalogs = {
  en: {
    error: 'Try {retry}.',
    inbox: {
      plural: {
        few: '{count} few',
        many: '{count} many',
        one: 'One message',
        other: '{count} messages',
        zero: 'No messages',
      },
    },
    nav: { home: 'Home' },
  },
  ru: {
    error: 'Повторить {retry}.',
    inbox: {
      plural: { few: '{count} few', many: '{count} many', one: '{count} one', other: '{count} other', zero: 'zero' },
    },
    nav: { home: 'Главная' },
  },
};

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
      createTranslator<Catalog>({ en: {}, ru: catalogs.ru }, { fallback: 'ru', locale: 'en' }).translateDynamic(
        'inbox',
        { count: 5 },
      ),
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

describe('createCatalogTranslator', () => {
  const catalog = {
    dashboard: { greeting: 'Hello, {name}.', title: 'Dashboard' },
    inbox: { plural: { one: 'One message', other: '{count} messages' } },
    placement: { plural: { few: '{count}rd', one: '{count}st', other: '{count}th', two: '{count}nd' } },
  } as const;

  test('translates flat and nested keys with string and numeric interpolation', () => {
    const translator = createCatalogTranslator(catalog);

    expect(translator.locale).toBe('en');
    expect(translator.translate('dashboard.title')).toBe('Dashboard');
    expect(translator.translate('dashboard.greeting', { values: { name: 'Ada' } })).toBe('Hello, Ada.');
    expect(translator.translate('dashboard.greeting', { values: { name: 42 } })).toBe('Hello, 42.');
  });

  test('canonicalizes configured locale and uses it for cardinal and ordinal forms', () => {
    const translator = createCatalogTranslator(catalog, { locale: 'EN-us' });

    expect(translator.locale).toBe('en-US');
    expect(translator.translate('inbox', { count: 2 })).toBe('2 messages');
    expect(translator.translate('placement', { count: 2, ordinal: true })).toBe('2nd');
    expect(translator.translate('placement', { count: 3, ordinal: true })).toBe('3rd');
  });

  test('uses default missing-key and missing-value output', () => {
    const translator = createCatalogTranslator(catalog);

    expect(translator.translateDynamic('unknown')).toBe('unknown');
    expect(translator.translate('dashboard.greeting')).toBe('Hello, {name}.');
    expect(translator.segments('dashboard.greeting', { values: {} })).toEqual(['Hello, ', '{name}', '.']);
  });

  test('rejects invalid plural counts', () => {
    const translator = createCatalogTranslator(catalog);

    expect(() => translator.translate('inbox', { count: Number.NaN })).toThrow(LinguaInvalidPluralCountError);
    expect(() => translator.translate('inbox', { count: Number.POSITIVE_INFINITY })).toThrow(
      LinguaInvalidPluralCountError,
    );
  });

  test('rejects arrays, primitive nodes, reserved keys, and plural metadata', () => {
    expect(() => createCatalogTranslator({ list: ['one'] } as never)).toThrow(LinguaInvalidCatalogError);
    expect(() => createCatalogTranslator({ enabled: true } as never)).toThrow(LinguaInvalidCatalogError);
    expect(() => createCatalogTranslator({ count: 1 } as never)).toThrow(LinguaInvalidCatalogError);
    expect(() => createCatalogTranslator({ item: { label: 'Item', plural: { other: 'Items' } } } as never)).toThrow(
      LinguaInvalidCatalogError,
    );

    const nonEnumerable = { plural: { other: 'Items' } };

    Object.defineProperty(nonEnumerable, 'metadata', { value: 'ignored' });

    expect(() => createCatalogTranslator({ item: nonEnumerable } as never)).toThrow(LinguaInvalidCatalogError);

    const symbolMetadata = { plural: { other: 'Items' } };

    Object.defineProperty(symbolMetadata, Symbol('metadata'), { value: 'ignored' });

    expect(() => createCatalogTranslator({ item: symbolMetadata } as never)).toThrow(LinguaInvalidCatalogError);

    for (const key of ['__proto__', 'constructor', 'prototype']) {
      expect(() => createCatalogTranslator(JSON.parse(`{"${key}":"unsafe"}`) as never)).toThrow(
        LinguaInvalidCatalogError,
      );
    }
  });

  test('does not mutate source catalogs or interpolation values', () => {
    const source = { greeting: 'Hello, {name}.' };
    const values = { name: 'Ada' };
    const translator = createCatalogTranslator(source);

    expect(translator.translate('greeting', { values })).toBe('Hello, Ada.');
    source.greeting = 'Changed';

    expect(values).toEqual({ name: 'Ada' });
    expect(translator.translate('greeting', { values })).toBe('Hello, Ada.');
  });

  test('preserves opaque segment values by identity', () => {
    const translator = createCatalogTranslator({ error: 'Try {retry}.' });
    const retry = { href: '/retry' };

    expect(translator.segments('error', { values: { retry } })).toEqual(['Try ', retry, '.']);
    expect(translator.segments('error', { values: { retry } })[1]).toBe(retry);
  });

  test('preserves typed text and plural contracts', () => {
    const translator = createCatalogTranslator(catalog);

    expectTypeOf(translator.translate('dashboard.title')).toEqualTypeOf<string>();
    expectTypeOf(translator.translate('inbox', { count: 1 })).toEqualTypeOf<string>();

    const assertInvalidCalls = (): void => {
      // @ts-expect-error Grouping keys cannot be translated.
      translator.translate('dashboard');
      // @ts-expect-error Plural keys require count.
      translator.translate('inbox');
      // @ts-expect-error Text keys cannot receive plural-only options.
      translator.translate('dashboard.title', { count: 1 });
      // @ts-expect-error Single-catalog translators do not accept fallback locales.
      createCatalogTranslator(catalog, { fallback: 'fr' });
    };

    expectTypeOf(assertInvalidCalls).toBeFunction();
  });
});
