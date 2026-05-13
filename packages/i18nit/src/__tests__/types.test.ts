import { createI18n, type I18n } from '../';

describe('types — redesigned surface', () => {
  test('createI18n returns I18n', () => {
    const i18n: I18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

    expect(i18n.t('hello')).toBe('Hello');
  });

  test('t() supports plural translation through count option', () => {
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

    expect(i18n.t('files', { count: 2 })).toBe('2 files');
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
    expect(i18n.t('files', { count: 3 })).toBe('3 files');
  });

  test('t() accepts ordinal option for plural categories', () => {
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

    expect(i18n.t('rank', { count: 1, ordinal: true })).toBeTruthy();
  });
});
