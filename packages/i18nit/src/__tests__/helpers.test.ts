import { createI18n } from '../';

describe('helpers — isMessageValue', () => {
  // ----------------------------------------------------------------
  // isMessageValue — plural-form key guard
  // ----------------------------------------------------------------
  describe('isMessageValue — plural-form key guard', () => {
    test('a namespace object that happens to have an "other" key is not treated as a plural message', () => {
      const i18n = createI18n({
        messages: {
          en: {
            // "nav" is a namespace, NOT a plural message, even though it has "other"
            nav: { home: 'Home', other: 'Other page' },
          },
        },
      });

      // t('nav.home') should resolve correctly — nav is a namespace, not a leaf
      expect(i18n.t('nav.home')).toBe('Home');
      expect(i18n.t('nav.other')).toBe('Other page');
    });

    test('an object with only plural-form keys and an "other" key is treated as a PluralMessages leaf', () => {
      const i18n = createI18n({
        messages: {
          en: {
            files: { one: 'One file', other: '{count} files', zero: 'No files' },
          },
        },
      });

      expect(i18n.t('files', { count: 0 })).toBe('No files');
      expect(i18n.t('files', { count: 1 })).toBe('One file');
      expect(i18n.t('files', { count: 3 })).toBe('3 files');
    });
  });
});
