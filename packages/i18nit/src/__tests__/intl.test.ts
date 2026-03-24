import { createI18n } from '../';

describe('intl — formatting & pluralization', () => {
  // ----------------------------------------------------------------
  // t() — pluralization
  // ----------------------------------------------------------------
  describe('t() — pluralization', () => {
    test('selects zero / one / other forms for English', () => {
      const i18n = createI18n({
        messages: {
          en: { items: { one: 'One item', other: '{count} items', zero: 'No items' } },
        },
      });

      expect(i18n.t('items', { count: 0 })).toBe('No items');
      expect(i18n.t('items', { count: 1 })).toBe('One item');
      expect(i18n.t('items', { count: 5 })).toBe('5 items');
    });

    test('applies locale-specific plural rules — French (0–1 = "one") and Arabic (6 distinct forms)', () => {
      const fr = createI18n({
        locale: 'fr',
        messages: { fr: { n: { one: 'un', other: '{count} autres' } } },
      });

      expect(fr.t('n', { count: 0 })).toBe('un'); // fr: 0 is "one"
      expect(fr.t('n', { count: 1 })).toBe('un');
      expect(fr.t('n', { count: 2 })).toBe('2 autres');

      const ar = createI18n({
        locale: 'ar',
        messages: {
          ar: {
            n: { few: 'عدة', many: 'كثيرة', one: 'واحد', other: 'أخرى', two: 'اثنان', zero: 'صفر' },
          },
        },
      });

      expect(ar.t('n', { count: 0 })).toBe('صفر');
      expect(ar.t('n', { count: 1 })).toBe('واحد');
      expect(ar.t('n', { count: 2 })).toBe('اثنان');
      expect(ar.t('n', { count: 5 })).toBe('عدة');
      expect(ar.t('n', { count: 15 })).toBe('كثيرة');
    });

    test('falls back to "other" when the exact plural form key is absent', () => {
      const i18n = createI18n({ messages: { en: { n: { other: '{count} items' } } } });

      expect(i18n.t('n', { count: 1 })).toBe('1 items');
    });

    test('uses Math.floor(Math.abs(count)) — negative decimals round to the correct plural form', () => {
      const i18n = createI18n({
        messages: { en: { n: { one: 'one item', other: '{count} items' } } },
      });

      // |-1.5| = 1.5 → floor = 1 → selects "one" form, not "other"
      expect(i18n.t('n', { count: -1.5 })).toBe('one item');
    });
  });

  // ----------------------------------------------------------------
  // Formatting helpers
  // ----------------------------------------------------------------
  describe('Formatting', () => {
    test('number() applies locale-aware grouping separators and supports Intl options', () => {
      const i18n = createI18n({ locale: 'en' });

      expect(i18n.number(1234.56)).toContain('1,234');
      expect(i18n.number(99.99, { currency: 'USD', style: 'currency' })).toContain('99.99');
    });

    test('date() accepts a Date object or numeric timestamp and respects Intl options', () => {
      const i18n = createI18n({ locale: 'en' });
      const date = new Date('2024-01-15');

      expect(i18n.date(date)).toContain('2024');
      expect(i18n.date(date.getTime())).toContain('2024');
      expect(i18n.date(date, { dateStyle: 'short' })).toMatch(/(2024|1\/15\/24)/);
    });

    test('number() and date() return a plain string fallback on Intl errors', () => {
      const i18n = createI18n({ locale: 'en' });

      expect(i18n.number(1234.56, { style: 'currency' })).toBe('1234.56'); // valid string, but Intl throws at runtime without 'currency' code
    });

    test('list() formats and/or lists; empty array returns empty string', () => {
      const i18n = createI18n({ locale: 'en' });

      expect(i18n.list(['Alice', 'Bob', 'Charlie'])).toBe('Alice, Bob, and Charlie');
      expect(i18n.list(['Alice', 'Bob'], 'or')).toBe('Alice or Bob');
      expect(i18n.list([])).toBe('');
      expect(i18n.withLocale('fr').list(['Alice', 'Bob', 'Charlie'])).toBe('Alice, Bob et Charlie');
    });

    test('list() falls back gracefully when the locale is not supported by Intl.ListFormat', () => {
      const i18n = createI18n({ locale: 'xx-YY', messages: { 'xx-YY': {} } });

      expect(i18n.list(['Alice', 'Bob'])).toBe('Alice and Bob');
      expect(i18n.list(['Alice', 'Bob', 'Charlie'])).toBe('Alice, Bob, and Charlie');
    });

    test('relative() formats relative time and accepts Intl options', () => {
      const i18n = createI18n({ locale: 'en' });

      expect(i18n.relative(-2, 'day')).toContain('day');
      expect(i18n.relative(3, 'hour')).toContain('hour');
      expect(i18n.relative(-1, 'day', { numeric: 'auto' })).toBe('yesterday');
    });

    test('currency() is a shorthand for number() with style: "currency"', () => {
      const i18n = createI18n({ locale: 'en' });

      expect(i18n.currency(99.99, 'USD')).toContain('$');
      expect(i18n.currency(99.99, 'USD')).toContain('99.99');
      expect(i18n.withLocale('de').currency(99.99, 'EUR')).toContain('99,99');
    });
  });
});
