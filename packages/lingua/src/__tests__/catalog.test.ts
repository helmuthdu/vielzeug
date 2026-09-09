import { describe, expect, expectTypeOf, test } from 'vitest';

import { catalogKeys, createI18n, LinguaInvalidCatalogError, type MessageKey } from '../';

const flatCatalog = {
  FAREWELL: 'Goodbye',
  GREETING: 'Hello',
} as const;

const nestedCatalog = {
  normal: { ANOTHER_CLEAN: 'Another clean board', NOTHING_PENDING: 'Nothing pending' },
  rare: { PERFECT_CLEAR: { plural: { one: 'One perfect clear', other: '{count} perfect clears' } } },
  streak: { FIVE_STREAK: 'Five streak', THREE_IN_A_ROW: 'Three in a row' },
} as const;

describe('catalogKeys', () => {
  test('enumerates flat catalog keys', () => {
    const keys = catalogKeys(flatCatalog);

    expect(keys).toEqual(['FAREWELL', 'GREETING']);
    expectTypeOf(keys).toEqualTypeOf<ReadonlyArray<MessageKey<typeof flatCatalog>>>();
  });

  test('enumerates nested catalog keys as dotted paths', () => {
    const keys = catalogKeys(nestedCatalog);

    expect(keys).toEqual([
      'normal.ANOTHER_CLEAN',
      'normal.NOTHING_PENDING',
      'rare.PERFECT_CLEAR',
      'streak.FIVE_STREAK',
      'streak.THREE_IN_A_ROW',
    ]);
    expectTypeOf(keys).toEqualTypeOf<ReadonlyArray<MessageKey<typeof nestedCatalog>>>();
  });

  test('enumerates a nested subtree without parent prefix', () => {
    const streakKeys = catalogKeys(nestedCatalog.streak);

    expect(streakKeys).toEqual(['FIVE_STREAK', 'THREE_IN_A_ROW']);
    expectTypeOf(streakKeys).toEqualTypeOf<ReadonlyArray<MessageKey<typeof nestedCatalog.streak>>>();
  });

  test('treats plural messages as leaf keys, not groups', () => {
    const rareKeys = catalogKeys(nestedCatalog.rare);

    expect(rareKeys).toEqual(['PERFECT_CLEAR']);
    expectTypeOf(rareKeys).toEqualTypeOf<ReadonlyArray<MessageKey<typeof nestedCatalog.rare>>>();
  });

  test('returns empty array for empty catalog', () => {
    expect(catalogKeys({})).toEqual([]);
  });

  test('rejects invalid catalog nodes like compileCatalog', () => {
    expect(() => catalogKeys({ bad: [1, 2] as unknown as string })).toThrow(LinguaInvalidCatalogError);
  });

  test('enumerates keys from an i18n instance using its current locale', async () => {
    const catalogs = {
      de: { abschied: 'Tschüss', begrüßung: 'Hallo' },
      en: { farewell: 'Goodbye', greeting: 'Hello' },
    };

    const i18n = createI18n({
      loadCatalog: (locale) => catalogs[locale as 'de' | 'en'],
      locale: 'en',
    });

    await i18n.load();

    const keys = catalogKeys(i18n);
    expect(keys).toEqual(['farewell', 'greeting']);

    await i18n.setLocale('de');
    const deKeys = catalogKeys(i18n);
    expect(deKeys).toEqual(['abschied', 'begrüßung']);

    i18n.dispose();
  });
});
