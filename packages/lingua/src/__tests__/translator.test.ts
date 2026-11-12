import { describe, expect, expectTypeOf, test } from 'vitest';

import {
  createTranslator,
  LinguaInvalidCatalogError,
  LinguaInvalidPluralCountError,
  LinguaMissingKeyError,
  LinguaMissingValueError,
} from '../';

const catalog = {
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
} as const;

describe('createTranslator', () => {
  test('resolves explicit text nodes and nested keys', () => {
    const translator = createTranslator(catalog, { locale: 'en' });

    expect(translator.translate('nav.home')).toBe('Home');
    expect(translator.translate('error', { values: { retry: 'again' } })).toBe('Try again.');
  });

  test('selects plural forms through Intl categories', () => {
    const translator = createTranslator(catalog, { locale: 'en' });

    expect(translator.translate('inbox', { count: 0 })).toBe('0 messages');
    expect(translator.translate('inbox', { count: 1 })).toBe('One message');
    expect(translator.translate('inbox', { count: 3 })).toBe('3 messages');
  });

  test('uses the zero category when the locale defines it', () => {
    const arabic = createTranslator(catalog, { locale: 'ar' });

    expect(arabic.translate('inbox', { count: 0 })).toBe('No messages');
    expect(arabic.translate('inbox', { count: 3 })).toBe('3 few');
  });

  test('falls back to the other form for categories the catalog omits', () => {
    const plain = createTranslator({ inbox: { plural: { other: '{count} items' } } } as const, { locale: 'pl' });

    expect(plain.translate('inbox', { count: 5 })).toBe('5 items');
  });

  test('canonicalizes configured locale and uses it for cardinal and ordinal forms', () => {
    const catalog = {
      inbox: { plural: { one: 'One message', other: '{count} messages' } },
      placement: { plural: { few: '{count}rd', one: '{count}st', other: '{count}th', two: '{count}nd' } },
    } as const;
    const translator = createTranslator(catalog, { locale: 'EN-us' });

    expect(translator.locale).toBe('en-US');
    expect(translator.translate('inbox', { count: 2 })).toBe('2 messages');
    expect(translator.translate('placement', { count: 2, ordinal: true })).toBe('2nd');
    expect(translator.translate('placement', { count: 3, ordinal: true })).toBe('3rd');
  });

  test('default missing strategy warns in dev and returns key / placeholder', () => {
    const translator = createTranslator(catalog, { locale: 'en' });

    expect(translator.translate('unknown' as never)).toBe('unknown');
    expect(translator.translate('error')).toBe('Try {retry}.');
  });

  test('missing: "key" returns key / placeholder silently', () => {
    const translator = createTranslator(catalog, { locale: 'en', missing: 'key' });

    expect(translator.translate('unknown' as never)).toBe('unknown');
    expect(translator.translate('error')).toBe('Try {retry}.');
  });

  test('missing: "throw" throws on missing keys and values', () => {
    const translator = createTranslator(catalog, { locale: 'en', missing: 'throw' });

    expect(() => translator.translate('unknown' as never)).toThrow(LinguaMissingKeyError);
    expect(() => translator.translate('error')).toThrow(LinguaMissingValueError);
  });

  test('missing: handler receives info and returns custom output', () => {
    const translator = createTranslator(catalog, {
      locale: 'en',
      missing: ({ key, name }) => (name ? `<${name}>` : `[${key}]`),
    });

    expect(translator.translate('unknown' as never)).toBe('[unknown]');
    expect(translator.translate('error')).toBe('Try <retry>.');
  });

  test('rejects non-finite plural counts', () => {
    const translator = createTranslator(catalog, { locale: 'en' });

    expect(() => translator.translate('inbox', { count: Number.NaN })).toThrow(LinguaInvalidPluralCountError);
  });

  test('compiles immutable catalog data at creation', () => {
    const source = { greeting: 'Hello' };
    const translator = createTranslator(source, { locale: 'en' });

    source.greeting = 'Changed';

    expect(translator.translate('greeting')).toBe('Hello');
  });

  test('rejects malformed and unsafe catalog nodes at the resource boundary', () => {
    expect(() => createTranslator({ item: { plural: null } } as never)).toThrow(LinguaInvalidCatalogError);
    expect(() => createTranslator(JSON.parse('{"__proto__":"unsafe"}') as never)).toThrow(LinguaInvalidCatalogError);
  });

  test('rejects arrays, primitive nodes, reserved keys, and plural metadata', () => {
    expect(() => createTranslator({ list: ['one'] } as never)).toThrow(LinguaInvalidCatalogError);
    expect(() => createTranslator({ enabled: true } as never)).toThrow(LinguaInvalidCatalogError);
    expect(() => createTranslator({ count: 1 } as never)).toThrow(LinguaInvalidCatalogError);
    expect(() => createTranslator({ item: { label: 'Item', plural: { other: 'Items' } } } as never)).toThrow(
      LinguaInvalidCatalogError,
    );

    const nonEnumerable = { plural: { other: 'Items' } };

    Object.defineProperty(nonEnumerable, 'metadata', { value: 'ignored' });

    expect(() => createTranslator({ item: nonEnumerable } as never)).toThrow(LinguaInvalidCatalogError);

    for (const key of ['__proto__', 'constructor', 'prototype']) {
      expect(() => createTranslator(JSON.parse(`{"${key}":"unsafe"}`) as never)).toThrow(LinguaInvalidCatalogError);
    }
  });

  test('does not mutate source catalogs or interpolation values', () => {
    const source = { greeting: 'Hello, {name}.' };
    const values = { name: 'Ada' };
    const translator = createTranslator(source, { locale: 'en' });

    expect(translator.translate('greeting', { values })).toBe('Hello, Ada.');
    source.greeting = 'Changed';

    expect(values).toEqual({ name: 'Ada' });
    expect(translator.translate('greeting', { values })).toBe('Hello, Ada.');
  });

  test('preserves typed text and plural contracts', () => {
    const translator = createTranslator(catalog);

    expectTypeOf(translator.translate('nav.home')).toEqualTypeOf<string>();
    expectTypeOf(translator.translate('inbox', { count: 1 })).toEqualTypeOf<string>();

    const assertInvalidCalls = (): void => {
      // @ts-expect-error Grouping keys cannot be translated.
      translator.translate('nav');
      // @ts-expect-error Plural keys require count.
      translator.translate('inbox');
      // @ts-expect-error Text keys cannot receive plural-only options.
      translator.translate('nav.home', { count: 1 });
      // @ts-expect-error Unknown keys are rejected without an escape hatch method.
      translator.translate('unknown');
    };

    expectTypeOf(assertInvalidCalls).toBeFunction();
  });
});
