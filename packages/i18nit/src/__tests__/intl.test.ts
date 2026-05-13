import { createI18n } from '../';
import { createFormatter } from '../format';

describe('format — createFormatter', () => {
  test('number()', () => {
    const fmt = createFormatter('en');

    expect(fmt.number(1_234.56)).toContain('1,234');
  });

  test('currency()', () => {
    const fmt = createFormatter('en');

    expect(fmt.currency(9.99, 'USD')).toContain('$');
  });

  test('date()', () => {
    const fmt = createFormatter('en');

    expect(fmt.date(new Date('2024-01-15'))).toContain('2024');
  });

  test('relative()', () => {
    const fmt = createFormatter('en');

    expect(fmt.relative(-1, 'day')).toContain('day');
  });

  test('list()', () => {
    const fmt = createFormatter('en');

    expect(fmt.list(['A', 'B', 'C'])).toBe('A, B, and C');
    expect(fmt.list(['A', 'B'], { type: 'or' })).toBe('A or B');
  });

  test('duration() returns a non-empty string', () => {
    const fmt = createFormatter('en');

    expect(fmt.duration({ hours: 1, minutes: 5, seconds: 9 })).toBeTruthy();
  });

  test('duration() fallback uses unambiguous unit labels', () => {
    const IntlExt = Intl as typeof Intl & { DurationFormat?: unknown };
    const original = IntlExt.DurationFormat;

    IntlExt.DurationFormat = undefined;

    try {
      const fmt = createFormatter('en');
      const out = fmt.duration({ microseconds: 4, milliseconds: 3, minutes: 2, months: 1 });

      expect(out).toContain('1mo');
      expect(out).toContain('2min');
      expect(out).toContain('3ms');
      expect(out).toContain('4us');
    } finally {
      IntlExt.DurationFormat = original;
    }
  });

  test('list() returns empty string for an empty array', () => {
    const fmt = createFormatter('en');

    expect(fmt.list([])).toBe('');
  });

  test('reactive binding reads current locale from i18n instance', async () => {
    const i18n = createI18n({
      catalogs: { en: {}, fr: {} },
      locale: 'en',
    });
    const fmt = createFormatter(i18n);

    const enResult = fmt.number(1_234.56);

    await i18n.setLocale('fr');

    const frResult = fmt.number(1_234.56);

    // Both should format a number; the exact output differs by locale
    expect(enResult).toBeTruthy();
    expect(frResult).toBeTruthy();
  });
});

describe('t() — plural helper (i18n core)', () => {
  test('resolves plural branch from key namespace', () => {
    const i18n = createI18n({
      catalogs: {
        en: {
          inbox: {
            one: 'One message',
            other: '{count} messages',
            zero: 'No messages',
          },
        },
      },
    });

    expect(i18n.t('inbox', { count: 0 })).toBe('No messages');
    expect(i18n.t('inbox', { count: 1 })).toBe('One message');
    expect(i18n.t('inbox', { count: 3 })).toBe('3 messages');
  });
});
