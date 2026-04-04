import { createI18n, type LocaleChangeEvent, type Messages } from '../';

describe('i18n — core instance', () => {
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
      const i18n = createI18n<Messages>({ messages: { en: { exists: 'yes' } } });

      expect(i18n.t('missing')).toBe('missing');
      expect(i18n.t('nested.missing.key')).toBe('nested.missing.key');
    });

    test('calls onMissing with key and locale; the return value replaces the key fallback', () => {
      const onMissing = vi.fn((key: string) => `[missing: ${key}]`);
      const i18n = createI18n<Messages>({ messages: { en: { exists: 'yes' } }, onMissing });

      expect(i18n.t('missing')).toBe('[missing: missing]');
      expect(onMissing).toHaveBeenCalledWith('missing', 'en');
      expect(i18n.t('exists')).toBe('yes');
      expect(onMissing).toHaveBeenCalledTimes(1);
    });

    test('treats an empty string value as a valid translation', () => {
      const i18n = createI18n({ messages: { en: { empty: '' } } });

      expect(i18n.t('empty')).toBe('');
    });
  });

  describe('switchLocale() & ensureLocale()', () => {
    test('switchLocale() loads messages then switches the locale atomically', async () => {
      const i18n = createI18n({ loaders: { fr: async () => ({ hello: 'Bonjour' }) } });

      await i18n.switchLocale('fr');
      expect(i18n.locale).toBe('fr');
      expect(i18n.t('hello')).toBe('Bonjour');
    });

    test('switchLocale() throws in strict mode when no loader and no catalog exists', async () => {
      const i18n = createI18n({ locale: 'en' });

      await expect(i18n.switchLocale('de')).rejects.toThrow('Missing loader for locale "de"');
      expect(i18n.locale).toBe('en');
    });

    test('switchLocale() can still switch in best-effort mode', async () => {
      const i18n = createI18n({ locale: 'en' });

      await i18n.switchLocale('de', 'best-effort');
      expect(i18n.locale).toBe('de');
    });

    test('ensureLocale() loads catalogs without switching locale', async () => {
      const i18n = createI18n({
        loaders: { fr: async () => ({ hello: 'Bonjour' }) },
        locale: 'en',
      });

      await i18n.ensureLocale('fr');

      expect(i18n.locale).toBe('en');
      expect(i18n.isReady('fr')).toBe(true);
      expect(i18n.withLocale('fr').t('hello')).toBe('Bonjour');
    });
  });

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

      expect(i18n.t('a')).toBe('A(es)');
      expect(i18n.t('b')).toBe('B(fr)');
      expect(i18n.t('c')).toBe('C(en)');
    });

    test('automatically falls back from a locale variant to its language root (en-US -> en)', () => {
      const i18n = createI18n({
        locale: 'en-US',
        messages: {
          en: { hello: 'Hello (en)' },
          'en-US': { greeting: 'Howdy!' },
        },
      });

      expect(i18n.t('greeting')).toBe('Howdy!');
      expect(i18n.t('hello')).toBe('Hello (en)');
    });
  });

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

      expect(i18n.t('hello')).toBe('hello');
      expect(i18n.t('greeting')).toBe('Greetings');
    });

    test('replace() deep-clones nested structures', () => {
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
      expect(i18n.withLocale('fr').has('hello')).toBe(false);
      expect(i18n.withLocale('fr').has('bonjour')).toBe(true);
      expect(i18n.has('missing')).toBe(false);
    });
  });

  describe('Async Loaders', () => {
    test('ensureLocale() deduplicates concurrent loads', async () => {
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

      await Promise.all([i18n.ensureLocale('es'), i18n.ensureLocale('es'), i18n.ensureLocale('es')]);
      expect(calls).toBe(1);
      expect(i18n.withLocale('es').t('hello')).toBe('Hola');
    });

    test('ensureLocale() is a no-op when a catalog is already populated', async () => {
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

      await i18n.ensureLocale('es');
      expect(calls).toBe(0);
      expect(i18n.withLocale('es').t('hello')).toBe('Hola');
    });

    test('ensureLocale() with no loader rejects in strict mode', async () => {
      const i18n = createI18n();

      await expect(i18n.ensureLocale('xx')).rejects.toThrow('Missing loader for locale "xx"');
    });

    test('ensureLocale() can ignore missing loaders in best-effort mode', async () => {
      const i18n = createI18n();

      await expect(i18n.ensureLocale('xx', 'best-effort')).resolves.toBeUndefined();
    });

    test('ensureLocale() propagates loader errors and allows retrying', async () => {
      let calls = 0;
      const i18n = createI18n({
        loaders: {
          es: async () => {
            calls++;
            throw new Error('network error');
          },
        },
      });

      await expect(i18n.ensureLocale('es')).rejects.toThrow('network error');
      await expect(i18n.ensureLocale('es')).rejects.toThrow('network error');
      expect(calls).toBe(2);
    });
  });

  describe('subscribe() & dispose()', () => {
    test('fires immediately when immediate = true, then on switchLocale()', async () => {
      const i18n = createI18n({
        locale: 'en',
        messages: { en: {}, fr: {} },
      });
      const handler = vi.fn<(event: LocaleChangeEvent) => void>();

      i18n.subscribe(handler, true);
      expect(handler).toHaveBeenCalledWith({ locale: 'en', reason: 'locale-change' });

      await i18n.switchLocale('fr');
      expect(handler).toHaveBeenCalledWith({ locale: 'fr', reason: 'locale-change' });
      expect(handler).toHaveBeenCalledTimes(2);
    });

    test('the returned unsubscribe function stops future notifications', async () => {
      const i18n = createI18n({ messages: { en: {}, fr: {} } });
      const handler = vi.fn();
      const unsub = i18n.subscribe(handler);

      handler.mockClear();
      unsub();

      await i18n.switchLocale('fr');
      expect(handler).not.toHaveBeenCalled();
    });

    test('a throwing subscriber does not prevent other subscribers from being notified', async () => {
      const i18n = createI18n({ messages: { en: {}, fr: {} } });
      const handler = vi.fn();
      const broken = vi.fn(() => {
        throw new Error('oops');
      });

      i18n.subscribe(broken);
      i18n.subscribe(handler);
      await i18n.switchLocale('fr');

      expect(broken).toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
    });

    test('dispose() releases all resources', () => {
      const i18n = createI18n({ locale: 'en', messages: { en: { hello: 'Hello' } } });
      const handler = vi.fn();

      i18n.subscribe(handler);
      i18n.dispose();

      expect(i18n.t('hello')).toBe('hello');
      expect(i18n.locales).toHaveLength(0);
    });
  });

  describe('loadableLocales / locales / readiness', () => {
    test('loadableLocales updates after registerLoader()', () => {
      const i18n = createI18n();

      expect(i18n.loadableLocales).toHaveLength(0);

      i18n.registerLoader('de', () => Promise.resolve({ hello: 'Hallo' }));
      expect(i18n.loadableLocales).toContain('de');
    });

    test('locales updates when a new locale catalog is added', () => {
      const i18n = createI18n({ messages: { en: { hello: 'Hello' } } });

      expect(i18n.locales).toEqual(['en']);
      i18n.add('de', { hello: 'Hallo' });
      expect(i18n.locales).toContain('de');
    });

    test('isReady() reflects whether the locale catalog is loaded', async () => {
      const i18n = createI18n({ loaders: { fr: async () => ({ hello: 'Bonjour' }) } });

      expect(i18n.isReady('fr')).toBe(false);
      await i18n.ensureLocale('fr');
      expect(i18n.isReady('fr')).toBe(true);
    });
  });

  describe('onDiagnostic option', () => {
    test('onDiagnostic receives a subscriber-error event when a subscriber throws', async () => {
      const onDiagnostic = vi.fn();
      const i18n = createI18n({
        messages: { en: {}, fr: {} },
        onDiagnostic,
      });
      const error = new Error('boom');

      i18n.subscribe(() => {
        throw error;
      });
      await i18n.switchLocale('fr');

      expect(onDiagnostic).toHaveBeenCalledWith({ error, kind: 'subscriber-error' });
    });

    test('onDiagnostic receives a loader-error event with the failing locale when a loader rejects', async () => {
      const onDiagnostic = vi.fn();
      const loaderError = new Error('fetch failed');
      const i18n = createI18n({
        loaders: { fr: () => Promise.reject(loaderError) },
        onDiagnostic,
      });

      await expect(i18n.ensureLocale('fr')).rejects.toThrow('fetch failed');
      expect(onDiagnostic).toHaveBeenCalledWith({ error: loaderError, kind: 'loader-error', locale: 'fr' });
    });
  });

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
  });

  describe('reload()', () => {
    test('force-reloads a locale when a loader is registered', async () => {
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

      expect(i18n.t('hello')).toBe('Hello');
      await i18n.reload('en');
      expect(calls).toBe(1);
      expect(i18n.t('hello')).toBe('Reloaded');
    });

    test('reload() without loader throws', async () => {
      const i18n = createI18n({ messages: { en: { hello: 'Hello' } } });

      await expect(i18n.reload('en')).rejects.toThrow('Cannot reload locale "en" without a registered loader');
    });
  });
});
