import { createI18n } from '../';

describe('interpolate — template interpolation', () => {
  // ----------------------------------------------------------------
  // t() — interpolation
  // ----------------------------------------------------------------
  describe('t() — interpolation', () => {
    test('substitutes simple, nested-object, and bracket-notation variables', () => {
      const i18n = createI18n({
        messages: {
          en: {
            index: 'First tag: {tags[0]}',
            nested: 'By {user.name}, age {user.profile.age}',
            simple: 'Hello, {name}!',
          },
        },
      });

      expect(i18n.t('simple', { name: 'Alice' })).toBe('Hello, Alice!');
      expect(i18n.t('nested', { user: { name: 'Bob', profile: { age: 30 } } })).toBe('By Bob, age 30');
      expect(i18n.t('index', { tags: ['js', 'ts'] })).toBe('First tag: js');
    });

    test('replaces null, undefined, and out-of-bounds array references with an empty string', () => {
      const i18n = createI18n({
        messages: { en: { msg: '{a} and {b}', oob: 'Item: {items[5]}' } },
      });

      expect(i18n.t('msg', { a: null, b: undefined })).toBe(' and ');
      expect(i18n.t('oob', { items: ['only one'] })).toBe('Item: ');
    });

    test('auto-formats number variables with Intl.NumberFormat (locale-aware grouping)', () => {
      const i18n = createI18n({ locale: 'en', messages: { en: { price: 'Price: {amount}' } } });

      expect(i18n.t('price', { amount: 1234.56 })).toContain('1,234');
    });

    test('formats array variables: default comma join, index, .length, and custom separator', () => {
      const i18n = createI18n({
        messages: {
          en: {
            count: '{items.length} items',
            dash: '{items| - }',
            first: '{items[0]}',
            list: '{items}',
          },
        },
      });

      const items = ['A', 'B', 'C'];

      expect(i18n.t('list', { items })).toBe('A, B, C');
      expect(i18n.t('first', { items })).toBe('A');
      expect(i18n.t('count', { items })).toBe('3 items');
      expect(i18n.t('dash', { items })).toBe('A - B - C');
    });

    test('{items|and} and {items|or} produce locale-aware list conjunctions in templates', async () => {
      const i18n = createI18n({
        locale: 'en',
        messages: {
          en: { join: '{x|and}', split: '{x|or}' },
          fr: { join: '{x|and}', split: '{x|or}' },
        },
      });

      expect(i18n.t('join', { x: ['A', 'B', 'C'] })).toBe('A, B, and C');
      expect(i18n.t('split', { x: ['A', 'B', 'C'] })).toBe('A, B, or C');

      await i18n.switchLocale('fr');
      expect(i18n.t('join', { x: ['A', 'B', 'C'] })).toBe('A, B et C');
      expect(i18n.t('split', { x: ['A', 'B', 'C'] })).toBe('A, B ou C');
    });

    test('supports hyphenated variable keys like {first-name}', () => {
      const i18n = createI18n({ messages: { en: { msg: 'Hello {first-name}!' } } });

      expect(i18n.t('msg', { 'first-name': 'Alice' })).toBe('Hello Alice!');
    });
  });

  // ----------------------------------------------------------------
  // t() — Unicode variable names
  // ----------------------------------------------------------------
  describe('t() — Unicode variable names', () => {
    test('interpolates variables with Unicode characters in their names', () => {
      const i18n = createI18n({
        messages: {
          en: {
            greeting: 'Bonjour, {prénom}!',
            welcome: 'いらっしゃいませ、{名前}さん！',
          },
        },
      });

      expect(i18n.t('greeting', { prénom: 'Marie' })).toBe('Bonjour, Marie!');
      expect(i18n.t('welcome', { 名前: '田中' })).toBe('いらっしゃいませ、田中さん！');
    });
  });
});
