import { describe, expect, test, vi } from 'vitest';

import type { I18nSnapshot } from '../';

import { createI18n } from '../';

describe('createI18n', () => {
  // ─── Defaults ─────────────────────────────────────────────────────────────

  test('locale defaults to "en"', () => {
    expect(createI18n().locale).toBe('en');
  });

  test('initial snapshot has locale "en" and version 0', () => {
    expect(createI18n().getSnapshot()).toEqual({ locale: 'en', version: 0 });
  });

  test('snapshot version stays at 0 after constructing with catalogs', () => {
    const i18n = createI18n({
      catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
      fallback: 'fr',
      locale: 'en',
    });

    expect(i18n.getSnapshot().version).toBe(0);
  });

  test('getSnapshot() returns the same object reference between changes', () => {
    const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

    expect(i18n.getSnapshot()).toBe(i18n.getSnapshot());
  });

  // ─── t() — leaf keys ──────────────────────────────────────────────────────

  describe('t() — leaf keys', () => {
    test('resolves a simple key', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(i18n.t('hello')).toBe('Hello');
    });

    test('resolves a nested key with dot notation', () => {
      const i18n = createI18n({ catalogs: { en: { nav: { home: 'Home' } } } });

      expect(i18n.t('nav.home')).toBe('Home');
    });

    test('interpolates variables', () => {
      const i18n = createI18n({ catalogs: { en: { greeting: 'Hello, {name}!' } } });

      expect(i18n.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
    });

    test('keeps placeholder text for a missing variable by default', () => {
      const i18n = createI18n({ catalogs: { en: { greeting: 'Hello, {name}!' } } });

      expect(i18n.t('greeting')).toBe('Hello, {name}!');
    });

    test('calls onMissing with type "key" for an unknown key', () => {
      const i18n = createI18n({ onMissing: (info) => `[${info.type}:${info.key}]` });

      expect(i18n.t('unknown')).toBe('[key:unknown]');
    });

    test('calls onMissing with type "var" and varName for a missing interpolation variable', () => {
      const i18n = createI18n({
        catalogs: { en: { greeting: 'Hello, {name}!' } },
        onMissing: (info) => (info.type === 'var' ? `<${info.varName}>` : info.key),
      });

      expect(i18n.t('greeting')).toBe('Hello, <name>!');
    });
  });

  // ─── tp() — plural branches ───────────────────────────────────────────────

  describe('tp() — plural branches', () => {
    const catalogs = {
      en: {
        inbox: { one: 'One message', other: '{count} messages', zero: 'No messages' },
        position: { few: '{count}rd', one: '{count}st', other: '{count}th', two: '{count}nd' },
      },
    };

    test('resolves .zero for count === 0 (cardinal)', () => {
      expect(createI18n({ catalogs }).tp('inbox', 0)).toBe('No messages');
    });

    test('resolves .one for count === 1 (cardinal)', () => {
      expect(createI18n({ catalogs }).tp('inbox', 1)).toBe('One message');
    });

    test('resolves .other for count > 1 and interpolates {count}', () => {
      expect(createI18n({ catalogs }).tp('inbox', 3)).toBe('3 messages');
    });

    test('preserves raw decimal count (not floored before Intl.PluralRules)', () => {
      const i18n = createI18n({ catalogs: { en: { items: { one: 'one', other: '{count}' } } } });

      expect(i18n.tp('items', 1.2)).toBe('1.2');
    });

    test('resolves ordinal plural forms when ordinal: true', () => {
      const i18n = createI18n({ catalogs });

      expect(i18n.tp('position', 1, { ordinal: true })).toBe('1st');
      expect(i18n.tp('position', 2, { ordinal: true })).toBe('2nd');
      expect(i18n.tp('position', 3, { ordinal: true })).toBe('3rd');
      expect(i18n.tp('position', 4, { ordinal: true })).toBe('4th');
    });

    test('falls back to .other when the specific plural form is absent', () => {
      const i18n = createI18n({ catalogs: { en: { items: { other: '{count} items' } } } });

      expect(i18n.tp('items', 1)).toBe('1 items');
    });

    test('throws when count is not finite', () => {
      const i18n = createI18n({ catalogs: { en: { items: { other: '{count}' } } } });

      expect(() => i18n.tp('items', Number.NaN)).toThrow('[i18nit/E002] `count` must be a finite number.');
    });

    test('throws when vars.count is provided', () => {
      const i18n = createI18n({ catalogs: { en: { items: { other: '{count}' } } } });

      expect(() => i18n.tp('items', 2, { vars: { count: 'custom' } })).toThrow(
        '[i18nit/E003] `tp` does not allow `vars.count`; `count` is injected automatically.',
      );
    });
  });

  // ─── t() — fallback chain ─────────────────────────────────────────────────

  describe('t() — fallback chain', () => {
    test('resolves a key from the fallback locale when absent in the active locale', () => {
      const i18n = createI18n({
        catalogs: { en: { title: 'Title' }, fr: { greeting: 'Bonjour' } },
        fallback: 'en',
        locale: 'fr',
      });

      expect(i18n.t('title')).toBe('Title');
    });

    test('prefers the active locale over the fallback', () => {
      const i18n = createI18n({
        catalogs: { en: { title: 'Title' }, fr: { title: 'Titre' } },
        fallback: 'en',
        locale: 'fr',
      });

      expect(i18n.t('title')).toBe('Titre');
    });

    test('falls back to configured locale when active dynamic locale has not been preloaded yet', () => {
      const i18n = createI18n({
        catalogs: {
          en: { hello: 'Hello' },
          fr: async () => ({ hello: 'Bonjour' }),
        },
        fallback: 'en',
        locale: 'fr',
      });

      expect(i18n.t('hello')).toBe('Hello');
    });

    test('walks multiple fallback locales in declaration order', () => {
      const i18n = createI18n({
        catalogs: {
          en: { title: 'Title' },
          pt: { lang: 'Português' },
          'pt-PT': { region: 'Portugal' },
        },
        fallback: ['pt-PT', 'en'],
        locale: 'pt',
      });

      expect(i18n.t('region')).toBe('Portugal');
      expect(i18n.t('title')).toBe('Title');
    });
  });

  // ─── Locale canonicalization ───────────────────────────────────────────────

  describe('locale canonicalization', () => {
    test('normalizes locale casing at construction', () => {
      expect(createI18n({ locale: 'EN' }).locale).toBe('en');
    });

    test('treats equivalent BCP 47 tags as the same locale', () => {
      const i18n = createI18n({ catalogs: { 'en-US': { hello: 'Hello' } }, locale: 'en-us' });

      expect(i18n.t('hello')).toBe('Hello');
    });

    test('falls back to "en" for a string that Intl.getCanonicalLocales rejects', () => {
      // Strings with spaces or illegal characters are invalid BCP 47 tags.
      // canon() returns 'en' rather than storing arbitrary strings as locale keys.
      expect(createI18n({ locale: 'not a valid locale' }).locale).toBe('en');
    });
  });

  // ─── register() ───────────────────────────────────────────────────────────

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

    test('does not notify subscribers when re-registering the same source reference', () => {
      const catalog = { hello: 'Hello' };
      const i18n = createI18n({ catalogs: { en: catalog } });
      const listener = vi.fn();

      i18n.subscribe(listener);
      i18n.register('en', catalog);
      expect(listener).not.toHaveBeenCalled();
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

  // ─── catalogs ─────────────────────────────────────────────────────────────

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
  });

  // ─── preload() ────────────────────────────────────────────────────────────

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
      await expect(createI18n({ locale: 'en' }).preload('de')).rejects.toThrow(
        '[i18nit/E001] Missing locale source for "de".',
      );
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

  // ─── setLocale() ──────────────────────────────────────────────────────────

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
      expect(i18n.getSnapshot().version).toBe(0);
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
      await expect(createI18n({ locale: 'en' }).setLocale('de')).rejects.toThrow(
        '[i18nit/E001] Missing locale source for "de".',
      );
    });

    test('keeps current locale unchanged when setLocale throws', async () => {
      const i18n = createI18n({ locale: 'en' });

      await expect(i18n.setLocale('de')).rejects.toThrow('[i18nit/E001] Missing locale source for "de".');
      expect(i18n.locale).toBe('en');
      expect(i18n.getSnapshot()).toEqual({ locale: 'en', version: 0 });
    });
  });

  // ─── subscribe() ──────────────────────────────────────────────────────────

  describe('subscribe()', () => {
    test('does not call the callback immediately by default', () => {
      const listener = vi.fn();

      createI18n({ locale: 'en' }).subscribe(listener);
      expect(listener).not.toHaveBeenCalled();
    });

    test('calls the callback immediately with the current snapshot when immediate: true', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } }, locale: 'en' });
      const callback = vi.fn<(snapshot: I18nSnapshot) => void>();

      i18n.subscribe(callback, { immediate: true });
      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(i18n.getSnapshot());
    });

    test('calls the callback with the updated snapshot on locale change', async () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        locale: 'en',
      });
      const snapshots: I18nSnapshot[] = [];

      i18n.subscribe((snapshot) => snapshots.push(snapshot));
      await i18n.setLocale('fr');
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]?.locale).toBe('fr');
    });

    test('callback receives the exact snapshot reference returned by getSnapshot()', async () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        locale: 'en',
      });
      let received: I18nSnapshot | undefined;

      i18n.subscribe((snapshot) => {
        received = snapshot;
      });
      await i18n.setLocale('fr');
      expect(received).toBe(i18n.getSnapshot());
    });

    test('version increments by 1 on each locale change', async () => {
      const i18n = createI18n({
        catalogs: { de: {}, en: {}, fr: {} },
        locale: 'en',
      });
      const versions: number[] = [];

      i18n.subscribe((s) => versions.push(s.version));
      await i18n.setLocale('fr');
      await i18n.setLocale('de');
      expect(versions).toEqual([1, 2]);
    });

    test('unsubscribe stops future callbacks', async () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        locale: 'en',
      });
      const callback = vi.fn();
      const unsubscribe = i18n.subscribe(callback);

      unsubscribe();
      await i18n.setLocale('fr');
      expect(callback).not.toHaveBeenCalled();
    });

    test('isolates listener failures so remaining subscribers still run', async () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        locale: 'en',
        onSubscriberError: () => {},
      });
      const bad = vi.fn(() => {
        throw new Error('boom');
      });
      const good = vi.fn();

      i18n.subscribe(bad);
      i18n.subscribe(good);
      await i18n.setLocale('fr');
      expect(good).toHaveBeenCalledOnce();
    });

    test('default onSubscriberError logs to console.error', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('boom');
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });

      i18n.subscribe(() => {
        throw error;
      });
      await i18n.setLocale('fr');
      expect(spy).toHaveBeenCalledWith('[i18nit] subscriber error', error);
      spy.mockRestore();
    });

    test('reports listener failures through onSubscriberError', async () => {
      const onSubscriberError = vi.fn();
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        locale: 'en',
        onSubscriberError,
      });

      i18n.subscribe(() => {
        throw new Error('listener failed');
      });

      await i18n.setLocale('fr');
      expect(onSubscriberError).toHaveBeenCalledTimes(1);
    });

    test('supports self-unsubscribe during dispatch', async () => {
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });
      const calls: string[] = [];

      const stop = i18n.subscribe(() => {
        calls.push('self');
        stop();
      });

      i18n.subscribe(() => calls.push('other'));

      await i18n.setLocale('fr');
      await i18n.setLocale('en');

      expect(calls).toEqual(['self', 'other', 'other']);
    });

    test('does not run listeners added during an in-flight dispatch until next change', async () => {
      const i18n = createI18n({ catalogs: { de: {}, en: {}, fr: {} }, locale: 'en' });
      const late = vi.fn();

      i18n.subscribe(() => {
        i18n.subscribe(late);
      });

      await i18n.setLocale('fr');
      expect(late).toHaveBeenCalledTimes(0);

      await i18n.setLocale('de');
      expect(late).toHaveBeenCalledTimes(1);
    });
  });

  // ─── has() ────────────────────────────────────────────────────────────────

  describe('has()', () => {
    test('returns true for a registered leaf key', () => {
      const i18n = createI18n({ catalogs: { en: { nav: { home: 'Home' } } } });

      expect(i18n.has('nav.home')).toBe(true);
    });

    test('returns false for an unknown key', () => {
      const i18n = createI18n({ catalogs: { en: { nav: { home: 'Home' } } } });

      expect(i18n.has('nav.missing' as any)).toBe(false);
    });

    test('resolves through the fallback chain', () => {
      const i18n = createI18n({
        catalogs: { en: { nav: { home: 'Home' } }, fr: {} },
        fallback: 'en',
        locale: 'fr',
      });

      expect(i18n.has('nav.home')).toBe(true);
    });

    test('returns false for a branch key', () => {
      const i18n = createI18n({ catalogs: { en: { nav: { home: 'Home' } } } });

      expect(i18n.has('nav')).toBe(false);
    });
  });

  // ─── getSupportedLocales() ────────────────────────────────────────────────

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

    test('returns locales in code-point order when sorted option is true', () => {
      const i18n = createI18n({ catalogs: { de: {}, 'en-US': {}, 'zh-Hant': {} } });

      // Code-point sort: '-' (0x2D) < uppercase letters < lowercase, so 'de' < 'en-US' < 'zh-Hant'.
      expect(i18n.getSupportedLocales({ sorted: true })).toEqual(['de', 'en-US', 'zh-Hant']);
    });
  });

  // ─── scope() ───────────────────────────────────────────────────────────────

  describe('scope()', () => {
    const catalogs = {
      en: {
        messages: {
          inbox: { one: 'One message', other: '{count} messages', zero: 'No messages' },
        },
        nav: { about: 'About', home: 'Home' },
      },
      fr: {
        messages: {
          inbox: { one: 'Un message', other: '{count} messages', zero: 'Aucun message' },
        },
        nav: { about: 'À propos', home: 'Accueil' },
      },
    };

    test('has() checks existence within the scope', () => {
      const i18n = createI18n({ catalogs });
      const nav = i18n.scope('nav');

      expect(nav.has('home')).toBe(true);
      expect(nav.has('missing')).toBe(false);
    });

    test('has() resolves through the fallback chain', () => {
      const i18n = createI18n({
        catalogs: { en: { nav: { home: 'Home' } }, fr: { nav: {} } },
        fallback: 'en',
        locale: 'fr',
      });
      const nav = i18n.scope('nav');

      expect(nav.has('home')).toBe(true);
    });

    test('t() prefixes the key with the given scope', () => {
      const i18n = createI18n({ catalogs });
      const nav = i18n.scope('nav');

      expect(nav.t('home')).toBe('Home');
      expect(nav.t('about')).toBe('About');
    });

    test('tp() prefixes the key with the given scope', () => {
      const i18n = createI18n({ catalogs });
      const msgs = i18n.scope('messages');

      expect(msgs.tp('inbox', 0)).toBe('No messages');
      expect(msgs.tp('inbox', 1)).toBe('One message');
      expect(msgs.tp('inbox', 3)).toBe('3 messages');
    });

    test('t() passes vars through correctly', () => {
      const i18n = createI18n({ catalogs: { en: { user: { greeting: 'Hello, {name}!' } } } });
      const user = i18n.scope('user');

      expect(user.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
    });

    test('t() returns onMissing value for unknown scoped key', () => {
      const i18n = createI18n({ catalogs, onMissing: (info) => `[${info.key}]` });
      const nav = i18n.scope('nav');

      expect(nav.t('missing')).toBe('[nav.missing]');
    });

    test('follows active locale changes', async () => {
      const i18n = createI18n({ catalogs, locale: 'en' });
      const nav = i18n.scope('nav');

      expect(nav.t('home')).toBe('Home');
      await i18n.setLocale('fr');
      expect(nav.t('home')).toBe('Accueil');
    });

    test('multiple independent scopes on the same instance', () => {
      const i18n = createI18n({ catalogs });
      const nav = i18n.scope('nav');
      const msgs = i18n.scope('messages');

      expect(nav.t('home')).toBe('Home');
      expect(msgs.tp('inbox', 1)).toBe('One message');
    });

    test('returns the same object reference for repeated calls with the same prefix', () => {
      const i18n = createI18n({ catalogs });

      expect(i18n.scope('nav')).toBe(i18n.scope('nav'));
      expect(i18n.scope('messages')).toBe(i18n.scope('messages'));
    });
  });

  // ─── fmt ──────────────────────────────────────────────────────────────────

  describe('fmt', () => {
    test('formats numbers with the current locale', () => {
      const i18n = createI18n({ locale: 'en' });

      expect(i18n.fmt.number(1_234.56)).toContain('1,234');
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
