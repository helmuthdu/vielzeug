import { createI18n, MissingVariableError } from './i18nit';

describe('I18nit', () => {
  describe('Initialization', () => {
    test('creates instance with defaults and configuration', () => {
      const i18n1 = createI18n();
      expect(i18n1.getLocale()).toBe('en');

      const i18n2 = createI18n({
        escape: true,
        fallback: 'en',
        locale: 'fr',
        messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        missingKey: (key, locale) => `[${locale}:${key}]`,
      });

      expect(i18n2.getLocale()).toBe('fr');
      expect(i18n2.t('hello')).toBe('Bonjour');
      expect(i18n2.t('missing')).toBe('[fr:missing]');
    });

    test('handles single and multiple fallback locales', () => {
      const i18n = createI18n({
        fallback: ['fr', 'en'],
        locale: 'es',
        messages: {
          en: { a: 'A(en)', b: 'B(en)', c: 'C(en)' },
          es: { a: 'A(es)' },
          fr: { a: 'A(fr)', b: 'B(fr)' },
        },
      });

      expect(i18n.t('a')).toBe('A(es)'); // Primary
      expect(i18n.t('b')).toBe('B(fr)'); // First fallback
      expect(i18n.t('c')).toBe('C(en)'); // Second fallback
    });
  });

  describe('Translation', () => {
    test('translates with key fallback and custom fallback', () => {
      const i18n = createI18n();
      expect(i18n.t('nonexistent')).toBe('nonexistent');
      expect(i18n.t('nonexistent', undefined, { fallback: 'Custom' })).toBe('Custom');
    });

    test('translates with locale option and escape option', () => {
      const i18n = createI18n({
        messages: {
          en: { msg: '<b>Bold</b>' },
          fr: { msg: '<i>Italic</i>' },
        },
      });

      expect(i18n.t('msg', undefined, { locale: 'fr' })).toBe('<i>Italic</i>');
      expect(i18n.t('msg', undefined, { escape: true })).toBe('&lt;b&gt;Bold&lt;/b&gt;');
    });
  });

  describe('Interpolation', () => {
    test('interpolates simple, multiple, and nested variables', () => {
      const i18n = createI18n({
        messages: {
          en: {
            multiple: '{greeting}, {name}! You have {count} messages.',
            nested: 'User: {user.name}, Friend: {friends[0].name}',
            simple: 'Hello, {name}!',
          },
        },
      });

      expect(i18n.t('simple', { name: 'Alice' })).toBe('Hello, Alice!');
      expect(i18n.t('multiple', { count: 5, greeting: 'Hi', name: 'Bob' })).toBe('Hi, Bob! You have 5 messages.');
      expect(i18n.t('nested', { friends: [{ name: 'Dave' }], user: { name: 'Charlie' } })).toBe(
        'User: Charlie, Friend: Dave',
      );
    });

    test('handles missing variables with different strategies', () => {
      const i18n1 = createI18n({
        messages: { en: { msg: 'Hello, {name}!' } },
        missingVar: 'empty',
      });
      const i18n2 = createI18n({
        messages: { en: { msg: 'Hello, {name}!' } },
        missingVar: 'preserve',
      });
      const i18n3 = createI18n({
        messages: { en: { msg: 'Hello, {name}!' } },
        missingVar: 'error',
      });

      expect(i18n1.t('msg')).toBe('Hello, !');
      expect(i18n2.t('msg')).toBe('Hello, {name}!');
      expect(() => i18n3.t('msg')).toThrow(MissingVariableError);
    });

    test('MissingVariableError provides structured information', () => {
      const i18n = createI18n({
        messages: { en: { greeting: 'Hello, {name}!' } },
        missingVar: 'error',
      });

      try {
        i18n.t('greeting');
      } catch (error) {
        expect(error).toBeInstanceOf(MissingVariableError);
        if (error instanceof MissingVariableError) {
          expect(error.key).toBe('greeting');
          expect(error.variable).toBe('name');
          expect(error.locale).toBe('en');
          expect(error.message).toBe("Missing variable 'name' for key 'greeting' in locale 'en'");
        }
      }
    });

    test('formats numbers and escapes HTML in interpolation', () => {
      const i18n = createI18n({
        locale: 'de',
        messages: {
          de: { price: 'Price: {amount}' },
        },
      });
      expect(i18n.t('price', { amount: 1234.56 })).toContain('1');

      const i18nEn = createI18n({
        messages: { en: { html: 'Content: {content}' } },
      });
      expect(i18nEn.t('html', { content: '<script>xss</script>' }, { escape: true })).toBe(
        'Content: &lt;script&gt;xss&lt;/script&gt;',
      );
    });

    test('handles arrays with default comma separator', () => {
      const i18n = createI18n({
        messages: {
          en: {
            firstItem: 'First: {items[0]}',
            outOfBounds: 'Item: {items[10]}',
            shopping: 'Shopping list: {items}',
          },
        },
      });

      expect(i18n.t('shopping', { items: ['Apple', 'Banana', 'Orange'] })).toBe('Shopping list: Apple, Banana, Orange');
      expect(i18n.t('firstItem', { items: ['Apple', 'Banana'] })).toBe('First: Apple');
      expect(i18n.t('outOfBounds', { items: ['Apple'] })).toBe('Item: ');
    });

    test('handles arrays with "and" separator', () => {
      const i18n = createI18n({
        messages: {
          en: {
            one: 'Guest: {guests|and}',
            three: 'Guests: {guests|and}',
            two: 'Guests: {guests|and}',
            zero: 'Guests: {guests|and}',
          },
        },
      });

      expect(i18n.t('zero', { guests: [] })).toBe('Guests: ');
      expect(i18n.t('one', { guests: ['Alice'] })).toBe('Guest: Alice');
      expect(i18n.t('two', { guests: ['Alice', 'Bob'] })).toBe('Guests: Alice and Bob');
      expect(i18n.t('three', { guests: ['Alice', 'Bob', 'Charlie'] })).toBe('Guests: Alice, Bob, and Charlie');
    });

    test('handles arrays with "or" separator', () => {
      const i18n = createI18n({
        messages: {
          en: {
            options: 'Choose: {choices|or}',
          },
        },
      });

      expect(i18n.t('options', { choices: [] })).toBe('Choose: ');
      expect(i18n.t('options', { choices: ['Tea'] })).toBe('Choose: Tea');
      expect(i18n.t('options', { choices: ['Tea', 'Coffee'] })).toBe('Choose: Tea or Coffee');
      expect(i18n.t('options', { choices: ['Tea', 'Coffee', 'Juice'] })).toBe('Choose: Tea, Coffee, or Juice');
    });

    test('handles arrays with custom separators', () => {
      const i18n = createI18n({
        messages: {
          en: {
            dash: 'Items: {items| - }',
            pipe: 'Items: {items| | }',
            semicolon: 'Items: {items|; }',
          },
        },
      });

      expect(i18n.t('dash', { items: ['A', 'B', 'C'] })).toBe('Items: A - B - C');
      expect(i18n.t('semicolon', { items: ['A', 'B'] })).toBe('Items: A; B');
      expect(i18n.t('pipe', { items: ['X', 'Y', 'Z'] })).toBe('Items: X | Y | Z');
    });

    test('handles array length access', () => {
      const i18n = createI18n({
        messages: {
          en: {
            count: 'You have {items.length} items',
            multiple: '{items.length} items in {categories.length} categories',
          },
        },
      });

      expect(i18n.t('count', { items: ['A', 'B', 'C'] })).toBe('You have 3 items');
      expect(i18n.t('count', { items: [] })).toBe('You have 0 items');
      expect(i18n.t('multiple', { categories: ['X', 'Y', 'Z'], items: ['A', 'B'] })).toBe('2 items in 3 categories');
    });

    test('handles complex array scenarios', () => {
      const i18n = createI18n({
        messages: {
          en: {
            mixed: 'First: {items[0]}, Total: {items.length}, All: {items|and}',
            nested: '{users[0].name} has {users[0].items.length} items: {users[0].items}',
          },
        },
      });

      expect(i18n.t('mixed', { items: ['Apple', 'Banana', 'Orange'] })).toBe(
        'First: Apple, Total: 3, All: Apple, Banana, and Orange',
      );

      expect(
        i18n.t('nested', {
          users: [{ items: ['Book', 'Pen', 'Notebook'], name: 'Alice' }],
        }),
      ).toBe('Alice has 3 items: Book, Pen, Notebook');
    });

    test('uses locale-aware conjunctions for "and" separator', () => {
      const i18n = createI18n({
        locale: 'en',
        messages: {
          de: { guests: 'Gäste: {names|and}' },
          en: { guests: 'Guests: {names|and}' },
          es: { guests: 'Invitados: {names|and}' },
          fr: { guests: 'Invités: {names|and}' },
          ja: { guests: 'ゲスト: {names|and}' },
        },
      });

      // English (uses Oxford comma)
      expect(i18n.t('guests', { names: ['Alice', 'Bob'] })).toBe('Guests: Alice and Bob');
      expect(i18n.t('guests', { names: ['Alice', 'Bob', 'Charlie'] })).toBe('Guests: Alice, Bob, and Charlie');

      // Spanish
      i18n.setLocale('es');
      expect(i18n.t('guests', { names: ['Alice', 'Bob'] })).toBe('Invitados: Alice y Bob');
      expect(i18n.t('guests', { names: ['Alice', 'Bob', 'Charlie'] })).toBe('Invitados: Alice, Bob y Charlie');

      // French
      i18n.setLocale('fr');
      expect(i18n.t('guests', { names: ['Alice', 'Bob'] })).toBe('Invités: Alice et Bob');
      expect(i18n.t('guests', { names: ['Alice', 'Bob', 'Charlie'] })).toBe('Invités: Alice, Bob et Charlie');

      // German
      i18n.setLocale('de');
      expect(i18n.t('guests', { names: ['Alice', 'Bob'] })).toBe('Gäste: Alice und Bob');
      expect(i18n.t('guests', { names: ['Alice', 'Bob', 'Charlie'] })).toBe('Gäste: Alice, Bob und Charlie');

      // Japanese
      i18n.setLocale('ja');
      expect(i18n.t('guests', { names: ['Alice', 'Bob'] })).toBe('ゲスト: Alice、Bob');
      expect(i18n.t('guests', { names: ['Alice', 'Bob', 'Charlie'] })).toBe('ゲスト: Alice、Bob、Charlie');
    });

    test('uses locale-aware conjunctions for "or" separator', () => {
      const i18n = createI18n({
        locale: 'en',
        messages: {
          de: { options: 'Wählen: {choices|or}' },
          en: { options: 'Choose: {choices|or}' },
          es: { options: 'Elige: {choices|or}' },
          fr: { options: 'Choisir: {choices|or}' },
          pt: { options: 'Escolha: {choices|or}' },
        },
      });

      // English (uses Oxford comma)
      expect(i18n.t('options', { choices: ['Tea', 'Coffee'] })).toBe('Choose: Tea or Coffee');
      expect(i18n.t('options', { choices: ['Tea', 'Coffee', 'Juice'] })).toBe('Choose: Tea, Coffee, or Juice');

      // Spanish
      i18n.setLocale('es');
      expect(i18n.t('options', { choices: ['Té', 'Café'] })).toBe('Elige: Té o Café');
      expect(i18n.t('options', { choices: ['Té', 'Café', 'Jugo'] })).toBe('Elige: Té, Café o Jugo');

      // French
      i18n.setLocale('fr');
      expect(i18n.t('options', { choices: ['Thé', 'Café'] })).toBe('Choisir: Thé ou Café');
      expect(i18n.t('options', { choices: ['Thé', 'Café', 'Jus'] })).toBe('Choisir: Thé, Café ou Jus');

      // German
      i18n.setLocale('de');
      expect(i18n.t('options', { choices: ['Tee', 'Kaffee'] })).toBe('Wählen: Tee oder Kaffee');
      expect(i18n.t('options', { choices: ['Tee', 'Kaffee', 'Saft'] })).toBe('Wählen: Tee, Kaffee oder Saft');

      // Portuguese
      i18n.setLocale('pt');
      expect(i18n.t('options', { choices: ['Chá', 'Café'] })).toBe('Escolha: Chá ou Café');
      expect(i18n.t('options', { choices: ['Chá', 'Café', 'Suco'] })).toBe('Escolha: Chá, Café ou Suco');
    });

    test('falls back to English for unsupported locales', () => {
      const i18n = createI18n({
        locale: 'xx-YY', // Unsupported locale
        messages: {
          'xx-YY': { guests: 'Guests: {names|and}' },
        },
      });

      // Should use English conjunction as fallback (with Oxford comma)
      expect(i18n.t('guests', { names: ['Alice', 'Bob'] })).toBe('Guests: Alice and Bob');
      expect(i18n.t('guests', { names: ['Alice', 'Bob', 'Charlie'] })).toBe('Guests: Alice, Bob, and Charlie');
    });

    test('handles locale variants correctly', () => {
      const i18n = createI18n({
        locale: 'en-US',
        messages: {
          'en-US': { guests: 'Guests: {names|and}' },
        },
      });

      // en-US should use 'en' base conjunctions
      expect(i18n.t('guests', { names: ['Alice', 'Bob'] })).toBe('Guests: Alice and Bob');

      i18n.setLocale('es-MX');
      i18n.add('es-MX', { guests: 'Invitados: {names|and}' });
      // es-MX should use 'es' base conjunctions
      expect(i18n.t('guests', { names: ['Alice', 'Bob'] })).toBe('Invitados: Alice y Bob');
    });
  });

  describe('Pluralization', () => {
    test('handles English plural forms', () => {
      const i18n = createI18n({
        messages: {
          en: {
            items: { one: 'One item', other: '{count} items', zero: 'No items' },
          },
        },
      });

      expect(i18n.t('items', { count: 0 })).toBe('No items');
      expect(i18n.t('items', { count: 1 })).toBe('One item');
      expect(i18n.t('items', { count: 5 })).toBe('5 items');
    });

    test('handles locale-specific plural rules via Intl.PluralRules', () => {
      const i18nFr = createI18n({
        locale: 'fr',
        messages: {
          fr: { items: { one: 'Un article', other: '{count} articles' } },
        },
      });

      expect(i18nFr.t('items', { count: 0 })).toBe('Un article'); // 0-1 uses 'one'
      expect(i18nFr.t('items', { count: 1 })).toBe('Un article');
      expect(i18nFr.t('items', { count: 2 })).toBe('2 articles');

      const i18nAr = createI18n({
        locale: 'ar',
        messages: {
          ar: {
            items: {
              few: 'عدة',
              many: 'كثيرة',
              one: 'واحد',
              other: 'أخرى',
              two: 'اثنان',
              zero: 'لا شيء',
            },
          },
        },
      });

      expect(i18nAr.t('items', { count: 0 })).toBe('لا شيء');
      expect(i18nAr.t('items', { count: 1 })).toBe('واحد');
      expect(i18nAr.t('items', { count: 2 })).toBe('اثنان');
      expect(i18nAr.t('items', { count: 5 })).toBe('عدة');
      expect(i18nAr.t('items', { count: 15 })).toBe('كثيرة');
    });

    test('falls back to other when form is missing', () => {
      const i18n = createI18n({
        messages: { en: { items: { other: '{count} items' } } },
      });
      expect(i18n.t('items', { count: 1 })).toBe('1 items');
    });
  });

  describe('Message Functions', () => {
    test('calls message function with vars and helpers', () => {
      const i18n = createI18n({
        locale: 'en',
        messages: {
          en: {
            dynamic: (vars) => `Hello, ${vars.name}!`,
            event: (vars, helpers) => `Event: ${helpers.date(vars.date as Date, { dateStyle: 'short' })}`,
            price: (vars, helpers) =>
              `Price: ${helpers.number(vars.amount as number, { currency: 'USD', style: 'currency' })}`,
          },
        },
      });

      expect(i18n.t('dynamic', { name: 'Eve' })).toBe('Hello, Eve!');
      expect(i18n.t('price', { amount: 99.99 })).toContain('99.99');
      expect(i18n.t('event', { date: new Date('2024-01-15') })).toMatch(/(2024|1\/15\/24)/);
    });

    test('returns empty string when function throws and escapes result', () => {
      const i18n = createI18n({
        messages: {
          en: {
            error: () => {
              throw new Error('Oops');
            },
            html: () => '<b>bold</b>',
          },
        },
      });

      expect(i18n.t('error')).toBe('');
      expect(i18n.t('html', {}, { escape: true })).toBe('&lt;b&gt;bold&lt;/b&gt;');
    });
  });

  describe('Locale Management', () => {
    test('gets and sets locale with change detection', () => {
      const i18n = createI18n({ locale: 'en' });
      expect(i18n.getLocale()).toBe('en');

      i18n.setLocale('fr');
      expect(i18n.getLocale()).toBe('fr');
    });

    test('checks locale and key existence', () => {
      const i18n = createI18n({
        messages: {
          en: { hello: 'Hello' },
          fr: { bonjour: 'Bonjour' },
        },
      });

      expect(i18n.hasLocale('en')).toBe(true);
      expect(i18n.hasLocale('de')).toBe(false);
      expect(i18n.has('hello')).toBe(true);
      expect(i18n.has('hello', 'fr')).toBe(false);
      expect(i18n.has('bonjour', 'fr')).toBe(true);
    });
  });

  describe('Message Management', () => {
    test('adds messages (merge) and sets messages (replace)', () => {
      const i18n = createI18n({
        messages: { en: { goodbye: 'Goodbye', hello: 'Hello' } },
      });

      i18n.add('en', { welcome: 'Welcome' });
      expect(i18n.t('hello')).toBe('Hello');
      expect(i18n.t('welcome')).toBe('Welcome');

      i18n.set('en', { greeting: 'Greetings' });
      expect(i18n.t('hello')).toBe('hello'); // Removed
      expect(i18n.t('greeting')).toBe('Greetings');
    });

    test('gets messages for locale', () => {
      const i18n = createI18n({
        messages: { en: { hello: 'Hello' } },
      });

      expect(i18n.getMessages('en')).toEqual({ hello: 'Hello' });
      expect(i18n.getMessages('fr')).toBeUndefined();
    });
  });

  describe('Async Loading', () => {
    test('loads messages asynchronously and handles concurrency', async () => {
      let loadCount = 0;
      const i18n = createI18n({
        loaders: {
          es: async () => {
            loadCount++;
            await new Promise((resolve) => setTimeout(resolve, 10));
            return { hello: 'Hola' };
          },
        },
      });

      await Promise.all([i18n.load('es'), i18n.load('es'), i18n.load('es')]);
      expect(loadCount).toBe(1);
      expect(i18n.t('hello', undefined, { locale: 'es' })).toBe('Hola');
    });

    test('registers loader dynamically and retries on failure', async () => {
      const i18n = createI18n();
      i18n.register('de', async () => ({ hello: 'Hallo' }));
      await i18n.load('de');
      expect(i18n.t('hello', undefined, { locale: 'de' })).toBe('Hallo');

      let called = 0;
      const i18n2 = createI18n({
        loaders: {
          es: async () => {
            called++;
            throw new Error('failed load');
          },
        },
      });

      await expect(i18n2.load('es')).rejects.toThrow('failed load');
      await expect(i18n2.load('es')).rejects.toThrow('failed load');
      expect(called).toBe(2);
    });

    test('tl and hasAsync load locale before execution', async () => {
      const i18n = createI18n({
        loaders: {
          es: async () => ({ greeting: 'Hola, {name}!' }),
        },
      });

      expect(await i18n.tl('greeting', { name: 'Carlos' }, { locale: 'es' })).toBe('Hola, Carlos!');
      expect(await i18n.hasAsync('greeting', 'es')).toBe(true);
      expect(await i18n.hasAsync('missing', 'es')).toBe(false);
    });

    test('tl falls back silently when loader fails', async () => {
      const i18n = createI18n({
        loaders: {
          es: async () => {
            throw new Error('failed');
          },
        },
      });

      expect(await i18n.tl('key', undefined, { locale: 'es' })).toBe('key');
    });
  });

  describe('Namespace', () => {
    test('creates namespaced translator with vars and options', () => {
      const i18n = createI18n({
        messages: {
          en: {
            'admin.greeting': 'Hello, admin!',
            'app.welcome': 'Welcome, {name}!',
            'user.greeting': 'Hello, user!',
          },
          fr: { 'app.welcome': 'Bienvenue, {name}!' },
        },
      });

      const admin = i18n.namespace('admin');
      const user = i18n.namespace('user');
      const app = i18n.namespace('app');

      expect(admin.t('greeting')).toBe('Hello, admin!');
      expect(user.t('greeting')).toBe('Hello, user!');
      expect(app.t('welcome', { name: 'Frank' })).toBe('Welcome, Frank!');
      expect(app.t('welcome', { name: 'François' }, { locale: 'fr' })).toBe('Bienvenue, François!');
    });

    test('namespaced tl works with loaders', async () => {
      const i18n = createI18n({
        loaders: {
          es: async () => ({ 'app.greeting': 'Hola' }),
        },
      });

      const app = i18n.namespace('app');
      expect(await app.tl('greeting', undefined, { locale: 'es' })).toBe('Hola');
    });
  });

  describe('Subscriptions', () => {
    test('subscribes to locale changes and message updates', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn();

      i18n.subscribe(handler);
      expect(handler).toHaveBeenCalledWith('en'); // Initial call

      i18n.setLocale('fr');
      expect(handler).toHaveBeenCalledWith('fr'); // Called with new locale
      expect(handler).toHaveBeenCalledTimes(2);

      handler.mockClear();
      i18n.setLocale('fr'); // Same locale, no new call
      expect(handler).not.toHaveBeenCalled();

      i18n.add('fr', { hello: 'Bonjour' }); // Add to current locale
      expect(handler).toHaveBeenCalledWith('fr');
    });

    test('unsubscribes and handles subscriber errors', () => {
      const i18n = createI18n();
      const handler = vi.fn();
      const errorHandler = vi.fn(() => {
        throw new Error('handler error');
      });

      const unsubscribe = i18n.subscribe(handler);
      i18n.subscribe(errorHandler);

      handler.mockClear();
      unsubscribe();
      i18n.setLocale('fr');
      expect(handler).not.toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalled(); // Error doesn't break other handlers
    });
  });

  describe('Formatting Helpers', () => {
    test('formats numbers with options and locale', () => {
      const i18n = createI18n({ locale: 'en' });

      expect(i18n.number(1234.56)).toContain('1,234');
      expect(i18n.number(99.99, { currency: 'USD', style: 'currency' })).toContain('99.99');
      expect(i18n.number(1234.56, undefined, 'de')).toContain('1');
    });

    test('formats dates with options and handles timestamps', () => {
      const i18n = createI18n({ locale: 'en' });
      const date = new Date('2024-01-15');
      const timestamp = date.getTime();

      expect(i18n.date(date)).toContain('2024');
      expect(i18n.date(timestamp)).toContain('2024');
      expect(i18n.date(date, { dateStyle: 'short' })).toMatch(/(2024|1\/15\/24)/);
      expect(i18n.date(date, undefined, 'fr')).toContain('2024');
    });

    test('handles format errors gracefully', () => {
      const i18n = createI18n({ locale: 'en' });
      // biome-ignore lint/suspicious/noExplicitAny: Testing error handling
      expect(i18n.number(1234.56, { style: 'currency' as any })).toBe('1234.56');
      expect(i18n.date(new Date('2024-01-15'))).toBeTruthy();
    });
  });

  describe('Locale Chain and Fallbacks', () => {
    test('uses locale variant fallback (en-US -> en)', () => {
      const i18n = createI18n({
        locale: 'en-US',
        messages: { en: { hello: 'Hello (en)' } },
      });

      expect(i18n.t('hello')).toBe('Hello (en)');
    });

    test('builds correct fallback chain and clears cache', () => {
      const i18n = createI18n({
        fallback: ['de', 'en'],
        locale: 'de-CH',
        messages: {
          de: { a: 'A (de)', b: 'B (de)' },
          'de-CH': { a: 'A (de-CH)' },
          en: { a: 'A (en)', b: 'B (en)', c: 'C (en)' },
        },
      });

      expect(i18n.t('a')).toBe('A (de-CH)');
      expect(i18n.t('b')).toBe('B (de)');
      expect(i18n.t('c')).toBe('C (en)');

      // Cache should be cleared on locale change
      i18n.setLocale('en');
      expect(i18n.t('a')).toBe('A (en)');
    });
  });

  describe('Edge Cases', () => {
    test('handles various value types in interpolation', () => {
      const i18n = createI18n({
        messages: {
          en: {
            bool: 'Active: {active}',
            date: 'Date: {date}',
            deep: '{a.b.c.d}',
            nullUndef: '{a} {b}',
          },
        },
      });

      expect(i18n.t('nullUndef', { a: null, b: undefined })).toBe(' ');
      expect(i18n.t('bool', { active: true })).toBe('Active: true');
      expect(i18n.t('bool', { active: false })).toBe('Active: false');
      expect(i18n.t('date', { date: new Date('2024-01-15') })).toContain('2024');
      expect(i18n.t('deep', { a: { b: { c: { d: 'deep' } } } })).toBe('deep');
    });

    test('handles special message keys and empty strings', () => {
      const i18n = createI18n({
        messages: {
          en: {
            empty: '',
            'special-key_123': 'value',
          },
        },
      });

      expect(i18n.t('empty')).toBe('');
      expect(i18n.t('special-key_123')).toBe('value');
    });
  });
});
