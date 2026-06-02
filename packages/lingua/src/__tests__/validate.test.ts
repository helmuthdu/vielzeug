import { describe, expect, test } from 'vitest';

import { validateCatalog } from '../validate';

describe('validateCatalog()', () => {
  test('returns an empty array when all expected plural forms are present (en)', () => {
    const warnings = validateCatalog({ inbox: { one: 'One message', other: '{count} messages' } }, 'en');

    expect(warnings).toEqual([]);
  });

  test('returns warnings for plural branches missing expected CLDR forms', () => {
    // Arabic requires zero/one/two/few/many/other — an en-only catalog is incomplete.
    const warnings = validateCatalog({ inbox: { one: 'One', other: 'Other' } }, 'ar');

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.every((w) => w.locale === 'ar')).toBe(true);
    expect(warnings.every((w) => w.key === 'inbox')).toBe(true);
  });

  test('does not report warnings for regular non-plural nested keys', () => {
    const warnings = validateCatalog({ nav: { about: 'About', home: 'Home' } }, 'en');

    expect(warnings).toEqual([]);
  });

  test('detects plural branches at nested key paths', () => {
    // 'other' is required for 'en' but missing here.
    const warnings = validateCatalog({ ui: { inbox: { one: 'One message' } } }, 'en');
    const missing = warnings.find((w) => w.form === 'other' && w.key === 'ui.inbox');

    expect(missing).toBeDefined();
  });

  test('warning object contains form, key, and locale', () => {
    const warnings = validateCatalog({ count: { one: 'One' } }, 'en');
    const other = warnings.find((w) => w.form === 'other');

    expect(other).toEqual({ form: 'other', key: 'count', locale: 'en' });
  });

  test('uses authoritative CLDR pluralCategories (not sampling heuristic)', () => {
    // Verify R1: resolvedOptions().pluralCategories is used.
    // For 'en', CLDR defines exactly 'one' and 'other'.
    // A catalog with only 'one' should produce exactly one warning: 'other'.
    const warnings = validateCatalog({ items: { one: 'One item' } }, 'en');

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toEqual({ form: 'other', key: 'items', locale: 'en' });
  });

  test('detects all missing forms for a locale with rich plural categories', () => {
    // Russian uses 'one', 'few', 'many', 'other'.
    // A catalog with only 'other' should report the other three.
    const warnings = validateCatalog({ items: { other: '{count} элементов' } }, 'ru');
    const missingForms = warnings.map((w) => w.form).sort();

    // At minimum 'one', 'few', 'many' should be flagged.
    expect(missingForms).toContain('one');
    expect(missingForms).toContain('few');
    expect(missingForms).toContain('many');
  });

  test('returns empty for a locale where only "other" is required (simple locales)', () => {
    // Japanese has only 'other'.
    const warnings = validateCatalog({ items: { other: '{count}件' } }, 'ja');

    expect(warnings).toEqual([]);
  });

  test('returns an empty array for an empty catalog', () => {
    expect(validateCatalog({}, 'en')).toEqual([]);
  });

  test('returns an empty array for a catalog with only flat string keys (no plural branches)', () => {
    const warnings = validateCatalog({ greeting: 'Hello', title: 'App' }, 'en');

    expect(warnings).toEqual([]);
  });
});
