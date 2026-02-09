import { createI18n } from './i18nit';

describe('i18nit', () => {
  describe('initialization', () => {
    test('creates instance with default config', () => {
      const i18n = createI18n();
      expect(i18n).toBeDefined();
      expect(i18n.getLocale()).toBe('en');
    });

    test('creates instance with custom locale', () => {
      const i18n = createI18n({ locale: 'fr' });
      expect(i18n.getLocale()).toBe('fr');
    });

    test('creates instance with messages', () => {
      const i18n = createI18n({
        messages: {
          en: { hello: 'Hello' },
          fr: { hello: 'Bonjour' },
        },
      });
      expect(i18n.t('hello')).toBe('Hello');
      expect(i18n.t('hello', undefined, { locale: 'fr' })).toBe('Bonjour');
    });

    test('creates instance with fallback locale', () => {
      const i18n = createI18n({
        fallback: 'en',
        locale: 'fr',
        messages: {
          en: { hello: 'Hello', world: 'World' },
          fr: { hello: 'Bonjour' },
        },
      });
      expect(i18n.t('hello')).toBe('Bonjour');
      expect(i18n.t('world')).toBe('World'); // falls back to en
    });

    test('creates instance with multiple fallback locales', () => {
      const i18n = createI18n({
        fallback: ['fr', 'en'],
        locale: 'es',
        messages: {
          en: { goodbye: 'Goodbye', hello: 'Hello', world: 'World' },
          es: { hello: 'Hola' },
          fr: { hello: 'Bonjour', world: 'Monde' },
        },
      });
      expect(i18n.t('hello')).toBe('Hola');
      expect(i18n.t('world')).toBe('Monde'); // falls back to fr
      expect(i18n.t('goodbye')).toBe('Goodbye'); // falls back to en
    });

    test('creates instance with custom missingKey handler', () => {
      const i18n = createI18n({
        missingKey: (key, locale) => `[${locale}:${key}]`,
      });
      expect(i18n.t('nonexistent')).toBe('[en:nonexistent]');
    });

    test('creates instance with escape enabled', () => {
      const i18n = createI18n({
        escape: true,
        messages: {
          en: { html: '<script>alert("xss")</script>' },
        },
      });
      expect(i18n.t('html')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    test('creates instance with loaders', () => {
      const i18n = createI18n({
        loaders: {
          es: async () => ({ hello: 'Hola' }),
        },
      });
      expect(i18n.hasLocale('es')).toBe(false); // not loaded yet
    });
  });

  describe('basic translation', () => {
    test('translates simple string', () => {
      const i18n = createI18n({
        messages: { en: { greeting: 'Hello, World!' } },
      });
      expect(i18n.t('greeting')).toBe('Hello, World!');
    });

    test('returns key for missing translation', () => {
      const i18n = createI18n();
      expect(i18n.t('nonexistent')).toBe('nonexistent');
    });

    test('uses fallback when provided', () => {
      const i18n = createI18n();
      expect(i18n.t('nonexistent', undefined, { fallback: 'Custom fallback' })).toBe('Custom fallback');
    });

    test('translates with specific locale', () => {
      const i18n = createI18n({
        messages: {
          en: { greeting: 'Hello' },
          fr: { greeting: 'Bonjour' },
        },
      });
      expect(i18n.t('greeting', undefined, { locale: 'fr' })).toBe('Bonjour');
    });
  });

  describe('interpolation', () => {
    test('interpolates simple variables', () => {
      const i18n = createI18n({
        messages: { en: { greeting: 'Hello, {name}!' } },
      });
      expect(i18n.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
    });

    test('interpolates multiple variables', () => {
      const i18n = createI18n({
        messages: { en: { message: '{greeting}, {name}! You have {count} messages.' } },
      });
      expect(i18n.t('message', { count: 5, greeting: 'Hi', name: 'Bob' })).toBe('Hi, Bob! You have 5 messages.');
    });

    test('interpolates nested object properties', () => {
      const i18n = createI18n({
        messages: { en: { 'user.name': 'Name: {user.name}' } },
      });
      expect(i18n.t('user.name', { user: { name: 'Charlie' } })).toBe('Name: Charlie');
    });

    test('interpolates array indices with bracket notation', () => {
      const i18n = createI18n({
        messages: { en: { 'friends[0]': 'First friend: {friends[0].name}' } },
      });
      expect(i18n.t('friends[0]', { friends: [{ name: 'Dave' }] })).toBe('First friend: Dave');
    });

    test('handles missing interpolation values (empty by default)', () => {
      const i18n = createI18n({
        messages: { en: { greeting: 'Hello, {name}!' } },
      });
      expect(i18n.t('greeting')).toBe('Hello, !');
    });

    test('preserves missing interpolation placeholders when configured', () => {
      const i18n = createI18n({
        messages: { en: { greeting: 'Hello, {name}!' } },
        missingVar: 'preserve',
      });
      expect(i18n.t('greeting')).toBe('Hello, {name}!');
    });

    test('throws error for missing interpolation when configured', () => {
      const i18n = createI18n({
        messages: { en: { greeting: 'Hello, {name}!' } },
        missingVar: 'error',
      });
      expect(() => i18n.t('greeting')).toThrow('Missing variable: name');
    });

    test('formats numbers in interpolation with locale', () => {
      const i18n = createI18n({
        locale: 'de',
        messages: { de: { price: 'Preis: {amount}' } },
      });
      expect(i18n.t('price', { amount: 1234.56 })).toContain('1');
    });

    test('escapes HTML in interpolated values when escape is true', () => {
      const i18n = createI18n({
        messages: { en: { message: 'Message: {content}' } },
      });
      expect(i18n.t('message', { content: '<script>xss</script>' }, { escape: true })).toBe(
        'Message: &lt;script&gt;xss&lt;/script&gt;',
      );
    });

    test('does not escape when escape is false', () => {
      const i18n = createI18n({
        messages: { en: { message: 'Message: {content}' } },
      });
      expect(i18n.t('message', { content: '<b>bold</b>' }, { escape: false })).toBe('Message: <b>bold</b>');
    });
  });

  describe('pluralization', () => {
    test('handles basic plural forms (English)', () => {
      const i18n = createI18n({
        messages: {
          en: {
            items: { one: 'One item', other: '{count} items' },
          },
        },
      });
      expect(i18n.t('items', { count: 1 })).toBe('One item');
      expect(i18n.t('items', { count: 0 })).toBe('0 items');
      expect(i18n.t('items', { count: 5 })).toBe('5 items');
    });

    test('handles plural with zero form', () => {
      const i18n = createI18n({
        messages: {
          en: {
            messages: { one: 'One message', other: '{count} messages', zero: 'No messages' },
          },
        },
      });
      expect(i18n.t('messages', { count: 0 })).toBe('No messages');
      expect(i18n.t('messages', { count: 1 })).toBe('One message');
      expect(i18n.t('messages', { count: 3 })).toBe('3 messages');
    });

    test('respects empty zero template', () => {
      const i18n = createI18n({
        messages: {
          en: {
            items: { other: '{count} items', zero: '' },
          },
        },
      });
      expect(i18n.t('items', { count: 0 })).toBe('');
    });

    test('handles French plurals (0-1 vs other)', () => {
      const i18n = createI18n({
        locale: 'fr',
        messages: {
          fr: {
            items: { one: 'Un article', other: '{count} articles' },
          },
        },
      });
      expect(i18n.t('items', { count: 0 })).toBe('Un article');
      expect(i18n.t('items', { count: 1 })).toBe('Un article');
      expect(i18n.t('items', { count: 2 })).toBe('2 articles');
    });

    test('handles Arabic plurals (complex rules)', () => {
      const i18n = createI18n({
        locale: 'ar',
        messages: {
          ar: {
            items: {
              few: 'عدة عناصر',
              many: 'عناصر كثيرة',
              one: 'عنصر واحد',
              other: 'عناصر',
              two: 'عنصران',
              zero: 'لا عناصر',
            },
          },
        },
      });
      expect(i18n.t('items', { count: 0 })).toBe('لا عناصر');
      expect(i18n.t('items', { count: 1 })).toBe('عنصر واحد');
      expect(i18n.t('items', { count: 2 })).toBe('عنصران');
      expect(i18n.t('items', { count: 5 })).toBe('عدة عناصر');
      expect(i18n.t('items', { count: 15 })).toBe('عناصر كثيرة');
      expect(i18n.t('items', { count: 100 })).toBe('لا عناصر');
    });

    test('falls back to other when specific plural form is missing', () => {
      const i18n = createI18n({
        messages: {
          en: {
            items: { other: '{count} items' },
          },
        },
      });
      expect(i18n.t('items', { count: 0 })).toBe('0 items');
      expect(i18n.t('items', { count: 1 })).toBe('1 items');
    });
  });

  describe('message functions', () => {
    test('calls message function with vars and helpers', () => {
      const i18n = createI18n({
        messages: {
          en: {
            dynamic: (vars) => `Hello, ${vars.name}!`,
          },
        },
      });
      expect(i18n.t('dynamic', { name: 'Eve' })).toBe('Hello, Eve!');
    });

    test('provides number helper in message function', () => {
      const i18n = createI18n({
        locale: 'en',
        messages: {
          en: {
            price: (vars, helpers) =>
              `Price: ${helpers.number(vars.amount as number, { currency: 'USD', style: 'currency' })}`,
          },
        },
      });
      expect(i18n.t('price', { amount: 99.99 })).toContain('99.99');
    });

    test('provides date helper in message function', () => {
      const i18n = createI18n({
        locale: 'en',
        messages: {
          en: {
            event: (vars, helpers) => `Event on ${helpers.date(vars.date as Date, { dateStyle: 'short' })}`,
          },
        },
      });
      const date = new Date('2024-01-15');
      const result = i18n.t('event', { date });
      expect(result).toMatch(/(2024|1\/15\/24)/); // Accept either a full year or short format
    });

    test('returns empty string when message function throws', () => {
      const i18n = createI18n({
        messages: {
          en: {
            error: () => {
              throw new Error('Oops');
            },
          },
        },
      });
      expect(i18n.t('error')).toBe('');
    });

    test('escapes function result when escape is true', () => {
      const i18n = createI18n({
        messages: {
          en: {
            html: () => '<b>bold</b>',
          },
        },
      });
      expect(i18n.t('html', {}, { escape: true })).toBe('&lt;b&gt;bold&lt;/b&gt;');
    });
  });

  describe('locale management', () => {
    test('gets current locale', () => {
      const i18n = createI18n({ locale: 'de' });
      expect(i18n.getLocale()).toBe('de');
    });

    test('sets locale', () => {
      const i18n = createI18n({ locale: 'en' });
      i18n.setLocale('fr');
      expect(i18n.getLocale()).toBe('fr');
    });

    test('does not trigger changes when setting same locale', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn();
      i18n.subscribe(handler);
      handler.mockClear();
      i18n.setLocale('en');
      expect(handler).not.toHaveBeenCalled();
    });

    test('checks if locale exists', () => {
      const i18n = createI18n({
        messages: { en: {}, fr: {} },
      });
      expect(i18n.hasLocale('en')).toBe(true);
      expect(i18n.hasLocale('fr')).toBe(true);
      expect(i18n.hasLocale('de')).toBe(false);
    });

    test('checks if key exists', () => {
      const i18n = createI18n({
        messages: { en: { hello: 'Hello' } },
      });
      expect(i18n.has('hello')).toBe(true);
      expect(i18n.has('goodbye')).toBe(false);
    });

    test('checks if key exists in specific locale', () => {
      const i18n = createI18n({
        messages: {
          en: { hello: 'Hello' },
          fr: { bonjour: 'Bonjour' },
        },
      });
      expect(i18n.has('hello', 'en')).toBe(true);
      expect(i18n.has('hello', 'fr')).toBe(false);
      expect(i18n.has('bonjour', 'fr')).toBe(true);
    });
  });

  describe('message management', () => {
    test('adds messages to locale', () => {
      const i18n = createI18n();
      i18n.add('en', { hello: 'Hello' });
      expect(i18n.t('hello')).toBe('Hello');
    });

    test('adds messages merges with existing', () => {
      const i18n = createI18n({
        messages: { en: { hello: 'Hello' } },
      });
      i18n.add('en', { goodbye: 'Goodbye' });
      expect(i18n.t('hello')).toBe('Hello');
      expect(i18n.t('goodbye')).toBe('Goodbye');
    });

    test('sets messages replaces existing', () => {
      const i18n = createI18n({
        messages: { en: { goodbye: 'Goodbye', hello: 'Hello' } },
      });
      i18n.set('en', { welcome: 'Welcome' });
      expect(i18n.t('hello')).toBe('hello'); // no longer exists
      expect(i18n.t('welcome')).toBe('Welcome');
    });

    test('gets messages for locale', () => {
      const i18n = createI18n({
        messages: { en: { hello: 'Hello' } },
      });
      expect(i18n.getMessages('en')).toEqual({ hello: 'Hello' });
      expect(i18n.getMessages('fr')).toBeUndefined();
    });
  });

  describe('async/lazy loading', () => {
    test('loads messages asynchronously', async () => {
      const i18n = createI18n({
        loaders: {
          es: async () => ({ hello: 'Hola' }),
        },
      });
      await i18n.load('es');
      expect(i18n.t('hello', undefined, { locale: 'es' })).toBe('Hola');
    });

    test('registers loader dynamically', async () => {
      const i18n = createI18n();
      i18n.register('de', async () => ({ hello: 'Hallo' }));
      await i18n.load('de');
      expect(i18n.t('hello', undefined, { locale: 'de' })).toBe('Hallo');
    });

    test('does not load if locale already loaded', async () => {
      let loadCount = 0;
      const i18n = createI18n({
        loaders: {
          es: async () => {
            loadCount++;
            return { hello: 'Hola' };
          },
        },
      });
      await i18n.load('es');
      await i18n.load('es');
      expect(loadCount).toBe(1);
    });

    test('handles concurrent load requests', async () => {
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
    });

    test('clears loading promise on failure and allows retry', async () => {
      let called = 0;
      const i18n = createI18n({
        loaders: {
          es: async () => {
            called++;
            throw new Error('failed load');
          },
        },
      });
      await expect(i18n.load('es')).rejects.toThrow('failed load');
      await expect(i18n.load('es')).rejects.toThrow('failed load');
      expect(called).toBe(2);
    });

    test('tl loads locale before translation', async () => {
      const i18n = createI18n({
        loaders: {
          es: async () => ({ hello: 'Hola' }),
        },
      });
      expect(await i18n.tl('hello', undefined, { locale: 'es' })).toBe('Hola');
    });

    test('tl with vars and options', async () => {
      const i18n = createI18n({
        loaders: {
          es: async () => ({ greeting: 'Hola, {name}!' }),
        },
      });
      expect(await i18n.tl('greeting', { name: 'Carlos' }, { locale: 'es' })).toBe('Hola, Carlos!');
    });

    test('hasAsync loads locale before checking', async () => {
      const i18n = createI18n({
        loaders: {
          es: async () => ({ hello: 'Hola' }),
        },
      });
      expect(await i18n.hasAsync('hello', 'es')).toBe(true);
      expect(await i18n.hasAsync('goodbye', 'es')).toBe(false);
    });

    test('tl returns missing key when loader fails', async () => {
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

  describe('namespace', () => {
    test('creates namespaced translator', () => {
      const i18n = createI18n({
        messages: {
          en: {
            'admin.greeting': 'Hello, admin!',
            'user.greeting': 'Hello, user!',
          },
        },
      });
      const user = i18n.namespace('user');
      const admin = i18n.namespace('admin');
      expect(user.t('greeting')).toBe('Hello, user!');
      expect(admin.t('greeting')).toBe('Hello, admin!');
    });

    test('namespaced translator supports vars', () => {
      const i18n = createI18n({
        messages: {
          en: {
            'app.welcome': 'Welcome, {name}!',
          },
        },
      });
      const app = i18n.namespace('app');
      expect(app.t('welcome', { name: 'Frank' })).toBe('Welcome, Frank!');
    });

    test('namespaced translator supports options', () => {
      const i18n = createI18n({
        messages: {
          en: { 'app.hello': 'Hello' },
          fr: { 'app.hello': 'Bonjour' },
        },
      });
      const app = i18n.namespace('app');
      expect(app.t('hello', undefined, { locale: 'fr' })).toBe('Bonjour');
    });

    test('namespaced tl works', async () => {
      const i18n = createI18n({
        loaders: {
          es: async () => ({ 'app.greeting': 'Hola' }),
        },
      });
      const app = i18n.namespace('app');
      expect(await app.tl('greeting', undefined, { locale: 'es' })).toBe('Hola');
    });
  });

  describe('subscriptions', () => {
    test('subscribes to locale changes', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn();
      i18n.subscribe(handler);
      expect(handler).toHaveBeenCalledWith('en'); // initial call
    });

    test('notifies subscribers on locale change', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn();
      i18n.subscribe(handler);
      handler.mockClear();
      i18n.setLocale('fr');
      expect(handler).toHaveBeenCalledWith('fr');
    });

    test('notifies subscribers on add messages', () => {
      const i18n = createI18n();
      const handler = vi.fn();
      i18n.subscribe(handler);
      handler.mockClear();
      i18n.add('en', { hello: 'Hello' });
      expect(handler).toHaveBeenCalledWith('en');
    });

    test('notifies subscribers on set messages', () => {
      const i18n = createI18n();
      const handler = vi.fn();
      i18n.subscribe(handler);
      handler.mockClear();
      i18n.set('en', { hello: 'Hello' });
      expect(handler).toHaveBeenCalledWith('en');
    });

    test('unsubscribes from locale changes', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn();
      const unsubscribe = i18n.subscribe(handler);
      handler.mockClear();
      unsubscribe();
      i18n.setLocale('fr');
      expect(handler).not.toHaveBeenCalled();
    });

    test('handles subscriber errors gracefully', () => {
      const i18n = createI18n({ locale: 'en' });
      const errorHandler = vi.fn(() => {
        throw new Error('handler error');
      });
      const goodHandler = vi.fn();
      i18n.subscribe(errorHandler);
      i18n.subscribe(goodHandler);
      goodHandler.mockClear();
      i18n.setLocale('fr');
      expect(goodHandler).toHaveBeenCalledWith('fr');
    });
  });

  describe('formatting helpers', () => {
    test('formats numbers', () => {
      const i18n = createI18n({ locale: 'en' });
      expect(i18n.number(1234.56)).toContain('1');
      expect(i18n.number(1234.56)).toContain('234');
    });

    test('formats numbers with options', () => {
      const i18n = createI18n({ locale: 'en' });
      const result = i18n.number(99.99, { currency: 'USD', style: 'currency' });
      expect(result).toContain('99.99');
    });

    test('formats numbers with custom locale', () => {
      const i18n = createI18n({ locale: 'en' });
      const result = i18n.number(1234.56, undefined, 'de');
      expect(result).toContain('1');
    });

    test('handles number format errors gracefully', () => {
      const i18n = createI18n({ locale: 'en' });
      // biome-ignore lint/suspicious/noExplicitAny: Testing error handling
      expect(i18n.number(1234.56, { style: 'currency' as any })).toBe('1234.56');
    });

    test('formats dates', () => {
      const i18n = createI18n({ locale: 'en' });
      const date = new Date('2024-01-15');
      expect(i18n.date(date)).toContain('2024');
    });

    test('formats dates with options', () => {
      const i18n = createI18n({ locale: 'en' });
      const date = new Date('2024-01-15');
      const result = i18n.date(date, { dateStyle: 'short' });
      expect(result).toMatch(/(2024|1\/15\/24)/); // Accept either full year or short format
    });

    test('formats timestamp', () => {
      const i18n = createI18n({ locale: 'en' });
      const timestamp = new Date('2024-01-15').getTime();
      expect(i18n.date(timestamp)).toContain('2024');
    });

    test('formats dates with custom locale', () => {
      const i18n = createI18n({ locale: 'en' });
      const date = new Date('2024-01-15');
      const result = i18n.date(date, undefined, 'fr');
      expect(result).toContain('2024');
    });

    test('handles date format errors gracefully', () => {
      const i18n = createI18n({ locale: 'en' });
      const date = new Date('2024-01-15');
      expect(i18n.date(date)).toBeTruthy();
    });
  });

  describe('locale chain and fallbacks', () => {
    test('uses locale variant fallback (en-US -> en)', () => {
      const i18n = createI18n({
        locale: 'en-US',
        messages: {
          en: { hello: 'Hello (en)' },
        },
      });
      expect(i18n.t('hello')).toBe('Hello (en)');
    });

    test('uses configured fallback chain', () => {
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
    });

    test('clears locale chain cache on locale change', () => {
      const i18n = createI18n({
        locale: 'en',
        messages: {
          en: { hello: 'Hello (en)' },
          fr: { hello: 'Bonjour (fr)' },
        },
      });
      expect(i18n.t('hello')).toBe('Hello (en)');
      i18n.setLocale('fr');
      expect(i18n.t('hello')).toBe('Bonjour (fr)');
    });

    test('clears locale chain cache on add messages', () => {
      const i18n = createI18n({
        locale: 'en',
      });
      expect(i18n.t('hello')).toBe('hello');
      i18n.add('en', { hello: 'Hello' });
      expect(i18n.t('hello')).toBe('Hello');
    });
  });

  describe('edge cases', () => {
    test('handles null and undefined in vars', () => {
      const i18n = createI18n({
        messages: { en: { msg: '{a} {b}' } },
      });
      expect(i18n.t('msg', { a: null, b: undefined })).toBe(' ');
    });

    test('handles boolean in vars', () => {
      const i18n = createI18n({
        messages: { en: { msg: 'Active: {active}' } },
      });
      expect(i18n.t('msg', { active: true })).toBe('Active: true');
      expect(i18n.t('msg', { active: false })).toBe('Active: false');
    });

    test('handles Date in vars', () => {
      const i18n = createI18n({
        messages: { en: { msg: 'Date: {date}' } },
      });
      const date = new Date('2024-01-15');
      expect(i18n.t('msg', { date })).toContain('2024');
    });

    test('handles deeply nested paths', () => {
      const i18n = createI18n({
        messages: { en: { msg: '{a.b.c.d}' } },
      });
      expect(i18n.t('msg', { a: { b: { c: { d: 'deep' } } } })).toBe('deep');
    });

    test('handles empty string message', () => {
      const i18n = createI18n({
        messages: { en: { empty: '' } },
      });
      expect(i18n.t('empty')).toBe('');
    });

    test('handles special characters in message keys', () => {
      const i18n = createI18n({
        messages: { en: { 'special-key_123': 'value' } },
      });
      expect(i18n.t('special-key_123')).toBe('value');
    });

    test('t() with only options (no vars)', () => {
      const i18n = createI18n({
        messages: {
          en: { hello: 'Hello' },
          fr: { hello: 'Bonjour' },
        },
      });
      expect(i18n.t('hello', undefined, { locale: 'fr' })).toBe('Bonjour');
    });

    test('handles count in vars and options together', () => {
      const i18n = createI18n({
        messages: {
          en: {
            items: { one: 'One item', other: '{count} items' },
          },
        },
      });
      expect(i18n.t('items', { count: 5 })).toBe('5 items');
    });
  });
});
