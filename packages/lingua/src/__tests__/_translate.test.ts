import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { CatalogEntry } from '../_catalog';
import { createLocaleCaches } from '../_chain';
import { type TranslateContext, hasKey, translate, translatePlural } from '../_translate';
import { LinguaCountInVarsError, LinguaInvalidCountError } from '../errors';

// Direct unit tests for the translation algorithm, independent of `createI18n()` — a minimal
// hand-built `TranslateContext` over a plain `Map<Locale, CatalogEntry>` is enough to exercise
// fallback-chain lookup, plural-form selection, and interpolation on their own.

// `chain` is an ordered array of `[locale, catalog]` tuples rather than a plain object — object
// literal key order isn't meaningful for chain precedence once ESLint's perfectionist plugin is
// free to alphabetize it, so fallback-chain order has to be expressed explicitly here.
function makeContext(
  chain: ReadonlyArray<[string, CatalogEntry]>,
  overrides: Partial<TranslateContext> = {},
): TranslateContext {
  const map = new Map(chain);

  return {
    caches: createLocaleCaches(),
    catalogStore: { resolve: (loc) => map.get(loc) },
    chain: chain.map(([locale]) => locale),
    locale: chain[0]?.[0] ?? 'en',
    onMissingKey: (key) => key,
    onMissingVar: (varName) => `{${varName}}`,
    ...overrides,
  };
}

function catalog(entries: Record<string, string>): CatalogEntry {
  const entry = new CatalogEntry();

  entry.setAll(Object.entries(entries));

  return entry;
}

describe('_translate', () => {
  describe('translate()', () => {
    test('resolves a leaf key from the first matching locale in the chain', () => {
      const ctx = makeContext([['en', catalog({ hello: 'Hello' })]]);

      expect(translate(ctx, 'hello')).toBe('Hello');
    });

    test('falls back to the next locale in the chain when the first is missing the key', () => {
      const ctx = makeContext([
        ['en-US', catalog({})],
        ['en', catalog({ hello: 'Hello' })],
      ]);

      expect(translate(ctx, 'hello')).toBe('Hello');
    });

    test('calls onMissingKey when no locale in the chain has the key', () => {
      const ctx = makeContext([['en', catalog({})]], { onMissingKey: (key, locale) => `[${locale}:${key}]` });

      expect(translate(ctx, 'missing')).toBe('[en:missing]');
    });

    test('interpolates variables and delegates to onMissingVar for absent ones', () => {
      const ctx = makeContext([['en', catalog({ greet: 'Hi, {name}!' })]], {
        onMissingVar: (varName) => `<<${varName}>>`,
      });

      expect(translate(ctx, 'greet', { name: 'Ada' })).toBe('Hi, Ada!');
      expect(translate(ctx, 'greet')).toBe('Hi, <<name>>!');
    });

    describe('plural-branch-only key warning', () => {
      let warnSpy: ReturnType<typeof vi.spyOn>;

      beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      });

      afterEach(() => {
        warnSpy.mockRestore();
      });

      test('warns when the key exists only as a plural branch, pointing at tp()', () => {
        const ctx = makeContext([['en', catalog({ 'items.one': '1 item', 'items.other': '{count} items' })]]);

        expect(translate(ctx, 'items')).toBe('items');
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("use tp('items', count) instead"));
      });

      test('does not warn for a genuinely missing key (no leaf, no branch)', () => {
        const ctx = makeContext([['en', catalog({})]]);

        translate(ctx, 'missing');
        expect(warnSpy).not.toHaveBeenCalled();
      });

      test('does not warn when the key resolves normally', () => {
        const ctx = makeContext([['en', catalog({ hello: 'Hello' })]]);

        translate(ctx, 'hello');
        expect(warnSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('hasKey()', () => {
    test('true for a leaf key', () => {
      const ctx = makeContext([['en', catalog({ hello: 'Hello' })]]);

      expect(hasKey(ctx, 'hello')).toBe(true);
    });

    test('true for a plural branch prefix', () => {
      const ctx = makeContext([['en', catalog({ 'items.one': '1 item', 'items.other': '{count} items' })]]);

      expect(hasKey(ctx, 'items')).toBe(true);
    });

    test('false when the key is absent from every locale in the chain', () => {
      const ctx = makeContext([['en', catalog({ hello: 'Hello' })]]);

      expect(hasKey(ctx, 'missing')).toBe(false);
    });
  });

  describe('translatePlural()', () => {
    test('selects the CLDR form for the given count', () => {
      const ctx = makeContext([['en', catalog({ 'items.one': '1 item', 'items.other': '{count} items' })]]);

      expect(translatePlural(ctx, 'items', 1)).toBe('1 item');
      expect(translatePlural(ctx, 'items', 5)).toBe('5 items');
    });

    test('prefers .zero over the CLDR cardinal form when count is 0', () => {
      const ctx = makeContext([['en', catalog({ 'items.other': '{count} items', 'items.zero': 'No items' })]]);

      expect(translatePlural(ctx, 'items', 0)).toBe('No items');
    });

    test('falls back to .other when no .zero override exists for count 0', () => {
      const ctx = makeContext([['en', catalog({ 'items.other': '{count} items' })]]);

      expect(translatePlural(ctx, 'items', 0)).toBe('0 items');
    });

    test('uses ordinal rules when options.ordinal is true', () => {
      const ctx = makeContext([
        ['en', catalog({ 'place.one': '{count}st', 'place.other': '{count}th', 'place.two': '{count}nd' })],
      ]);

      expect(translatePlural(ctx, 'place', 1, { ordinal: true })).toBe('1st');
      expect(translatePlural(ctx, 'place', 2, { ordinal: true })).toBe('2nd');
    });

    test('merges extra vars alongside the auto-injected count', () => {
      const ctx = makeContext([['en', catalog({ 'items.other': '{count} items for {user}' })]]);

      expect(translatePlural(ctx, 'items', 3, { vars: { user: 'Ada' } })).toBe('3 items for Ada');
    });

    test('throws LinguaInvalidCountError for a non-finite count', () => {
      const ctx = makeContext([['en', catalog({ 'items.other': '{count}' })]]);

      expect(() => translatePlural(ctx, 'items', Number.NaN)).toThrow(LinguaInvalidCountError);
    });

    test('throws LinguaCountInVarsError when vars.count is set', () => {
      const ctx = makeContext([['en', catalog({ 'items.other': '{count}' })]]);

      expect(() => translatePlural(ctx, 'items', 1, { vars: { count: 99 } })).toThrow(LinguaCountInVarsError);
    });

    test('calls onMissingKey when no locale has any plural form for the key', () => {
      const ctx = makeContext([['en', catalog({})]], { onMissingKey: (key) => `MISSING(${key})` });

      expect(translatePlural(ctx, 'items', 1)).toBe('MISSING(items)');
    });
  });
});
