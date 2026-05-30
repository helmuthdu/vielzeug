import { describe, expect, test } from 'vitest';

import { createI18n } from '../';
import { createFormatter } from '../format';

describe('createFormatter', () => {
  // ─── number() ─────────────────────────────────────────────────────────────

  describe('number()', () => {
    test('formats a number for the given locale', () => {
      expect(createFormatter('en').number(1_234.56)).toContain('1,234');
    });

    test('accepts Intl.NumberFormatOptions', () => {
      const result = createFormatter('en').number(0.42, { style: 'percent' });

      expect(result).toContain('%');
    });

    test('does not throw when options contain a circular reference', () => {
      // cacheKey falls back to locale-only when JSON.stringify fails,
      // so the formatter is created uncached rather than throwing.
      const opts = { style: 'decimal' } as Intl.NumberFormatOptions & { self?: unknown };

      opts.self = opts;
      expect(() => createFormatter('en').number(42, opts as Intl.NumberFormatOptions)).not.toThrow();
    });
  });

  // ─── currency() ───────────────────────────────────────────────────────────

  describe('currency()', () => {
    test('formats a currency value with its symbol', () => {
      expect(createFormatter('en').currency(9.99, 'USD')).toContain('$');
    });
  });

  // ─── date() ───────────────────────────────────────────────────────────────

  describe('date()', () => {
    test('formats a Date instance', () => {
      expect(createFormatter('en').date(new Date('2024-01-15'))).toContain('2024');
    });

    test('accepts a numeric timestamp', () => {
      expect(createFormatter('en').date(new Date('2024-06-01').getTime())).toContain('2024');
    });
  });

  // ─── relative() ───────────────────────────────────────────────────────────

  describe('relative()', () => {
    test('formats a relative time expression', () => {
      expect(createFormatter('en').relative(-1, 'day')).toContain('day');
    });
  });

  // ─── list() ───────────────────────────────────────────────────────────────

  describe('list()', () => {
    test('formats a conjunction list', () => {
      expect(createFormatter('en').list(['A', 'B', 'C'])).toBe('A, B, and C');
    });

    test('formats a disjunction list', () => {
      expect(createFormatter('en').list(['A', 'B'], { type: 'or' })).toBe('A or B');
    });

    test('returns an empty string for an empty array', () => {
      expect(createFormatter('en').list([])).toBe('');
    });

    test('stringifies numbers in the list', () => {
      expect(createFormatter('en').list([1, 2, 3])).toBe('1, 2, and 3');
    });
  });

  // ─── clear() ──────────────────────────────────────────────────────────────

  describe('clear()', () => {
    test('resets all internal caches without breaking subsequent calls', () => {
      const fmt = createFormatter('en');

      // Prime the caches.
      fmt.number(1_234);
      fmt.currency(9.99, 'USD');
      fmt.date(new Date('2024-01-15'));
      fmt.relative(-1, 'day');
      fmt.list(['A', 'B']);

      // clear() must not throw.
      expect(() => fmt.clear()).not.toThrow();

      // All methods must still work correctly after clearing.
      expect(fmt.number(1_234)).toContain('1,234');
      expect(fmt.currency(9.99, 'USD')).toContain('$');
      expect(fmt.list(['A', 'B', 'C'])).toBe('A, B, and C');
    });
  });

  // ─── duration() ───────────────────────────────────────────────────────────

  describe('duration()', () => {
    test('returns a non-empty string', () => {
      expect(createFormatter('en').duration({ hours: 1, minutes: 5 })).toBeTruthy();
    });

    test('fallback uses unambiguous unit labels when Intl.DurationFormat is unavailable', () => {
      const IntlExt = Intl as typeof Intl & { DurationFormat?: unknown };
      const original = IntlExt.DurationFormat;

      IntlExt.DurationFormat = undefined;

      try {
        const out = createFormatter('en').duration({
          microseconds: 4,
          milliseconds: 3,
          minutes: 2,
          months: 1,
        });

        expect(out).toContain('1mo');
        expect(out).toContain('2min');
        expect(out).toContain('3ms');
        expect(out).toContain('4us');
      } finally {
        IntlExt.DurationFormat = original;
      }
    });
  });

  // ─── locale source ────────────────────────────────────────────────────────

  describe('locale source', () => {
    test('accepts a getter function for reactive locale binding', () => {
      let locale = 'en';
      const fmt = createFormatter(() => locale);
      const enResult = fmt.number(1_234.56);

      locale = 'fr';

      const frResult = fmt.number(1_234.56);

      // French uses space as thousands separator — the en result uses a comma
      expect(enResult).toContain('1,234');
      expect(frResult).not.toContain('1,234');
    });

    test('follows locale changes when given a getter function', async () => {
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });
      const fmt = createFormatter(() => i18n.locale);
      const enResult = fmt.number(1_234.56);

      await i18n.setLocale('fr');

      const frResult = fmt.number(1_234.56);

      expect(enResult).toContain('1,234');
      expect(frResult).not.toContain('1,234');
    });
  });
});
