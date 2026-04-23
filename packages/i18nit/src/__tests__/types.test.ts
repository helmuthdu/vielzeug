import { createI18n, type I18n } from '../';

describe('types — minimal surface', () => {
  test('createI18n returns I18n', () => {
    const i18n: I18n = createI18n({ messages: { en: { hello: 'Hello' } } });

    expect(i18n.t('hello')).toBe('Hello');
  });

  test('tp() requires explicit count parameter', () => {
    const i18n = createI18n({
      messages: {
        en: {
          files: {
            one: 'One file',
            other: '{count} files',
          },
        },
      },
    });

    expect(i18n.tp('files', 2)).toBe('2 files');
  });
});
