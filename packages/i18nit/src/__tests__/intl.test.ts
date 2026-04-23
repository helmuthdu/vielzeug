import { createI18n } from '../';

describe('intl — unified format + plural helper', () => {
  test('format(number)', () => {
    const i18n = createI18n({ locale: 'en' });

    expect(i18n.format({ kind: 'number', value: 1234.56 })).toContain('1,234');
  });

  test('format(currency)', () => {
    const i18n = createI18n({ locale: 'en' });

    expect(i18n.format({ currency: 'USD', kind: 'currency', value: 9.99 })).toContain('$');
  });

  test('format(date)', () => {
    const i18n = createI18n({ locale: 'en' });

    expect(i18n.format({ kind: 'date', value: new Date('2024-01-15') })).toContain('2024');
  });

  test('format(relative)', () => {
    const i18n = createI18n({ locale: 'en' });

    expect(i18n.format({ kind: 'relative', unit: 'day', value: -1 })).toContain('day');
  });

  test('format(list)', () => {
    const i18n = createI18n({ locale: 'en' });

    expect(i18n.format({ kind: 'list', value: ['A', 'B', 'C'] })).toBe('A, B, and C');
    expect(i18n.format({ kind: 'list', options: { type: 'or' }, value: ['A', 'B'] })).toBe('A or B');
  });

  test('tp() resolves plural branch from key namespace', () => {
    const i18n = createI18n({
      messages: {
        en: {
          inbox: {
            one: 'One message',
            other: '{count} messages',
            zero: 'No messages',
          },
        },
      },
    });

    expect(i18n.tp('inbox', 0)).toBe('No messages');
    expect(i18n.tp('inbox', 1)).toBe('One message');
    expect(i18n.tp('inbox', 3)).toBe('3 messages');
  });
});
