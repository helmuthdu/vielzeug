import { createI18n, type I18n, type LocaleChangeEvent, type Messages } from '../';

describe('i18n — core instance', () => {
  // ----------------------------------------------------------------
  // createI18n — factory
  // ----------------------------------------------------------------
  describe('createI18n', () => {
    test('defaults to locale "en" with no config', () => {
      const i18n = createI18n();

      expect(i18n.locale).toBe('en');
    });

    test('accepts locale, fallback, and pre-loaded messages', () => {
      const i18n = createI18n({
        fallback: 'en',
        locale: 'fr',
        messages: {
          en: { hello: 'Hello' },
          fr: { hello: 'Bonjour' },
        },
      });

      expect(i18n.locale).toBe('fr');
      expect(i18n.t('hello')).toBe('Bonjour');
    });
  });

  // ----------------------------------------------------------------
  // t() — translation
  // ----------------------------------------------------------------
  describe('t() — translation', () => {
    test('resolves flat and deeply nested dot-path keys', () => {
      const i18n = createI18n({
        messages: {
          en: {
            app: { user: { greeting: 'Hello, {name}!', settings: 'Settings' } },
            title: 'My App',
          },
        },
      });

      expect(i18n.t('title')).toBe('My App');
      expect(i18n.t('app.user.settings')).toBe('Settings');
      expect(i18n.t('app.user.greeting', { name: 'Alice' })).toBe('Hello, Alice!');
    });

    test('returns the key when no translation is found', () => {
      // createI18n<Messages> widens T so FlatKeys<T> collapses to string
      const i18n = createI18n<Messages>({ messages: { en: { exists: 'yes' } } });

      expect(i18n.t('missing')).toBe('missing');
      expect(i18n.t('nested.missing.key')).toBe('nested.missing.key');
    });

    test('calls onMissing with key and locale; the return value replaces the key fallback', () => {
      const onMissing = vi.fn((key: string) => `[missing: ${key}]`);
      const i18n = createI18n<Messages>({ messages: { en: { exists: 'yes' } }, onMissing });

      expect(i18n.t('missing')).toBe('[missing: missing]'); // key is unchecked — T=Messages opts out of type-safe keys
      expect(onMissing).toHaveBeenCalledWith('missing', 'en');
      expect(i18n.t('exists')).toBe('yes');
      expect(onMissing).toHaveBeenCalledTimes(1);
    });

    test('treats an empty string value as a valid translation', () => {
      const i18n = createI18n({ messages: { en: { empty: '' } } });

      expect(i18n.t('empty')).toBe('');
    });
  });

  // ----------------------------------------------------------------
  // locale property & setLocale()
  // ----------------------------------------------------------------
  describe('locale & setLocale()', () => {
    test('locale is gettable and settable', () => {
      const i18n = createI18n({ locale: 'en' });

      expect(i18n.locale).toBe('en');
      i18n.locale = 'fr';
      expect(i18n.locale).toBe('fr');
    });

    test('setting the same locale is a no-op — subscribers are not notified', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn();

      i18n.subscribe(handler);
      handler.mockClear();

      i18n.locale = 'en';
      expect(handler).not.toHaveBeenCalled();
    });

    test('setLocale() loads messages then switches the locale atomically', async () => {
      const i18n = createI18n({ loaders: { fr: async () => ({ hello: 'Bonjour' }) } });

      await i18n.setLocale('fr');
      expect(i18n.locale).toBe('fr');
      expect(i18n.t('hello')).toBe('Bonjour');
    });

    test('setLocale() with no registered loader still switches the locale without throwing', async () => {
      const i18n = createI18n({ locale: 'en' });

      await i18n.setLocale('de');
      expect(i18n.locale).toBe('de');
    });
  });

  // ----------------------------------------------------------------
  // Fallbacks
  // ----------------------------------------------------------------
  describe('Fallbacks', () => {
    test('resolves through a configured chain of fallback locales', () => {
      const i18n = createI18n<Messages>({
        fallback: ['fr', 'en'],
        locale: 'es',
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

    test('automatically falls back from a locale variant to its language root (en-US → en)', () => {
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

    test('cascades through all BCP47 subtags: sr-Latn-RS → sr-Latn → sr', () => {
      const i18n = createI18n({
        locale: 'sr-Latn-RS',
        messages: {
          sr: { common: 'Serbian' },
          'sr-Latn': { script: 'Latin script' },
          'sr-Latn-RS': { regional: 'Serbia regional' },
        },
      });

      expect(i18n.t('regional')).toBe('Serbia regional'); // exact match
      expect(i18n.t('script')).toBe('Latin script'); // sr-Latn fallback
      expect(i18n.t('common')).toBe('Serbian'); // sr root fallback
    });
  });

  // ----------------------------------------------------------------
  // Message catalog — add() / set() / has() / hasLocale()
  // ----------------------------------------------------------------
  describe('Message catalog', () => {
    test('add() deep-merges into the existing catalog without touching sibling keys', () => {
      const i18n = createI18n<Messages>({
        messages: { en: { user: { farewell: 'Goodbye', greeting: 'Hello' } } },
      });

      i18n.add('en', { user: { title: 'Profile' } });

      expect(i18n.t('user.greeting')).toBe('Hello');
      expect(i18n.t('user.farewell')).toBe('Goodbye');
      expect(i18n.t('user.title')).toBe('Profile');
    });

    test('replace() replaces the entire catalog for that locale', () => {
      const i18n = createI18n<Messages>({ messages: { en: { goodbye: 'Goodbye', hello: 'Hello' } } });

      i18n.replace('en', { greeting: 'Greetings' });

      expect(i18n.t('hello')).toBe('hello'); // old key is gone
      expect(i18n.t('greeting')).toBe('Greetings');
    });

    test('replace() stores a shallow copy — mutations after the call have no effect', () => {
      const i18n = createI18n<Messages>();
      const msgs: Messages = { hello: 'Hello' };

      i18n.replace('en', msgs);
      msgs.hello = 'Mutated'; // Messages has a string index signature — no cast needed
      expect(i18n.t('hello')).toBe('Hello');
    });

    test('replace() deep-clones — nested object mutations after the call have no effect', () => {
      const i18n = createI18n<Messages>();
      const msgs: Messages = { user: { name: 'Alice' } };

      i18n.replace('en', msgs);
      (msgs.user as Record<string, string>).name = 'Mutated';
      expect(i18n.t('user.name')).toBe('Alice');
    });

    test('has() checks key presence; hasLocale() checks catalog presence', () => {
      const i18n = createI18n({
        messages: {
          en: { hello: 'Hello' },
          fr: { bonjour: 'Bonjour' },
        },
      });

      expect(i18n.hasLocale('en')).toBe(true);
      expect(i18n.hasLocale('de')).toBe(false);
      expect(i18n.has('hello')).toBe(true);
      expect(i18n.withLocale('fr').has('hello')).toBe(false); // key exists in en, not fr
      expect(i18n.withLocale('fr').has('bonjour')).toBe(true);
      expect(i18n.has('missing')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Async Loaders
  // ----------------------------------------------------------------
  describe('Async Loaders', () => {
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
      expect(i18n.withLocale('es').t('hello')).toBe('Hola');
    });

    test('load() accepts multiple locales and loads them concurrently', async () => {
      let calls = 0;
      const i18n = createI18n({
        loaders: {
          de: async () => {
            calls++;

            return { hello: 'Hallo' };
          },
          fr: async () => {
            calls++;

            return { hello: 'Bonjour' };
          },
        },
      });

      await i18n.load('fr', 'de');
      expect(calls).toBe(2);
      expect(i18n.withLocale('fr').t('hello')).toBe('Bonjour');
      expect(i18n.withLocale('de').t('hello')).toBe('Hallo');
    });

    test('registerLoader() registers a loader dynamically after construction', async () => {
      const i18n = createI18n();

      i18n.registerLoader('de', async () => ({ hello: 'Hallo' }));
      await i18n.load('de');
      expect(i18n.withLocale('de').t('hello')).toBe('Hallo');
    });

    test('load() is a no-op when the catalog is already populated', async () => {
      let calls = 0;
      const i18n = createI18n({
        loaders: {
          es: async () => {
            calls++;

            return { hello: 'Overwritten' };
          },
        },
        messages: { es: { hello: 'Hola' } },
      });

      await i18n.load('es');
      expect(calls).toBe(0);
      expect(i18n.withLocale('es').t('hello')).toBe('Hola');
    });

    test('load() with no registered loader silently resolves without error', async () => {
      const i18n = createI18n();

      await expect(i18n.load('xx')).resolves.toBeUndefined();
    });

    test('load() propagates loader errors and allows retrying', async () => {
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
  // subscribe() & dispose()
  // ----------------------------------------------------------------
  describe('subscribe() & dispose()', () => {
    test('fires immediately when immediate = true, then on every locale change', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn<(event: LocaleChangeEvent) => void>();

      i18n.subscribe(handler, true);
      expect(handler).toHaveBeenCalledWith({ locale: 'en', reason: 'locale-change' });

      i18n.locale = 'fr';
      expect(handler).toHaveBeenCalledWith({ locale: 'fr', reason: 'locale-change' });
      expect(handler).toHaveBeenCalledTimes(2);
    });

    test('does not fire on subscribe without immediate = true, only fires on locale change', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn<(event: LocaleChangeEvent) => void>();

      i18n.subscribe(handler);
      expect(handler).not.toHaveBeenCalled();

      i18n.locale = 'fr';
      expect(handler).toHaveBeenCalledWith({ locale: 'fr', reason: 'locale-change' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('add() to the active locale notifies subscribers; adding to an inactive locale is silent', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn<(event: LocaleChangeEvent) => void>();

      i18n.subscribe(handler);
      handler.mockClear();

      i18n.add('en', { hello: 'Hello' }); // active — notifies with catalog-update
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ locale: 'en', reason: 'catalog-update' });

      i18n.add('zh', { hello: '你好' }); // inactive — silent
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('the returned unsubscribe function stops future notifications', () => {
      const i18n = createI18n();
      const handler = vi.fn();
      const unsub = i18n.subscribe(handler);

      handler.mockClear();

      unsub();
      i18n.locale = 'fr';
      expect(handler).not.toHaveBeenCalled();
    });

    test('a throwing subscriber does not prevent other subscribers from being notified', () => {
      const i18n = createI18n();
      const handler = vi.fn();
      const broken = vi.fn(() => {
        throw new Error('oops');
      });

      i18n.subscribe(broken);
      i18n.subscribe(handler);
      i18n.locale = 'fr';

      expect(broken).toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
    });

    test('dispose() releases all resources — subscribers are cleared and catalogs are wiped', () => {
      const i18n = createI18n({ locale: 'en', messages: { en: { hello: 'Hello' } } });
      const handler = vi.fn();

      i18n.subscribe(handler);

      i18n.dispose();
      i18n.locale = 'fr';
      expect(handler).not.toHaveBeenCalled(); // subscribers cleared
      expect(i18n.t('hello')).toBe('hello'); // catalog cleared — key returned as-is
      expect(i18n.locales).toHaveLength(0); // all locale catalogs gone
    });
  });

  // ----------------------------------------------------------------
  // locales getter
  // ----------------------------------------------------------------
  describe('locales', () => {
    test('returns all loaded locale keys', () => {
      const i18n = createI18n({
        messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
      });

      expect(i18n.locales).toEqual(expect.arrayContaining(['en', 'fr']));
      expect(i18n.locales).toHaveLength(2);
    });

    test('updates when a new locale catalog is added', () => {
      const i18n = createI18n({ messages: { en: { hello: 'Hello' } } });

      expect(i18n.locales).toEqual(['en']);
      i18n.add('de', { hello: 'Hallo' });
      expect(i18n.locales).toContain('de');
    });
  });

  // ----------------------------------------------------------------
  // loadableLocales
  // ----------------------------------------------------------------
  describe('loadableLocales', () => {
    test('returns locales for which a loader has been registered', () => {
      const i18n = createI18n({
        loaders: { fr: () => Promise.resolve({ hello: 'Bonjour' }) },
      });

      expect(i18n.loadableLocales).toContain('fr');
      expect(i18n.loadableLocales).toHaveLength(1);
    });

    test('updates after registerLoader() is called', () => {
      const i18n = createI18n();

      expect(i18n.loadableLocales).toHaveLength(0);

      i18n.registerLoader('de', () => Promise.resolve({ hello: 'Hallo' }));
      expect(i18n.loadableLocales).toContain('de');
    });
  });

  // ----------------------------------------------------------------
  // onDiagnostic option
  // ----------------------------------------------------------------
  describe('onDiagnostic option', () => {
    test('onDiagnostic receives a subscriber-error event when a subscriber throws', () => {
      const onDiagnostic = vi.fn();
      const i18n = createI18n({ onDiagnostic });
      const error = new Error('boom');

      i18n.subscribe(() => {
        throw error;
      });
      i18n.locale = 'fr';

      expect(onDiagnostic).toHaveBeenCalledWith({ error, kind: 'subscriber-error' });
    });

    test('onDiagnostic receives a subscriber-error event during immediate subscribe', () => {
      const onDiagnostic = vi.fn();
      const i18n = createI18n({ locale: 'en', onDiagnostic });
      const error = new Error('immediate');

      i18n.subscribe(() => {
        throw error;
      }, true);

      expect(onDiagnostic).toHaveBeenCalledWith({ error, kind: 'subscriber-error' });
    });

    test('onDiagnostic receives a loader-error event with the failing locale when a loader rejects', async () => {
      const onDiagnostic = vi.fn();
      const loaderError = new Error('fetch failed');
      const i18n = createI18n({
        loaders: { fr: () => Promise.reject(loaderError) },
        onDiagnostic,
      });

      // load() still rejects — onDiagnostic acts as a side-channel for notification/logging
      await expect(i18n.load('fr')).rejects.toThrow('fetch failed');
      expect(onDiagnostic).toHaveBeenCalledWith({ error: loaderError, kind: 'loader-error', locale: 'fr' });
    });
  });

  // ----------------------------------------------------------------
  // [Symbol.dispose]
  // ----------------------------------------------------------------
  describe('[Symbol.dispose]', () => {
    test('using statement disposes the instance, clearing all resources', () => {
      let capturedI18n: I18n<Messages>;

      {
        using i18n = createI18n({ locale: 'en', messages: { en: { hello: 'Hello' } } });
        capturedI18n = i18n;
      }
      // After the block, Symbol.dispose was called
      expect(capturedI18n.locales).toHaveLength(0); // catalogs cleared
      expect(capturedI18n.t('hello')).toBe('hello'); // key returned as-is
    });
  });

  // ----------------------------------------------------------------
  // constructor deep-clones messages
  // ----------------------------------------------------------------
  describe('constructor deep-clones messages', () => {
    test('mutating the source object after construction does not affect the catalog', () => {
      const source = { en: { greeting: 'Hello' } };
      const i18n = createI18n({ messages: source });

      // Mutate the original source
      (source.en as Record<string, string>).greeting = 'Mutated';

      // The catalog must be unchanged
      expect(i18n.t('greeting')).toBe('Hello');
    });
  });

  // ----------------------------------------------------------------
  // subscribe() — LocaleChangeEvent reason
  // ----------------------------------------------------------------
  describe('subscribe() — LocaleChangeEvent reason', () => {
    test('fires with reason "locale-change" when the active locale is switched', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn<(event: LocaleChangeEvent) => void>();

      i18n.subscribe(handler);

      i18n.locale = 'fr';
      expect(handler).toHaveBeenCalledWith({ locale: 'fr', reason: 'locale-change' });
    });

    test('fires with reason "catalog-update" when add() updates the active locale catalog', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn<(event: LocaleChangeEvent) => void>();

      i18n.subscribe(handler);

      i18n.add('en', { hello: 'Hello' });
      expect(handler).toHaveBeenCalledWith({ locale: 'en', reason: 'catalog-update' });
    });

    test('immediate subscribe fires with reason "locale-change"', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn<(event: LocaleChangeEvent) => void>();

      i18n.subscribe(handler, true);
      expect(handler).toHaveBeenCalledWith({ locale: 'en', reason: 'locale-change' });
    });
  });

  // ----------------------------------------------------------------
  // loadableLocales cache
  // ----------------------------------------------------------------
  describe('loadableLocales cache', () => {
    test('returns the same array reference when no loader has been added', () => {
      const i18n = createI18n({
        loaders: { fr: () => Promise.resolve({}) },
      });

      const first = i18n.loadableLocales;
      const second = i18n.loadableLocales;

      expect(first).toBe(second); // same cached reference
    });

    test('cache is invalidated after registerLoader() — new array is returned', () => {
      const i18n = createI18n();
      const before = i18n.loadableLocales;

      i18n.registerLoader('de', () => Promise.resolve({}));

      const after = i18n.loadableLocales;

      expect(before).not.toBe(after);
      expect(after).toContain('de');
    });
  });

  // ----------------------------------------------------------------
  // batch()
  // ----------------------------------------------------------------
  describe('batch()', () => {
    test('collapses multiple add() calls into a single notification', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn();

      i18n.subscribe(handler);
      handler.mockClear();

      i18n.batch(() => {
        i18n.add('en', { a: 'A' });
        i18n.add('en', { b: 'B' });
        i18n.add('en', { c: 'C' });
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ locale: 'en', reason: 'catalog-update' });
      expect(i18n.t('a')).toBe('A');
      expect(i18n.t('b')).toBe('B');
      expect(i18n.t('c')).toBe('C');
    });

    test('does not notify when nothing inside the batch triggers a notification', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn();

      i18n.subscribe(handler);
      handler.mockClear();

      i18n.batch(() => {
        /* no-op */
      });

      expect(handler).not.toHaveBeenCalled();
    });

    test('nested batch() calls fire exactly one notification when the outermost batch completes', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn();

      i18n.subscribe(handler);
      handler.mockClear();

      i18n.batch(() => {
        i18n.batch(() => {
          i18n.add('en', { x: 'X' });
        });
        i18n.add('en', { y: 'Y' });
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(i18n.t('x')).toBe('X');
      expect(i18n.t('y')).toBe('Y');
    });

    test('add() to an inactive locale inside batch() does not trigger a notification', () => {
      const i18n = createI18n({ locale: 'en' });
      const handler = vi.fn();

      i18n.subscribe(handler);
      handler.mockClear();

      i18n.batch(() => {
        i18n.add('fr', { bonjour: 'Bonjour' }); // inactive locale
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // reload()
  // ----------------------------------------------------------------
  describe('reload()', () => {
    test('force-reloads a locale even when the catalog is already populated', async () => {
      let calls = 0;
      const i18n = createI18n({
        loaders: {
          en: async () => {
            calls++;

            return { hello: 'Reloaded' };
          },
        },
        messages: { en: { hello: 'Hello' } },
      });

      expect(i18n.t('hello')).toBe('Hello'); // pre-loaded value
      await i18n.reload('en');
      expect(calls).toBe(1); // loader was actually called
      expect(i18n.t('hello')).toBe('Reloaded');
    });

    test('reload() notifies subscribers after the catalog is refreshed', async () => {
      const handler = vi.fn();
      const i18n = createI18n({
        loaders: { en: async () => ({ hello: 'Fresh' }) },
        messages: { en: { hello: 'Stale' } },
      });

      i18n.subscribe(handler);
      handler.mockClear();

      await i18n.reload('en');

      expect(handler).toHaveBeenCalledWith({ locale: 'en', reason: 'catalog-update' });
      expect(i18n.t('hello')).toBe('Fresh');
    });

    test('reload() on a locale with no loader is a no-op — catalog is preserved', async () => {
      const i18n = createI18n({ messages: { en: { hello: 'Hello' } } });

      await i18n.reload('en');

      // No loader registered — reload() is a no-op to prevent silently clearing the catalog.
      expect(i18n.t('hello')).toBe('Hello');
      expect(i18n.has('hello')).toBe(true);
    });
  });
});
