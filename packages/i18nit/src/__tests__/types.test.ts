import { createI18n, type I18n } from '../';

describe('types — minimal surface', () => {
  test('createI18n returns I18n', () => {
    const i18n: I18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

    expect(i18n.t('hello')).toBe('Hello');
  });

  test('tp() requires explicit count parameter', () => {
    const i18n = createI18n({
      catalogs: {
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

  test('createI18n can infer typed keys from a schema', () => {
    const i18n = createI18n({
      catalogs: {
        en: {
          files: { one: 'One file', other: '{count} files' },
          ui: { title: 'Title' },
        },
      },
    });

    expect(i18n.t('ui.title')).toBe('Title');
    expect(i18n.tp('files', 3)).toBe('3 files');
  });

  test('tp() accepts plural options', () => {
    const i18n = createI18n({
      catalogs: {
        en: {
          rank: {
            one: '{count}st',
            other: '{count}th',
          },
        },
      },
    });

    expect(i18n.tp('rank', 1, undefined, true)).toBeTruthy();
  });
});
