import { describe, expect, test, vi } from 'vitest';

import type { I18nSnapshot } from '../';

import { LinguaDisposedError, LinguaInvalidLocaleError, LinguaMissingLocaleError, createI18n } from '../';

describe('createI18n — locale, catalog, and formatter state', () => {
  describe('locale canonicalization', () => {
    test('normalizes locale casing at construction', () => {
      expect(createI18n({ locale: 'EN' }).locale).toBe('en');
    });

    test('treats equivalent BCP 47 tags as the same locale', () => {
      const i18n = createI18n({ catalogs: { 'en-US': { hello: 'Hello' } }, locale: 'en-us' });

      expect(i18n.t('hello')).toBe('Hello');
    });

    test('throws for an invalid BCP 47 locale tag at construction', () => {
      expect(() => createI18n({ locale: 'not a valid locale' })).toThrow(LinguaInvalidLocaleError);
    });

    test('throws when setLocale receives an invalid locale tag', async () => {
      await expect(createI18n().setLocale('not_valid')).rejects.toThrow(LinguaInvalidLocaleError);
    });

    test('throws when register receives an invalid locale tag', () => {
      expect(() => createI18n().register('not_valid', { hello: 'Hi' })).toThrow(LinguaInvalidLocaleError);
    });

    test('subtag expansion: en-US active locale resolves keys from en catalog', () => {
      // buildLocaleChain expands 'en-US' → ['en-US', 'en'] so the 'en' catalog is a fallback
      const i18n = createI18n({
        catalogs: { en: { greeting: 'Hello' }, 'en-US': {} },
        locale: 'en-US',
      });

      expect(i18n.t('greeting')).toBe('Hello');
    });

    test('subtag expansion: zh-Hant-TW falls back through zh-Hant then zh', () => {
      const i18n = createI18n({
        catalogs: { zh: { title: '标题' }, 'zh-Hant-TW': {} },
        locale: 'zh-Hant-TW',
      });

      expect(i18n.t('title')).toBe('标题');
    });
  });

  describe('register()', () => {
    test('adds a new locale to getSupportedLocales()', () => {
      const i18n = createI18n();

      i18n.register('fr', { hello: 'Bonjour' });
      expect(i18n.getSupportedLocales()).toContain('fr');
    });

    test('replaces an existing locale source', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      i18n.register('en', { hello: 'Hi' });
      expect(i18n.t('hello')).toBe('Hi');
    });

    test('notifies subscribers when the registered locale is in the active chain', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } }, locale: 'en' });
      const listener = vi.fn();

      i18n.subscribe(listener);
      i18n.register('en', { hello: 'Hi' });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    test('does not notify subscribers when the registered locale is not in the active chain', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } }, locale: 'en' });
      const listener = vi.fn();

      i18n.subscribe(listener);
      i18n.register('fr', { hello: 'Bonjour' });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('catalogs', () => {
    test('accepts mixed static messages and async loaders', async () => {
      const i18n = createI18n({
        catalogs: {
          en: { hello: 'Hello' },
          fr: async () => ({ hello: 'Bonjour' }),
        },
        locale: 'en',
      });

      await i18n.setLocale('fr');
      expect(i18n.t('hello')).toBe('Bonjour');
    });

    describe('dev-mode plural-form validation', () => {
      test('warns for a static catalog passed at construction, missing CLDR forms for its locale', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        createI18n({ catalogs: { ar: { items: { one: '1', other: '{count}' } } } });

        await vi.waitFor(() =>
          expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("catalog('ar'): missing plural form")),
        );

        warnSpy.mockRestore();
      });

      test('warns for a catalog added via register() after construction', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const i18n = createI18n();

        await i18n.register('ar', { items: { one: '1', other: '{count}' } });

        await vi.waitFor(() =>
          expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("catalog('ar'): missing plural form")),
        );

        warnSpy.mockRestore();
      });

      test('warns once an async loader resolves', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const i18n = createI18n();

        await i18n.register('ar', async () => ({ items: { one: '1', other: '{count}' } }));

        await vi.waitFor(() =>
          expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("catalog('ar'): missing plural form")),
        );

        warnSpy.mockRestore();
      });

      test('does not warn for a catalog with every CLDR plural form present', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const i18n = createI18n();

        await i18n.register('en', { items: { one: '1 item', other: '{count} items' } });

        // The dynamic import still resolves even when there's nothing to warn about. A real
        // macrotask delay (not a fixed count of microtask ticks) guarantees the entire
        // import-and-validate chain has drained before asserting the negative, however many
        // microtask turns it actually takes under the hood.
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(warnSpy).not.toHaveBeenCalled();
        warnSpy.mockRestore();
      });
    });
  });

  describe('prototype pollution guard', () => {
    test('__proto__ key in catalog is silently skipped', () => {
      const evil = JSON.parse('{"__proto__": "hacked", "hello": "Hello"}') as Record<string, string>;

      expect(() => {
        const i18n = createI18n({ catalogs: { en: evil as any } });

        expect(i18n.t('hello')).toBe('Hello');
        // __proto__ key must not appear as a catalog entry
        expect(i18n.has('__proto__' as any)).toBe(false);
      }).not.toThrow();
    });

    test('nested __proto__ key in catalog is silently skipped', () => {
      const evil = JSON.parse('{"nav": {"__proto__": "hacked", "home": "Home"}}') as Record<string, unknown>;

      const i18n = createI18n({ catalogs: { en: evil as any } });

      expect(i18n.t('nav.home')).toBe('Home');
      expect(i18n.has('nav.__proto__' as any)).toBe(false);
    });
  });

  describe('preload()', () => {
    test('loads messages without switching the active locale', async () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: async () => ({ hello: 'Bonjour' }) },
        locale: 'en',
      });

      await i18n.preload('fr');
      expect(i18n.locale).toBe('en');
    });

    test('deduplicates concurrent load requests (loader called exactly once)', async () => {
      let calls = 0;
      const i18n = createI18n({
        catalogs: {
          en: {},
          fr: async () => {
            calls++;

            return { hello: 'Bonjour' };
          },
        },
        locale: 'en',
      });

      await Promise.all([i18n.preload('fr'), i18n.preload('fr'), i18n.preload('fr')]);
      expect(calls).toBe(1);
    });

    test('throws when the locale has no registered source', async () => {
      await expect(createI18n({ locale: 'en' }).preload('de')).rejects.toBeInstanceOf(LinguaMissingLocaleError);
    });

    test('notifies subscribers when a fallback locale finishes loading', async () => {
      const i18n = createI18n({
        catalogs: {
          en: { title: 'Hello' },
          fr: async () => ({ nav: { home: 'Accueil' } }),
        },
        fallback: 'fr',
        locale: 'en',
      });
      const listener = vi.fn();

      i18n.subscribe(listener);
      await i18n.preload('fr');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(i18n.has('nav.home')).toBe(true);
    });

    test('does not notify subscribers when the preloaded locale is outside the active chain', async () => {
      const i18n = createI18n({
        catalogs: {
          en: { hello: 'Hello' },
          fr: async () => ({ hello: 'Bonjour' }),
        },
        locale: 'en',
      });
      const listener = vi.fn();

      i18n.subscribe(listener);
      await i18n.preload('fr');
      expect(listener).not.toHaveBeenCalled();
    });

    test('ignores stale preload results when source is replaced while loading', async () => {
      let resolveLoader!: (value: { hello: string }) => void;
      const i18n = createI18n({
        catalogs: {
          en: { hello: 'Hello' },
          fr: () =>
            new Promise<{ hello: string }>((resolve) => {
              resolveLoader = resolve;
            }),
        },
        fallback: 'en',
        locale: 'en',
      });

      const task = i18n.preload('fr');

      i18n.register('fr', { hello: 'Salut' });
      resolveLoader({ hello: 'Bonjour (stale)' });
      await task;

      await i18n.setLocale('fr');
      expect(i18n.t('hello')).toBe('Salut');
    });

    test('ignores stale results when source is replaced with a new dynamic loader', async () => {
      let resolveFirst!: (value: { hello: string }) => void;
      let resolveSecond!: (value: { hello: string }) => void;
      const i18n = createI18n({
        catalogs: {
          en: { hello: 'Hello' },
          fr: () =>
            new Promise<{ hello: string }>((resolve) => {
              resolveFirst = resolve;
            }),
        },
        fallback: 'en',
        locale: 'en',
      });

      const firstPreload = i18n.preload('fr');

      // Replace with a new dynamic loader before the first one resolves.
      i18n.register(
        'fr',
        () =>
          new Promise<{ hello: string }>((resolve) => {
            resolveSecond = resolve;
          }),
      );
      resolveFirst({ hello: 'Stale Bonjour' });
      await firstPreload;

      // Only the second loader should produce messages after it resolves.
      const secondPreload = i18n.preload('fr');

      resolveSecond({ hello: 'Fresh Bonjour' });
      await secondPreload;

      await i18n.setLocale('fr');
      expect(i18n.t('hello')).toBe('Fresh Bonjour');
    });

    test('starts a new load immediately when the in-flight loader has been replaced', async () => {
      let resolveFirst!: (value: { hello: string }) => void;
      let resolveSecond!: (value: { hello: string }) => void;
      let secondCalls = 0;
      const i18n = createI18n({
        catalogs: {
          en: { hello: 'Hello' },
          fr: () =>
            new Promise<{ hello: string }>((resolve) => {
              resolveFirst = resolve;
            }),
        },
        fallback: 'en',
        locale: 'en',
      });

      const firstPreload = i18n.preload('fr');

      i18n.register(
        'fr',
        () =>
          new Promise<{ hello: string }>((resolve) => {
            secondCalls++;
            resolveSecond = resolve;
          }),
      );

      const secondPreload = i18n.preload('fr');

      expect(secondCalls).toBe(1);

      resolveFirst({ hello: 'Stale Bonjour' });
      await firstPreload;

      resolveSecond({ hello: 'Fresh Bonjour' });
      await secondPreload;

      await i18n.setLocale('fr');
      expect(i18n.t('hello')).toBe('Fresh Bonjour');
    });
  });

  describe('setLocale()', () => {
    test('switches the active locale and notifies subscribers', async () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        locale: 'en',
      });
      const listener = vi.fn<(snapshot: I18nSnapshot) => void>();

      i18n.subscribe(listener);
      await i18n.setLocale('fr');
      expect(i18n.locale).toBe('fr');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0]?.[0]?.locale).toBe('fr');
    });

    test('loads a dynamic locale before switching', async () => {
      const i18n = createI18n({ locale: 'en' });

      i18n.register('fr', async () => ({ hello: 'Bonjour' }));
      await i18n.setLocale('fr');
      expect(i18n.t('hello')).toBe('Bonjour');
    });

    test('is a no-op when the requested locale is already active', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } }, locale: 'en' });
      const listener = vi.fn();

      i18n.subscribe(listener);
      await i18n.setLocale('en');
      expect(listener).not.toHaveBeenCalled();
      expect(i18n.getSnapshot().locale).toBe('en');
    });

    test('last call wins when concurrent switches race (stale responses discarded)', async () => {
      let resolveFirst!: (v: { hello: string }) => void;
      const i18n = createI18n({ locale: 'en' });

      i18n.register(
        'fr',
        () =>
          new Promise<{ hello: string }>((resolve) => {
            resolveFirst = resolve;
          }),
      );
      i18n.register('de', async () => ({ hello: 'Hallo' }));

      const frSwitch = i18n.setLocale('fr');
      const deSwitch = i18n.setLocale('de');

      resolveFirst({ hello: 'Bonjour' });
      await Promise.all([frSwitch, deSwitch]);
      expect(i18n.locale).toBe('de');
    });

    test('throws when the locale has no registered source', async () => {
      await expect(createI18n({ locale: 'en' }).setLocale('de')).rejects.toBeInstanceOf(LinguaMissingLocaleError);
    });

    test('keeps current locale unchanged when setLocale throws', async () => {
      const i18n = createI18n({ locale: 'en' });

      await expect(i18n.setLocale('de')).rejects.toBeInstanceOf(LinguaMissingLocaleError);
      expect(i18n.locale).toBe('en');
      expect(i18n.getSnapshot().locale).toBe('en');
    });
  });

  describe('isLoaded()', () => {
    test('returns true for a statically registered locale', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(i18n.isLoaded('en')).toBe(true);
    });

    test('returns false for a loader-only (not yet loaded) locale', () => {
      const i18n = createI18n({ catalogs: { de: async () => ({ hello: 'Hallo' }), en: { hello: 'Hello' } } });

      expect(i18n.isLoaded('de')).toBe(false);
    });

    test('returns true after preloading an async locale', async () => {
      const i18n = createI18n({ catalogs: { de: async () => ({ hello: 'Hallo' }), en: { hello: 'Hello' } } });

      await i18n.preload('de');
      expect(i18n.isLoaded('de')).toBe(true);
    });

    test('returns false for an unregistered locale', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(i18n.isLoaded('fr')).toBe(false);
    });

    test('returns false for an invalid locale tag without throwing', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(() => i18n.isLoaded('not-a-valid-locale!!!')).not.toThrow();
      expect(i18n.isLoaded('not-a-valid-locale!!!')).toBe(false);
    });

    test('canonicalizes locale before checking', () => {
      const i18n = createI18n({ catalogs: { 'en-US': { hello: 'Hello' } } });

      // Intl.getCanonicalLocales normalizes 'en-us' → 'en-US'
      expect(i18n.isLoaded('en-US')).toBe(true);
    });
  });

  describe('getSupportedLocales()', () => {
    test('returns an empty array when no catalogs are registered', () => {
      expect(createI18n().getSupportedLocales()).toEqual([]);
    });

    test('returns locales in registration (insertion) order', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' }, zh: { hello: '你好' } } });

      expect(i18n.getSupportedLocales()).toEqual(['en', 'zh']);
    });

    test('includes locales registered after construction', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      i18n.register('fr', { hello: 'Bonjour' });
      expect(i18n.getSupportedLocales()).toEqual(['en', 'fr']);
    });

    test('returns locales in code-point order when sorted is true', () => {
      const i18n = createI18n({ catalogs: { de: {}, 'en-US': {}, 'zh-Hant': {} } });

      // Code-point sort: '-' (0x2D) < uppercase letters < lowercase, so 'de' < 'en-US' < 'zh-Hant'.
      expect(i18n.getSupportedLocales(true)).toEqual(['de', 'en-US', 'zh-Hant']);
    });
  });

  describe('setLocale() — concurrent last-wins', () => {
    test('last concurrent setLocale wins', async () => {
      const i18n = createI18n({
        catalogs: {
          de: async () => ({ hello: 'Hallo' }),
          en: { hello: 'Hello' },
          fr: async () => ({ hello: 'Bonjour' }),
        },
        locale: 'en',
      });

      // Fire both concurrently — only fr should win
      const [, result] = await Promise.allSettled([i18n.setLocale('de'), i18n.setLocale('fr')]);

      expect(result.status).toBe('fulfilled');
      expect(i18n.locale).toBe('fr');
      expect(i18n.t('hello')).toBe('Bonjour');
    });
  });

  describe('getSupportedLocales() — sorted', () => {
    test('sorted=true returns locales in code-point order', () => {
      const i18n = createI18n({
        catalogs: { de: { a: 'a' }, en: { a: 'a' }, fr: { a: 'a' }, zh: { a: 'a' } },
      });

      expect(i18n.getSupportedLocales(true)).toEqual(['de', 'en', 'fr', 'zh']);
    });

    test('sorted=false preserves registration order', () => {
      const i18n = createI18n({ locale: 'zh' });

      i18n.register('zh', { a: 'a' });
      i18n.register('fr', { a: 'a' });
      i18n.register('de', { a: 'a' });
      i18n.register('en', { a: 'a' });

      expect(i18n.getSupportedLocales(false)).toEqual(['zh', 'fr', 'de', 'en']);
    });
  });

  describe('isRegistered()', () => {
    test('returns true for a statically registered locale', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(i18n.isRegistered('en')).toBe(true);
    });

    test('returns true for a loader-only locale (not yet loaded)', () => {
      const i18n = createI18n({ catalogs: { de: async () => ({ hello: 'Hallo' }), en: { hello: 'Hello' } } });

      expect(i18n.isRegistered('de')).toBe(true);
    });

    test('returns false for an unregistered locale', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(i18n.isRegistered('fr')).toBe(false);
    });

    test('returns false for an invalid locale tag without throwing', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(() => i18n.isRegistered('not-a-valid-locale!!!')).not.toThrow();
      expect(i18n.isRegistered('not-a-valid-locale!!!')).toBe(false);
    });

    test('isRegistered true + isLoaded false for pending loader', () => {
      const i18n = createI18n({ catalogs: { de: async () => ({ hello: 'Hallo' }), en: { hello: 'Hello' } } });

      expect(i18n.isRegistered('de')).toBe(true);
      expect(i18n.isLoaded('de')).toBe(false);
    });
  });

  describe('preload() — dispose race', () => {
    test('result is not applied when disposed mid-flight', async () => {
      let resolveLoader!: (v: { hello: string }) => void;
      const i18n = createI18n({
        catalogs: {
          en: {},
          fr: () =>
            new Promise<{ hello: string }>((resolve) => {
              resolveLoader = resolve;
            }),
        },
        locale: 'en',
      });

      const loadTask = i18n.preload('fr');

      i18n.dispose();

      resolveLoader({ hello: 'Bonjour' });
      await expect(loadTask).resolves.toBeUndefined();

      expect(i18n.isLoaded('fr')).toBe(false);
    });

    test('no exception is thrown when disposed mid-flight and loader resolves', async () => {
      let resolveLoader!: (v: { hello: string }) => void;
      const i18n = createI18n({
        catalogs: {
          en: {},
          fr: () =>
            new Promise<{ hello: string }>((resolve) => {
              resolveLoader = resolve;
            }),
        },
        locale: 'en',
      });

      const loadTask = i18n.preload('fr');

      i18n.dispose();
      resolveLoader({ hello: 'Bonjour' });

      await expect(loadTask).resolves.toBeUndefined();
    });
  });

  describe('register() — async', () => {
    test('register() with a static source returns a resolved Promise', async () => {
      const i18n = createI18n({ locale: 'en' });

      await expect(i18n.register('en', { hello: 'Hello' })).resolves.toBeUndefined();
      expect(i18n.t('hello')).toBe('Hello');
    });

    test('register() with an async loader returns a Promise that resolves after load', async () => {
      const i18n = createI18n({ locale: 'en' });

      await i18n.register('en', async () => ({ hello: 'Hello' }));
      expect(i18n.t('hello')).toBe('Hello');
    });

    test('register() async loader — locale is available after await', async () => {
      const i18n = createI18n({ locale: 'en' });

      await i18n.register('fr', async () => ({ bonjour: 'Bonjour' }));
      expect(i18n.isLoaded('fr')).toBe(true);
    });

    test('register() notifies subscribers after async loader resolves', async () => {
      const i18n = createI18n({ locale: 'en' });
      const listener = vi.fn();

      i18n.subscribe(listener);
      await i18n.register('en', async () => ({ greeting: 'Hi' }));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    test('register() on disposed instance throws LinguaDisposedError', () => {
      const i18n = createI18n({ catalogs: { en: {} } });

      i18n.dispose();
      expect(() => i18n.register('en', {})).toThrow(LinguaDisposedError);
    });
  });

  describe('fmt', () => {
    test('formats numbers with the current locale', () => {
      const i18n = createI18n({ locale: 'en' });

      expect(i18n.fmt.number(1_234.56)).toContain('1,234');
    });

    test('fmt cache is cleared when setLocale() switches locale', async () => {
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });

      // Prime the cache with English
      const enResult = i18n.fmt.number(1_234.56);

      await i18n.setLocale('fr');

      // After locale switch the cache is cleared; French formatting differs
      const frResult = i18n.fmt.number(1_234.56);

      expect(enResult).toContain('1,234');
      expect(frResult).not.toContain('1,234');
    });

    test('returns the same formatter instance on repeated accesses', () => {
      const i18n = createI18n({ locale: 'en' });

      expect(i18n.fmt).toBe(i18n.fmt);
    });

    test('follows locale changes reactively', async () => {
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });
      const enResult = i18n.fmt.number(1_234.56);

      await i18n.setLocale('fr');

      const frResult = i18n.fmt.number(1_234.56);

      expect(enResult).toContain('1,234');
      expect(frResult).not.toContain('1,234');
    });

    test('supports all Intl methods (currency, date, list)', () => {
      const i18n = createI18n({ locale: 'en' });

      expect(i18n.fmt.currency(9.99, 'USD')).toContain('$');
      expect(i18n.fmt.date(new Date('2024-01-15'))).toContain('2024');
      expect(i18n.fmt.list(['A', 'B', 'C'])).toBe('A, B, and C');
    });
  });
});
