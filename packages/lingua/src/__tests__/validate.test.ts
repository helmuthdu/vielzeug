import { describe, expect, test } from 'vitest';

import { LinguaInvalidCatalogError, LinguaInvalidLocaleError } from '../';
import { validateCatalog } from '../validate';

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
