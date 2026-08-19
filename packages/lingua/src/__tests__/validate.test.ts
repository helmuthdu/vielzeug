import { describe, expect, test } from 'vitest';

import { LinguaInvalidCatalogError, LinguaInvalidLocaleError } from '../';
import { compareCatalogs, validateCatalog } from '../validate';

describe('validateCatalog', () => {
  test('validates only explicit plural messages', () => {
    expect(
      validateCatalog({ inbox: { plural: { one: 'One', other: '{count} messages' } }, nav: { home: 'Home' } }, 'en'),
    ).toEqual([]);
  });

  test('reports missing CLDR forms with explicit key and locale', () => {
    expect(validateCatalog({ ui: { inbox: { plural: { one: 'One' } } } }, 'en')).toEqual([
      { key: 'ui.inbox', locale: 'en', missing: 'other' },
    ]);
  });

  test('uses locale plural categories', () => {
    const issues = validateCatalog({ inbox: { plural: { other: '{count}' } } }, 'ar');

    expect(issues.map(({ missing }) => missing)).toEqual(expect.arrayContaining(['few', 'many', 'one', 'two', 'zero']));
  });

  test('accepts empty plural templates as declared forms', () => {
    expect(validateCatalog({ inbox: { plural: { one: '', other: '' } } }, 'en')).toEqual([]);
  });

  test('uses compiler catalog validation for malformed catalog data', () => {
    expect(() => validateCatalog({ inbox: { plural: null } } as never, 'en')).toThrow(LinguaInvalidCatalogError);
  });

  test('rejects invalid locale tags with LinguaInvalidLocaleError', () => {
    expect(() => validateCatalog({}, 'not_valid!')).toThrow(LinguaInvalidLocaleError);
  });
});

describe('compareCatalogs', () => {
  test('reports no issues for matching catalogs', () => {
    const result = compareCatalogs({
      de: { farewell: 'Tschüss', greeting: 'Hallo' },
      en: { farewell: 'Goodbye', greeting: 'Hello' },
    });

    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
  });

  test('reports keys missing in target locales', () => {
    const result = compareCatalogs({
      de: { farewell: 'Tschüss', greeting: 'Hallo' },
      en: { greeting: 'Hello' },
    });

    expect(result.missing).toEqual([{ key: 'farewell', locale: 'en' }]);
    expect(result.extra).toEqual([]);
  });

  test('reports extra keys in target locales', () => {
    const result = compareCatalogs({
      de: { greeting: 'Hallo' },
      en: { extra: 'Extra', greeting: 'Hello' },
    });

    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([{ key: 'extra', locale: 'en' }]);
  });

  test('uses first locale as base for comparison', () => {
    const result = compareCatalogs({
      en: { greeting: 'Hello' },
      fr: { extra: 'Extra', greeting: 'Bonjour' },
    });

    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([{ key: 'extra', locale: 'fr' }]);
  });

  test('compares nested keys as dotted paths', () => {
    const result = compareCatalogs({
      en: { nav: { home: 'Home', settings: 'Settings' } },
      fr: { nav: { home: 'Accueil' } },
    });

    expect(result.missing).toEqual([{ key: 'nav.settings', locale: 'fr' }]);
    expect(result.extra).toEqual([]);
  });

  test('validates each catalog through compileCatalog', () => {
    expect(() =>
      compareCatalogs({
        de: { bad: [1, 2] as unknown as string },
        en: { greeting: 'Hello' },
      }),
    ).toThrow(LinguaInvalidCatalogError);
  });

  test('handles single-locale catalogs', () => {
    const result = compareCatalogs({ en: { greeting: 'Hello' } });

    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
  });
});
