import { type BoundI18n, createI18n, type DeepPartialMessages } from '../';

describe('types — compile-time type utilities', () => {
  // ----------------------------------------------------------------
  // I18n implements BoundI18n
  // ----------------------------------------------------------------
  describe('I18n implements BoundI18n', () => {
    test('I18n instance is assignable to BoundI18n<T>', () => {
      type M = { greeting: string; nav: { home: string } };

      const i18n = createI18n<M>({
        messages: { en: { greeting: 'Hello', nav: { home: 'Home' } } },
      });

      // Type-level: verify I18n<M> satisfies BoundI18n<M>
      const bound: BoundI18n<M> = i18n;

      expect(bound.t('greeting')).toBe('Hello');
    });

    test('scope() result is assignable to BoundI18n of the subtree type', () => {
      type M = { nav: { about: string; home: string } };

      const i18n = createI18n<M>({
        messages: { en: { nav: { about: 'About', home: 'Home' } } },
      });

      type NavMessages = M['nav'];

      const nav: BoundI18n<NavMessages> = i18n.scope('nav');

      expect(nav.t('home')).toBe('Home');
      expect(nav.t('about')).toBe('About');
    });
  });

  // ----------------------------------------------------------------
  // DeepPartialMessages utility type
  // ----------------------------------------------------------------
  describe('DeepPartialMessages utility type', () => {
    test('accepts partial locale catalogs with only a subset of keys', () => {
      type M = { greeting: string; nav: { about: string; home: string } };
      type PartialM = DeepPartialMessages<M>;

      // This is a compile-time check — runtime just confirms the translation works with fallback
      const partial: PartialM = { nav: { home: 'Accueil' } };
      const i18n = createI18n<M>({
        fallback: 'en',
        locale: 'fr',
        messages: {
          en: { greeting: 'Hello', nav: { about: 'About', home: 'Home' } },
          fr: partial,
        },
      });

      expect(i18n.t('nav.home')).toBe('Accueil'); // from fr
      expect(i18n.t('nav.about')).toBe('About'); // fallback to en
    });
  });
});
