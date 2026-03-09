import { createI18n, type Messages } from './i18nit';

describe('i18nit', () => {
  // ----------------------------------------------------------------
  // Initialization
  // ----------------------------------------------------------------
  describe('Initialization', () => {
    test('defaults locale to "en"', () => {
      const i18n = createI18n();
      expect(i18n.locale).toBe('en');
    });

    test('accepts config: locale, fallback, messages', () => {
      const i18n = createI18n({
        locale: 'fr',
        fallback: 'en',
        messages: {
          en: { hello: 'Hello' },
          fr: { hello: 'Bonjour' },
        } satisfies Record<string, Messages>,
      });
      expect(i18n.locale).toBe('fr');
      expect(i18n.t('hello')).toBe('Bonjour');
    });
  });

  // ----------------------------------------------------------------
  // Translation
  // ----------------------------------------------------------------
  describe('Translation', () => {
    test('resolves flat keys and deeply nested message shapes', () => {
      const i18n = createI18n({
        messages: {
          en: {
            title: 'My App',
            app: {
              user: {
                greeting: 'Hello, {name}!',
                settings: 'Settings',
              },
            },
          },
        },
      });

      expect(i18n.t('title')).toBe('My App');
      expect(i18n.t('app.user.settings')).toBe('Settings');
      expect(i18n.t('app.user.greeting', { name: 'Alice' })).toBe('Hello, Alice!');
    });

    test('returns the key when no translation is found — flat or dot-path', () => {
      // createI18n<Messages> widens T so FlatKeys<T> = never and t() accepts string
      const i18n = createI18n<Messages>({ messages: { en: { exists: 'yes' } } });

      expect(i18n.t('missing')).toBe('missing');
      expect(i18n.t('nested.missing.key')).toBe('nested.missing.key');
    });

    test('returns an empty string when the message value is an empty string', () => {
      const i18n = createI18n({ messages: { en: { empty: '' } } });
      expect(i18n.t('empty')).toBe('');
    });
  });

  // ----------------------------------------------------------------
  // Interpolation
  // ----------------------------------------------------------------
  describe('Interpolation', () => {
    test('substitutes simple, nested-object, and bracket-notation variables', () => {
      const i18n = createI18n({
        messages: {
          en: {
            simple: 'Hello, {name}!',
            nested: 'By {user.name}, age {user.profile.age}',
            index: 'First tag: {tags[0]}',
          },
        },
      });

      expect(i18n.t('simple', { name: 'Alice' })).toBe('Hello, Alice!');
      expect(i18n.t('nested', { user: { name: 'Bob', profile: { age: 30 } } })).toBe('By Bob, age 30');
      expect(i18n.t('index', { tags: ['js', 'ts'] })).toBe('First tag: js');
    });

    test('replaces null / undefined / out-of-bounds references with empty string', () => {
      const i18n = createI18n({
        messages: {
          en: {
            msg: '{a} and {b}',
            oob: 'Item: {items[5]}',
          },
        },
      });

      expect(i18n.t('msg', { a: null, b: undefined })).toBe(' and ');
      expect(i18n.t('oob', { items: ['only one'] })).toBe('Item: ');
    });

    test('auto-formats number variables via Intl.NumberFormat', () => {
      const i18n = createI18n({
        locale: 'en',
        messages: { en: { price: 'Price: {amount}' } },
      });

      expect(i18n.t('price', { amount: 1234.56 })).toContain('1,234');
    });

    test('formats arrays: default comma join, index access, length, and custom separator', () => {
      const i18n = createI18n({
        messages: {
          en: {
            list: '{items}',
            first: '{items[0]}',
            count: '{items.length} items',
            dash: '{items| - }',
          },
        },
      });

      const items = ['A', 'B', 'C'];
      expect(i18n.t('list', { items })).toBe('A, B, C');
      expect(i18n.t('first', { items })).toBe('A');
      expect(i18n.t('count', { items })).toBe('3 items');
      expect(i18n.t('dash', { items })).toBe('A - B - C');
    });

    test('formats arrays with locale-aware "and" and "or" list conjunctions', () => {
      const i18n = createI18n({
        locale: 'en',
        messages: {
          en: { and: '{x|and}', or: '{x|or}' },
          es: { and: '{x|and}', or: '{x|or}' },
          fr: { and: '{x|and}', or: '{x|or}' },
          de: { and: '{x|and}', or: '{x|or}' },
        } satisfies Record<string, Messages>,
      });

      // English — Oxford comma
      expect(i18n.t('and', { x: ['A', 'B', 'C'] })).toBe('A, B, and C');
      expect(i18n.t('or', { x: ['A', 'B', 'C'] })).toBe('A, B, or C');

      // Spanish
      i18n.locale = 'es';
      expect(i18n.t('and', { x: ['A', 'B', 'C'] })).toBe('A, B y C');
      expect(i18n.t('or', { x: ['A', 'B', 'C'] })).toBe('A, B o C');

      // French
      i18n.locale = 'fr';
      expect(i18n.t('and', { x: ['A', 'B', 'C'] })).toBe('A, B et C');
      expect(i18n.t('or', { x: ['A', 'B', 'C'] })).toBe('A, B ou C');

      // German
      i18n.locale = 'de';
      expect(i18n.t('and', { x: ['A', 'B', 'C'] })).toBe('A, B und C');
      expect(i18n.t('or', { x: ['A', 'B', 'C'] })).toBe('A, B oder C');
    });

    test('falls back gracefully when locale is unsupported by Intl.ListFormat', () => {
      const i18n = createI18n({
        locale: 'xx-YY',
        messages: { 'xx-YY': { msg: '{names|and}' } },
      });

      expect(i18n.t('msg', { names: ['Alice', 'Bob'] })).toBe('Alice and Bob');
      expect(i18n.t('msg', { names: ['Alice', 'Bob', 'Charlie'] })).toBe('Alice, Bob, and Charlie');
    });
  });

  // ----------------------------------------------------------------
  // Pluralization
  // ----------------------------------------------------------------
  describe('Pluralization', () => {
    test('selects English plural forms (zero / one / other)', () => {
      const i18n = createI18n({
        messages: {
          en: { items: { zero: 'No items', one: 'One item', other: '{count} items' } },
        },
      });

      expect(i18n.t('items', { count: 0 })).toBe('No items');
      expect(i18n.t('items', { count: 1 })).toBe('One item');
      expect(i18n.t('items', { count: 5 })).toBe('5 items');
    });

    test('selects locale-specific forms — French (0–1 = one) and Arabic (6 forms)', () => {
      const fr = createI18n({
        locale: 'fr',
        messages: { fr: { n: { one: 'un', other: '{count} autres' } } },
      });

      expect(fr.t('n', { count: 0 })).toBe('un'); // fr treats 0 as "one"
      expect(fr.t('n', { count: 1 })).toBe('un');
      expect(fr.t('n', { count: 2 })).toBe('2 autres');

      const ar = createI18n({
        locale: 'ar',
        messages: {
          ar: {
            n: { zero: 'صفر', one: 'واحد', two: 'اثنان', few: 'عدة', many: 'كثيرة', other: 'أخرى' },
          },
        },
      });

      expect(ar.t('n', { count: 0 })).toBe('صفر');
      expect(ar.t('n', { count: 1 })).toBe('واحد');
      expect(ar.t('n', { count: 2 })).toBe('اثنان');
      expect(ar.t('n', { count: 5 })).toBe('عدة');
      expect(ar.t('n', { count: 15 })).toBe('كثيرة');
    });

    test('falls back to "other" when the matched plural form is absent', () => {
      const i18n = createI18n({ messages: { en: { n: { other: '{count} items' } } } });
      expect(i18n.t('n', { count: 1 })).toBe('1 items');
    });
  });

  // ----------------------------------------------------------------
  // Locale & Fallbacks
  // ----------------------------------------------------------------
  describe('Locale & Fallbacks', () => {
    test('locale property is gettable and settable', () => {
      const i18n = createI18n({ locale: 'en' });
      expect(i18n.locale).toBe('en');
      i18n.locale = 'fr';
      expect(i18n.locale).toBe('fr');
    });

    test('setting the same locale is a no-op (no subscriber notification)', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn();
      i18n.subscribe(handler);
      handler.mockClear();

      i18n.locale = 'en';
      expect(handler).not.toHaveBeenCalled();
    });

    test('resolves through a chain of configured fallbacks', () => {
      const i18n = createI18n<Messages>({
        locale: 'es',
        fallback: ['fr', 'en'],
        messages: {
          en: { a: 'A(en)', b: 'B(en)', c: 'C(en)' },
          es: { a: 'A(es)' },
          fr: { a: 'A(fr)', b: 'B(fr)' },
        },
      });

      expect(i18n.t('a')).toBe('A(es)'); // primary
      expect(i18n.t('b')).toBe('B(fr)'); // first fallback
      expect(i18n.t('c')).toBe('C(en)'); // second fallback
    });

    test('auto-falls back to language root from locale variant (en-US → en)', () => {
      const i18n = createI18n({
        locale: 'en-US',
        messages: {
          en: { hello: 'Hello (en)' },
          'en-US': { greeting: 'Howdy!' },
        },
      });

      expect(i18n.t('greeting')).toBe('Howdy!'); // exact match
      expect(i18n.t('hello')).toBe('Hello (en)'); // root fallback
    });
  });

  // ----------------------------------------------------------------
  // Message Management
  // ----------------------------------------------------------------
  describe('Message Management', () => {
    test('add() deep-merges without overwriting sibling keys', () => {
      // Messages type keeps t() untyped so dynamically added keys don't need casts
      const i18n = createI18n<Messages>({
        messages: { en: { user: { greeting: 'Hello', farewell: 'Goodbye' } } },
      });

      i18n.add('en', { user: { title: 'Profile' } });

      expect(i18n.t('user.greeting')).toBe('Hello');
      expect(i18n.t('user.farewell')).toBe('Goodbye');
      expect(i18n.t('user.title')).toBe('Profile');
    });

    test('replace() swaps the entire catalog for a locale', () => {
      // Messages type keeps t() untyped so post-replace keys don't need casts
      const i18n = createI18n<Messages>({
        messages: { en: { hello: 'Hello', goodbye: 'Goodbye' } },
      });

      i18n.replace('en', { greeting: 'Greetings' });

      expect(i18n.t('hello')).toBe('hello'); // removed
      expect(i18n.t('greeting')).toBe('Greetings');
    });

    test('has() and hasLocale() check key and locale presence', () => {
      const i18n = createI18n({
        messages: {
          en: { hello: 'Hello' },
          fr: { bonjour: 'Bonjour' },
        } satisfies Record<string, Messages>,
      });

      expect(i18n.hasLocale('en')).toBe(true);
      expect(i18n.hasLocale('de')).toBe(false);
      expect(i18n.has('hello')).toBe(true);
      expect(i18n.has('hello', 'fr')).toBe(false); // key exists in en, not fr
      expect(i18n.has('bonjour', 'fr')).toBe(true);
      expect(i18n.has('missing')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Async Loading
  // ----------------------------------------------------------------
  describe('Async Loading', () => {
    test('load() fetches messages and deduplicates concurrent calls', async () => {
      let calls = 0;
      const i18n = createI18n({
        loaders: {
          es: async () => {
            calls++;
            await new Promise((r) => setTimeout(r, 10));
            return { hello: 'Hola' };
          },
        },
      });

      await Promise.all([i18n.load('es'), i18n.load('es'), i18n.load('es')]);
      expect(calls).toBe(1);
      expect(i18n.scoped('es').t('hello')).toBe('Hola'); // ScopedI18n.t accepts string
    });

    test('addLoader() registers a loader dynamically', async () => {
      const i18n = createI18n();
      i18n.addLoader('de', async () => ({ hello: 'Hallo' }));
      await i18n.load('de');
      expect(i18n.scoped('de').t('hello')).toBe('Hallo'); // ScopedI18n.t accepts string
    });

    test('load() is a no-op when the catalog is already populated', async () => {
      let calls = 0;
      const i18n = createI18n({
        messages: { es: { hello: 'Hola' } },
        loaders: {
          es: async () => {
            calls++;
            return { hello: 'Overwritten' };
          },
        },
      });

      await i18n.load('es'); // catalog already populated via messages config
      expect(calls).toBe(0);
      expect(i18n.scoped('es').t('hello')).toBe('Hola'); // ScopedI18n.t accepts string
    });

    test('load() propagates errors and allows retry', async () => {
      let calls = 0;
      const i18n = createI18n({
        loaders: {
          es: async () => {
            calls++;
            throw new Error('network error');
          },
        },
      });

      await expect(i18n.load('es')).rejects.toThrow('network error');
      await expect(i18n.load('es')).rejects.toThrow('network error');
      expect(calls).toBe(2);
    });
  });

  // ----------------------------------------------------------------
  // Namespace
  // ----------------------------------------------------------------
  describe('Namespace', () => {
    test('namespace().t() scopes keys to a prefix, supporting nested keys and interpolation', () => {
      const i18n = createI18n({
        messages: {
          en: {
            app: {
              welcome: 'Welcome, {name}!',
              nav: { home: 'Home', about: 'About' },
            },
          },
        },
      });

      const app = i18n.namespace('app');
      expect(app.t('welcome', { name: 'Alice' })).toBe('Welcome, Alice!');
      expect(app.t('nav.home')).toBe('Home');
      expect(app.t('nav.about')).toBe('About');
      expect(app.t('missing')).toBe('app.missing'); // returns full prefixed key
    });

    test('namespace().has() checks key existence within the scope', () => {
      const i18n = createI18n({
        messages: { en: { user: { greeting: 'Hello' } } },
      });

      const ns = i18n.namespace('user');
      expect(ns.has('greeting')).toBe(true);
      expect(ns.has('missing')).toBe(false);
    });

    test('scoped().namespace() combines locale scope with key scope', () => {
      const i18n = createI18n({
        messages: {
          en: { app: { welcome: 'Welcome, {name}!' } },
          fr: { app: { welcome: 'Bienvenue, {name}!' } },
        } satisfies Record<string, Messages>,
      });

      expect(i18n.scoped('fr').namespace('app').t('welcome', { name: 'François' })).toBe('Bienvenue, François!');
    });
  });

  // ----------------------------------------------------------------
  // Scoped
  // ----------------------------------------------------------------
  describe('Scoped', () => {
    test('scoped() translates in the given locale without changing the active locale', () => {
      const i18n = createI18n({
        locale: 'en',
        messages: {
          en: { msg: 'Hello' },
          fr: { msg: 'Bonjour' },
        } satisfies Record<string, Messages>,
      });

      expect(i18n.scoped('fr').t('msg')).toBe('Bonjour');
      expect(i18n.locale).toBe('en'); // unchanged
    });

    test('scoped() falls back through the locale chain when a key is missing', () => {
      const i18n = createI18n({
        fallback: 'en',
        messages: {
          en: { fallback: 'From English' },
          fr: { greeting: 'Bonjour' },
        } satisfies Record<string, Messages>,
      });

      // 'fallback' key is only in 'en'; scoped('fr') resolves it via the chain
      expect(i18n.scoped('fr').t('fallback')).toBe('From English'); // ScopedI18n.t accepts string
      expect(i18n.scoped('fr').t('greeting')).toBe('Bonjour');
    });

    test('scoped().number() and scoped().date() use the scoped locale', () => {
      const i18n = createI18n({ locale: 'en' });
      const de = i18n.scoped('de');

      expect(de.number(1234567)).toContain('1');
      expect(de.date(new Date('2024-01-15'))).toContain('2024');
    });
  });

  // ----------------------------------------------------------------
  // Subscriptions
  // ----------------------------------------------------------------
  describe('Subscriptions', () => {
    test('subscribe() fires immediately with the current locale and on each locale change', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn();

      i18n.subscribe(handler);
      expect(handler).toHaveBeenCalledWith('en');

      i18n.locale = 'fr';
      expect(handler).toHaveBeenCalledWith('fr');
      expect(handler).toHaveBeenCalledTimes(2);
    });

    test('add() to the active locale notifies; to an inactive locale does not', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn();
      i18n.subscribe(handler);
      handler.mockClear();

      i18n.add('en', { hello: 'Hello' }); // active locale chain → notify
      expect(handler).toHaveBeenCalledTimes(1);

      i18n.add('zh', { hello: '你好' }); // inactive locale → silent
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('unsubscribe() stops future notifications; subscriber errors are swallowed', () => {
      const i18n = createI18n();
      const handler = vi.fn();
      const broken = vi.fn(() => {
        throw new Error('oops');
      });

      const unsub = i18n.subscribe(handler);
      i18n.subscribe(broken);
      handler.mockClear();

      unsub();
      i18n.locale = 'fr';
      expect(handler).not.toHaveBeenCalled();
      expect(broken).toHaveBeenCalled(); // error didn't stop other handlers
    });

    test('dispose() removes all subscribers', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn();
      i18n.subscribe(handler);
      handler.mockClear();

      i18n.dispose();
      i18n.locale = 'fr';
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // Formatting
  // ----------------------------------------------------------------
  describe('Formatting', () => {
    test('number() formats with Intl options and a locale override', () => {
      const i18n = createI18n({ locale: 'en' });

      expect(i18n.number(1234.56)).toContain('1,234');
      expect(i18n.number(99.99, { style: 'currency', currency: 'USD' })).toContain('99.99');
      expect(i18n.number(1234.56, undefined, 'de')).toContain('1'); // de uses . as grouping separator
    });

    test('date() accepts Date or numeric timestamp, respects options and locale override', () => {
      const i18n = createI18n({ locale: 'en' });
      const date = new Date('2024-01-15');

      expect(i18n.date(date)).toContain('2024');
      expect(i18n.date(date.getTime())).toContain('2024'); // numeric timestamp
      expect(i18n.date(date, { dateStyle: 'short' })).toMatch(/(2024|1\/15\/24)/);
      expect(i18n.date(date, undefined, 'fr')).toContain('2024');
    });

    test('number() and date() return a string fallback on Intl errors', () => {
      const i18n = createI18n({ locale: 'en' });
      // biome-ignore lint/suspicious/noExplicitAny: Testing error handling
      expect(i18n.number(1234.56, { style: 'currency' as any })).toBe('1234.56');
      expect(i18n.date(new Date('2024-01-15'))).toBeTruthy();
    });
  });
});
