import { describe, expect, test, vi } from 'vitest';

import type { I18nSnapshot } from '../';

import { createI18n, createNamespace } from '../';

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

    test('calls onMissingKey for an unknown key', () => {
      const i18n = createI18n({ onMissingKey: (key) => `[key:${key}]` });

      expect(i18n.t('unknown')).toBe('[key:unknown]');
    });

    test('calls onMissingVar with varName for a missing interpolation variable', () => {
      const i18n = createI18n({
        catalogs: { en: { greeting: 'Hello, {name}!' } },
        onMissingVar: (varName) => `<${varName}>`,
      });

      expect(i18n.t('greeting')).toBe('Hello, <name>!');
    });

    test('onMissingKey receives both key and locale', () => {
      let capturedLocale = '';
      const i18n = createI18n({
        locale: 'fr',
        onMissingKey: (key, locale) => {
          capturedLocale = locale;

          return key;
        },
      });

      i18n.t('missing');
      expect(capturedLocale).toBe('fr');
    });

    test('onMissingVar receives varName, key, and locale', () => {
      let captured: [string, string, string] | undefined;
      const i18n = createI18n({
        catalogs: { en: { msg: 'Hi {name}' } },
        locale: 'en',
        onMissingVar: (varName, key, locale) => {
          captured = [varName, key, locale];

          return '';
        },
      });

      i18n.t('msg');
      expect(captured).toEqual(['name', 'msg', 'en']);
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

    test('resolves ordinal plural forms', () => {
      const i18n = createI18n({ catalogs });

      expect(i18n.tp('position', 1, { ordinal: true })).toBe('1st');
      expect(i18n.tp('position', 2, { ordinal: true })).toBe('2nd');
      expect(i18n.tp('position', 3, { ordinal: true })).toBe('3rd');
      expect(i18n.tp('position', 4, { ordinal: true })).toBe('4th');
    });

    test('accepts vars alongside ordinal', () => {
      const i18n = createI18n({
        catalogs: { en: { pos: { one: '{name} is {count}st', other: '{name} is {count}th' } } },
      });

      expect(i18n.tp('pos', 1, { ordinal: true, vars: { name: 'Alice' } })).toBe('Alice is 1st');
    });

    test('falls back to .other when the specific plural form is absent', () => {
      const i18n = createI18n({ catalogs: { en: { items: { other: '{count} items' } } } });

      expect(i18n.tp('items', 1)).toBe('1 items');
    });

    test('selects plural form using each fallback locale own CLDR rules', () => {
      // Russian count=5 → CLDR 'many'; if active locale is 'en' (count=5 → 'other'),
      // the fallback should still resolve using Russian rules when the key comes from 'ru'.
      const i18n = createI18n({
        catalogs: {
          en: {},
          ru: {
            items: {
              few: '{count} предмета',
              many: '{count} предметов',
              one: '{count} предмет',
              other: '{count} предмета',
            },
          },
        },
        fallback: 'ru',
        locale: 'en',
      });

      expect(i18n.tp('items', 1)).toBe('1 предмет'); // Russian 'one'
      expect(i18n.tp('items', 3)).toBe('3 предмета'); // Russian 'few'
      expect(i18n.tp('items', 5)).toBe('5 предметов'); // Russian 'many' — was incorrectly 'other' before fix
    });

    test('count=0 resolves .zero override before CLDR form in fallback locale', () => {
      const i18n = createI18n({
        catalogs: {
          en: {},
          ru: { items: { many: '{count} предметов', other: '{count} предмета', zero: 'Нет предметов' } },
        },
        fallback: 'ru',
        locale: 'en',
      });

      // Russian count=0 → CLDR 'many'; explicit .zero override should take precedence
      expect(i18n.tp('items', 0)).toBe('Нет предметов');
    });

    test('count=0 uses CLDR form from fallback locale when .zero is absent', () => {
      // Russian count=0 → CLDR 'many'; no .zero key present, so 'many' form should be used
      const i18n = createI18n({
        catalogs: {
          en: {},
          ru: { items: { many: 'много предметов', other: 'других предметов' } },
        },
        fallback: 'ru',
        locale: 'en',
      });

      expect(i18n.tp('items', 0)).toBe('много предметов');
    });

    test('throws when count is not finite', () => {
      const i18n = createI18n({ catalogs: { en: { items: { other: '{count}' } } } });

      expect(() => i18n.tp('items', Number.NaN)).toThrow('[lingua/E002] `count` must be a finite number.');
    });

    test('throws when vars.count is provided', () => {
      const i18n = createI18n({ catalogs: { en: { items: { other: '{count}' } } } });

      expect(() => i18n.tp('items', 2, { vars: { count: 'custom' } })).toThrow(
        '[lingua/E003] `tp` does not allow `vars.count`; `count` is injected automatically.',
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

    test('throws for an invalid BCP 47 locale tag at construction', () => {
      expect(() => createI18n({ locale: 'not a valid locale' })).toThrow(
        '[lingua/E004] Invalid BCP 47 locale tag: "not a valid locale".',
      );
    });

    test('throws when setLocale receives an invalid locale tag', async () => {
      await expect(createI18n().setLocale('not_valid')).rejects.toThrow('[lingua/E004]');
    });

    test('throws when register receives an invalid locale tag', () => {
      expect(() => createI18n().register('not_valid', { hello: 'Hi' })).toThrow('[lingua/E004]');
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
        '[lingua/E001] Missing locale source for "de".',
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
        '[lingua/E001] Missing locale source for "de".',
      );
    });

    test('keeps current locale unchanged when setLocale throws', async () => {
      const i18n = createI18n({ locale: 'en' });

      await expect(i18n.setLocale('de')).rejects.toThrow('[lingua/E001] Missing locale source for "de".');
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
      expect(spy).toHaveBeenCalledWith('[@vielzeug/lingua] subscriber error', error);
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

    test('returns false for a pipe-plural base key (expanded to sub-keys)', () => {
      const i18n = createI18n({ catalogs: { en: { inbox: 'One message|{count} messages' } } });

      expect(i18n.has('inbox')).toBe(false);
      expect(i18n.has('inbox.one')).toBe(true);
      expect(i18n.has('inbox.other')).toBe(true);
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

    test('returns locales in code-point order when sorted is true', () => {
      const i18n = createI18n({ catalogs: { de: {}, 'en-US': {}, 'zh-Hant': {} } });

      // Code-point sort: '-' (0x2D) < uppercase letters < lowercase, so 'de' < 'en-US' < 'zh-Hant'.
      expect(i18n.getSupportedLocales(true)).toEqual(['de', 'en-US', 'zh-Hant']);
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

    test('t() returns onMissingKey value for unknown scoped key', () => {
      const i18n = createI18n({ catalogs, onMissingKey: (key) => `[${key}]` });
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

    test('fmt is the same formatter instance as the parent i18n.fmt', () => {
      const i18n = createI18n({ catalogs });
      const nav = i18n.scope('nav');

      expect(nav.fmt).toBe(i18n.fmt);
    });

    test('tp() passes TpOptions through correctly', () => {
      const i18n = createI18n({
        catalogs: {
          en: {
            leaderboard: {
              place: { few: '{count}rd', one: '{count}st', other: '{count}th', two: '{count}nd' },
            },
          },
        },
      });
      const board = i18n.scope('leaderboard');

      expect(board.tp('place', 1, { ordinal: true })).toBe('1st');
      expect(board.tp('place', 2, { ordinal: true })).toBe('2nd');
      expect(board.tp('place', 4, { ordinal: true })).toBe('4th');
    });

    test('scope() returns a new object on every call (reference inequality)', () => {
      const i18n = createI18n({ catalogs });

      expect(i18n.scope('nav')).not.toBe(i18n.scope('nav'));
    });
  });

  // ─── prototype pollution guard ─────────────────────────────────────────────

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

  // ─── merge() ────────────────────────────────────────────────────────────────

  describe('merge()', () => {
    test('adds new keys to an existing static catalog', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      await i18n.merge('en', { world: 'World' });
      expect(i18n.t('hello')).toBe('Hello');
      expect(i18n.t('world')).toBe('World');
    });

    test('overrides existing keys with merged values', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      await i18n.merge('en', { hello: 'Hi' });
      expect(i18n.t('hello')).toBe('Hi');
    });

    test('creates a new catalog when the locale is not yet registered', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      await i18n.merge('fr', { hello: 'Bonjour' });
      expect(i18n.getSupportedLocales()).toContain('fr');
    });

    test('accepts an async loader as the merge source', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      await i18n.merge('en', async () => ({ world: 'World' }));
      expect(i18n.t('world')).toBe('World');
    });

    test('supports nested message objects and preserves sibling keys', async () => {
      const i18n = createI18n({ catalogs: { en: { nav: { home: 'Home' } } } });

      await i18n.merge('en', { footer: { contact: 'Contact' }, nav: { about: 'About' } });
      expect(i18n.t('nav.home')).toBe('Home');
      expect(i18n.t('nav.about')).toBe('About');
      expect(i18n.t('footer.contact')).toBe('Contact');
    });

    test('notifies subscribers after merging into the active locale', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } }, locale: 'en' });
      const listener = vi.fn();

      i18n.subscribe(listener);
      await i18n.merge('en', { world: 'World' });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    test('does not notify subscribers when merging into an inactive locale', async () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        locale: 'en',
      });
      const listener = vi.fn();

      i18n.subscribe(listener);
      await i18n.merge('fr', { world: 'Monde' });
      expect(listener).not.toHaveBeenCalled();
    });

    test('waits for a pending dynamic load before merging, preserving base keys', async () => {
      let loaderCalled = 0;
      const i18n = createI18n({
        catalogs: {
          en: { hello: 'Hello' },
          fr: () => {
            loaderCalled++;

            return Promise.resolve({ hello: 'Bonjour' });
          },
        },
        locale: 'en',
      });

      await i18n.merge('fr', { world: 'Monde' });

      expect(loaderCalled).toBe(1);

      await i18n.setLocale('fr');
      expect(i18n.t('hello')).toBe('Bonjour');
      expect(i18n.t('world')).toBe('Monde');
    });

    test('concurrent merge() calls both apply their keys', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      await Promise.all([i18n.merge('en', { a: 'A' }), i18n.merge('en', { b: 'B' })]);
      expect(i18n.t('hello')).toBe('Hello');
      expect(i18n.t('a')).toBe('A');
      expect(i18n.t('b')).toBe('B');
    });

    test('register() after merge() fully replaces the catalog, discarding merged keys', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } }, locale: 'en' });

      await i18n.merge('en', { world: 'World' });
      expect(i18n.t('world')).toBe('World');

      i18n.register('en', { hello: 'Hi' });
      expect(i18n.t('hello')).toBe('Hi');
      expect(i18n.t('world')).toBe('world'); // falls through to onMissingKey (returns key)
    });

    test('notifies subscribers and resolves via fallback when merging into a fallback locale', async () => {
      const i18n = createI18n({
        catalogs: { en: {}, fr: {} },
        fallback: 'fr',
        locale: 'en',
      });
      const listener = vi.fn();

      i18n.subscribe(listener);
      await i18n.merge('fr', { extra: 'Supplément' });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(i18n.t('extra')).toBe('Supplément');
    });

    test('rejects when the source loader throws and leaves catalog unchanged', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      await expect(i18n.merge('en', () => Promise.reject(new Error('network')))).rejects.toThrow('network');
      expect(i18n.t('hello')).toBe('Hello');
    });

    test('throws for an invalid locale tag', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      await expect(i18n.merge('not_valid', { hello: 'Hi' })).rejects.toThrow('[lingua/E004]');
    });

    test('surfaces loader rejection when the locale has a pending async loader', async () => {
      // merge() awaits preload() when the locale has an unresolved loader.
      // If that loader rejects, merge() should surface the loader's error.
      const i18n = createI18n({
        catalogs: {
          de: () => Promise.reject(new Error('de-loader-fail')),
          en: { hello: 'Hello' },
        },
      });

      await expect(i18n.merge('de', { extra: 'Zusatz' })).rejects.toThrow('de-loader-fail');
    });
  });

  // ─── fmt ──────────────────────────────────────────────────────────────────

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

  // ─── namespaces ────────────────────────────────────────────────────────────

  describe('namespaces', () => {
    test('loadNamespace() merges translations into the active locale catalog', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      i18n.registerNamespace('settings', () => ({ lang: 'Language', theme: 'Theme' }));
      await i18n.loadNamespace('settings');

      expect(i18n.t('theme')).toBe('Theme');
      expect(i18n.t('lang')).toBe('Language');
      expect(i18n.t('hello')).toBe('Hello');
    });

    test('loadNamespace() loads for a specific locale', async () => {
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });

      i18n.registerNamespace('nav', (locale) => (locale === 'fr' ? { home: 'Accueil' } : { home: 'Home' }));
      await i18n.loadNamespace('nav', 'fr');
      await i18n.setLocale('fr');

      expect(i18n.t('home')).toBe('Accueil');
    });

    test('loadNamespace() deduplicates concurrent calls (source loaded at most once)', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: {} } });

      i18n.registerNamespace('settings', () => {
        calls++;

        return { x: 'X' };
      });

      await Promise.all([
        i18n.loadNamespace('settings'),
        i18n.loadNamespace('settings'),
        i18n.loadNamespace('settings'),
      ]);
      expect(calls).toBe(1);
    });

    test('loadNamespace() is a no-op on repeated calls after loading', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: {} } });

      i18n.registerNamespace('settings', () => {
        calls++;

        return { x: 'X' };
      });

      await i18n.loadNamespace('settings');
      await i18n.loadNamespace('settings');
      await i18n.loadNamespace('settings');
      expect(calls).toBe(1);
    });

    test('loadNamespace() throws for an unregistered namespace', async () => {
      const i18n = createI18n({ catalogs: { en: {} } });

      await expect(i18n.loadNamespace('unknown')).rejects.toThrow(
        '[lingua/E005] Namespace "unknown" is not registered.',
      );
    });

    test('loadNamespace() uses the active locale when locale argument is omitted', async () => {
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'fr' });

      i18n.registerNamespace('ui', (locale) => (locale === 'fr' ? { save: 'Sauvegarder' } : { save: 'Save' }));
      await i18n.loadNamespace('ui');

      expect(i18n.t('save')).toBe('Sauvegarder');
    });

    test('loadNamespace() supports async loader sources', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      i18n.registerNamespace('settings', async () => ({ lang: 'Language' }));
      await i18n.loadNamespace('settings');

      expect(i18n.t('lang')).toBe('Language');
      expect(i18n.t('hello')).toBe('Hello');
    });

    test('different locales are tracked independently per namespace', async () => {
      let enCalls = 0;
      let frCalls = 0;
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });

      i18n.registerNamespace('ui', (locale) => {
        if (locale === 'en') enCalls++;
        else frCalls++;

        return locale === 'fr' ? { save: 'Sauvegarder' } : { save: 'Save' };
      });

      await i18n.loadNamespace('ui', 'en');
      await i18n.loadNamespace('ui', 'fr');
      // Repeat — should not re-load
      await i18n.loadNamespace('ui', 'en');
      await i18n.loadNamespace('ui', 'fr');

      expect(enCalls).toBe(1);
      expect(frCalls).toBe(1);
    });

    test('register() clears namespace dedup markers so they can be re-applied', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: { base: 'Base' } } });

      i18n.registerNamespace('ui', () => {
        calls++;

        return { extra: 'Extra' };
      });

      await i18n.loadNamespace('ui');
      expect(calls).toBe(1);
      expect(i18n.t('extra')).toBe('Extra');

      // register() replaces the full catalog, discarding namespace-merged keys
      i18n.register('en', { base: 'NewBase' });
      expect(i18n.t('extra')).toBe('extra'); // key gone — returns key string

      // loadNamespace() should re-apply since register() cleared the marker
      await i18n.loadNamespace('ui');
      expect(calls).toBe(2);
      expect(i18n.t('extra')).toBe('Extra');
    });

    test('restoreState() clears namespace dedup markers so they can be re-applied', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: { base: 'Base' } } });

      i18n.registerNamespace('ui', () => {
        calls++;

        return { extra: 'Extra' };
      });

      await i18n.loadNamespace('ui');
      expect(calls).toBe(1);
      expect(i18n.t('extra')).toBe('Extra');

      // restoreState() replaces the catalog — namespace keys are gone
      i18n.restoreState({ catalogs: { en: { base: 'RestoredBase' } }, locale: 'en' });
      expect(i18n.t('extra')).toBe('extra'); // key gone

      // loadNamespace() should re-apply since restoreState() cleared the marker
      await i18n.loadNamespace('ui');
      expect(calls).toBe(2);
      expect(i18n.t('extra')).toBe('Extra');
    });

    test('namespace task key with colon in name does not collide with locale', async () => {
      // "user:settings" ns + "en" locale → key "user:settings\x00en"
      // Should not interfere with ns "user" + locale "settings:en" (invalid BCP47 anyway)
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: {} } });

      i18n.registerNamespace('user:settings', () => {
        calls++;

        return { profile: 'Profile' };
      });

      await i18n.loadNamespace('user:settings');
      await i18n.loadNamespace('user:settings'); // no-op

      expect(calls).toBe(1);
      expect(i18n.t('profile')).toBe('Profile');
    });
  });

  // ─── subscribe() — signal option ──────────────────────────────────────────

  describe('subscribe() — signal option', () => {
    test('unsubscribes when the provided AbortSignal fires', async () => {
      const i18n = createI18n({ catalogs: { de: {}, en: {}, fr: {} }, locale: 'en' });
      const controller = new AbortController();
      const calls: string[] = [];

      i18n.subscribe(({ locale }) => calls.push(locale), { signal: controller.signal });

      await i18n.setLocale('fr');
      controller.abort();
      await i18n.setLocale('de');

      expect(calls).toEqual(['fr']);
    });

    test('does not subscribe when signal is already aborted', async () => {
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });
      const controller = new AbortController();

      controller.abort();

      const callback = vi.fn();

      i18n.subscribe(callback, { signal: controller.signal });
      await i18n.setLocale('fr');

      expect(callback).not.toHaveBeenCalled();
    });

    test('already-aborted signal with immediate: true does not call callback', () => {
      const i18n = createI18n({ catalogs: { en: {} }, locale: 'en' });
      const controller = new AbortController();

      controller.abort();

      const callback = vi.fn();

      i18n.subscribe(callback, { immediate: true, signal: controller.signal });

      expect(callback).not.toHaveBeenCalled();
    });

    test('subscriber that throws on immediate is not added to the active subscriber set', async () => {
      const errors: unknown[] = [];
      const i18n = createI18n({
        catalogs: { en: {}, fr: {} },
        locale: 'en',
        onSubscriberError: (e) => errors.push(e),
      });

      let callCount = 0;
      const throwingCb = vi.fn(() => {
        callCount++;
        throw new Error('immediate error');
      });

      i18n.subscribe(throwingCb, { immediate: true });

      // The immediate invocation threw — onSubscriberError was called
      expect(errors).toHaveLength(1);

      // Trigger a bump; the subscriber must NOT fire again
      await i18n.setLocale('fr');
      expect(callCount).toBe(1);
    });
  });

  // ─── compile mode (F2) ────────────────────────────────────────────────────

  describe('compile mode', () => {
    test('t() resolves correctly with compile: true', () => {
      const i18n = createI18n({
        catalogs: { en: { greeting: 'Hello, {name}!' } },
        compile: true,
      });

      expect(i18n.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
    });

    test('tp() resolves correctly with compile: true', () => {
      const i18n = createI18n({
        catalogs: { en: { inbox: { one: 'One message', other: '{count} messages' } } },
        compile: true,
      });

      expect(i18n.tp('inbox', 1)).toBe('One message');
      expect(i18n.tp('inbox', 5)).toBe('5 messages');
    });

    test('missing variable calls onMissingVar with compile: true', () => {
      const i18n = createI18n({
        catalogs: { en: { greeting: 'Hello, {name}!' } },
        compile: true,
        onMissingVar: (varName) => `<${varName}>`,
      });

      expect(i18n.t('greeting')).toBe('Hello, <name>!');
    });

    test('merge() re-compiles newly added keys', async () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' } },
        compile: true,
      });

      await i18n.merge('en', { farewell: 'Bye, {name}!' });
      expect(i18n.t('farewell', { name: 'Bob' })).toBe('Bye, Bob!');
    });

    test('register() re-compiles replaced catalog', () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' } },
        compile: true,
      });

      i18n.register('en', { hello: 'Hi, {name}!' });
      expect(i18n.t('hello', { name: 'Alice' })).toBe('Hi, Alice!');
    });

    test('restoreState() compiles restored catalog', async () => {
      const server = createI18n({ catalogs: { en: { msg: 'Value: {v}' } }, compile: true });
      const state = server.getState();
      const client = createI18n({ compile: true });

      client.restoreState(state);
      expect(client.t('msg', { v: '42' })).toBe('Value: 42');
    });

    test('plain mode and compile mode produce identical output', () => {
      const catalog = {
        en: {
          greeting: 'Hello, {name}!',
          inbox: { one: 'One message', other: '{count} messages', zero: 'No messages' },
        },
      };
      const plain = createI18n({ catalogs: catalog });
      const compiled = createI18n({ catalogs: catalog, compile: true });

      expect(compiled.t('greeting', { name: 'World' })).toBe(plain.t('greeting', { name: 'World' }));
      expect(compiled.tp('inbox', 0)).toBe(plain.tp('inbox', 0));
      expect(compiled.tp('inbox', 1)).toBe(plain.tp('inbox', 1));
      expect(compiled.tp('inbox', 5)).toBe(plain.tp('inbox', 5));
    });
  });

  // ─── getState() / restoreState() (F5) ─────────────────────────────────────

  describe('getState() / restoreState()', () => {
    test('getState() returns the active locale and all loaded catalogs', () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello', nav: { home: 'Home' } } },
        locale: 'en',
      });
      const state = i18n.getState();

      expect(state.locale).toBe('en');
      expect(state.catalogs['en']?.['hello']).toBe('Hello');
      expect(state.catalogs['en']?.['nav.home']).toBe('Home');
    });

    test('getState() only includes already-loaded catalogs (not pending loaders)', async () => {
      const i18n = createI18n({
        catalogs: {
          en: { hello: 'Hello' },
          fr: async () => ({ hello: 'Bonjour' }),
        },
        locale: 'en',
      });
      const stateBefore = i18n.getState();

      expect(Object.keys(stateBefore.catalogs)).toEqual(['en']);

      await i18n.preload('fr');

      const stateAfter = i18n.getState();

      expect(Object.keys(stateAfter.catalogs)).toContain('fr');
    });

    test('restoreState() hydrates catalogs and switches locale', () => {
      const server = createI18n({
        catalogs: { de: { title: 'Titel' }, en: { title: 'Title' } },
        locale: 'de',
      });
      const state = server.getState();

      const client = createI18n({ catalogs: { de: {}, en: {} } });

      client.restoreState(state);
      expect(client.locale).toBe('de');
      expect(client.t('title')).toBe('Titel');
    });

    test('restoreState() adds previously unknown locales', () => {
      const state = {
        catalogs: { fr: { greeting: 'Bonjour' } },
        locale: 'fr',
      };
      const i18n = createI18n();

      i18n.restoreState(state);
      expect(i18n.t('greeting')).toBe('Bonjour');
      expect(i18n.getSupportedLocales()).toContain('fr');
    });

    test('restoreState() notifies subscribers', () => {
      const i18n = createI18n({ catalogs: { en: {} }, locale: 'en' });
      const listener = vi.fn();

      i18n.subscribe(listener);
      i18n.restoreState({ catalogs: { de: {} }, locale: 'de' });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0]?.[0]?.locale).toBe('de');
    });

    test('restoreState() then t() resolves from restored catalog', () => {
      const i18n = createI18n();

      i18n.restoreState({ catalogs: { es: { hello: 'Hola' } }, locale: 'es' });
      expect(i18n.t('hello')).toBe('Hola');
    });

    test('restoreState() preserves active fallback chain resolution', () => {
      const server = createI18n({
        catalogs: { en: { title: 'Title' }, fr: {} },
        fallback: 'en',
        locale: 'fr',
      });
      const state = server.getState();

      const client = createI18n({ fallback: 'en', locale: 'fr' });

      client.restoreState(state);
      expect(client.t('title')).toBe('Title');
    });

    test('getState() → restoreState() round-trips correctly', async () => {
      const original = createI18n({
        catalogs: { en: { greeting: 'Hello, {name}!' }, fr: { greeting: 'Bonjour, {name}!' } },
        locale: 'en',
      });

      await original.preload('fr');

      const state = original.getState();
      const hydrated = createI18n();

      hydrated.restoreState(state);
      expect(hydrated.locale).toBe('en');
      expect(hydrated.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');

      await hydrated.setLocale('fr');
      expect(hydrated.t('greeting', { name: 'Alice' })).toBe('Bonjour, Alice!');
    });
  });

  // ─── pipe-delimited plural shorthand (F1) ─────────────────────────────────

  describe('pipe-delimited plural shorthand', () => {
    test('2-part pipe maps to one | other', () => {
      const i18n = createI18n({ catalogs: { en: { inbox: 'One message|{count} messages' } } });

      expect(i18n.tp('inbox', 1)).toBe('One message');
      expect(i18n.tp('inbox', 5)).toBe('5 messages');
    });

    test('3-part pipe maps to zero | one | other', () => {
      const i18n = createI18n({ catalogs: { en: { inbox: 'No messages|One message|{count} messages' } } });

      expect(i18n.tp('inbox', 0)).toBe('No messages');
      expect(i18n.tp('inbox', 1)).toBe('One message');
      expect(i18n.tp('inbox', 5)).toBe('5 messages');
    });

    test('6-part pipe maps to all CLDR forms', () => {
      const i18n = createI18n({
        catalogs: { ar: { items: 'صفر|واحد|اثنان|قليل|كثير|أخرى' } },
        locale: 'ar',
      });

      expect(i18n.tp('items', 0)).toBe('صفر');
      expect(i18n.tp('items', 1)).toBe('واحد');
      expect(i18n.tp('items', 2)).toBe('اثنان');
    });

    test('4-part pipe is treated as a plain string (no expansion)', () => {
      const i18n = createI18n({ catalogs: { en: { value: 'a|b|c|d' } } });

      expect(i18n.t('value')).toBe('a|b|c|d');
    });

    test('5-part pipe is treated as a plain string (no expansion)', () => {
      const i18n = createI18n({ catalogs: { en: { value: 'a|b|c|d|e' } } });

      expect(i18n.t('value')).toBe('a|b|c|d|e');
    });

    test('string without pipe is unaffected', () => {
      const i18n = createI18n({ catalogs: { en: { greeting: 'Hello, {name}!' } } });

      expect(i18n.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
    });

    test('pipe plural works via merge()', async () => {
      const i18n = createI18n({ catalogs: { en: {} } });

      await i18n.merge('en', { items: 'One item|{count} items' });
      expect(i18n.tp('items', 1)).toBe('One item');
      expect(i18n.tp('items', 3)).toBe('3 items');
    });

    test('pipe plural works via register()', () => {
      const i18n = createI18n({ catalogs: { en: {} } });

      i18n.register('en', { items: 'One item|{count} items' });
      expect(i18n.tp('items', 1)).toBe('One item');
      expect(i18n.tp('items', 3)).toBe('3 items');
    });

    test('pipe plural works with compile: true', () => {
      const i18n = createI18n({ catalogs: { en: { inbox: 'One message|{count} messages' } }, compile: true });

      expect(i18n.tp('inbox', 1)).toBe('One message');
      expect(i18n.tp('inbox', 5)).toBe('5 messages');
    });

    test('pipe plural is visible in getState() as expanded flat keys', () => {
      const i18n = createI18n({ catalogs: { en: { inbox: 'One message|{count} messages' } } });
      const state = i18n.getState();

      expect(state.catalogs['en']?.['inbox.one']).toBe('One message');
      expect(state.catalogs['en']?.['inbox.other']).toBe('{count} messages');
      expect(state.catalogs['en']?.['inbox']).toBeUndefined();
    });

    test('round-trips through getState() and restoreState()', () => {
      const original = createI18n({ catalogs: { en: { inbox: 'One message|{count} messages' } } });
      const state = original.getState();
      const hydrated = createI18n();

      hydrated.restoreState(state);
      expect(hydrated.tp('inbox', 1)).toBe('One message');
      expect(hydrated.tp('inbox', 5)).toBe('5 messages');
    });
  });

  // ─── bind() — per-key translation binding ─────────────────────────────────────

  describe('bind()', () => {
    test('returns a function that translates the key', () => {
      const i18n = createI18n({ catalogs: { en: { greeting: 'Hello, {name}!' } } });
      const greet = i18n.bind('greeting');

      expect(greet({ name: 'Alice' })).toBe('Hello, Alice!');
      expect(greet({ name: 'Bob' })).toBe('Hello, Bob!');
    });

    test('works without vars on a static message', () => {
      const i18n = createI18n({ catalogs: { en: { msg: 'Static message' } } });
      const fn = i18n.bind('msg');

      expect(fn()).toBe('Static message');
    });

    test('calls onMissingKey when the key is absent', () => {
      const i18n = createI18n({ onMissingKey: (k) => `[${k}]` });
      const fn = i18n.bind('missing' as any);

      expect(fn()).toBe('[missing]');
    });

    test('invalidates and re-looks up after setLocale()', async () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        locale: 'en',
      });
      const hello = i18n.bind('hello');

      expect(hello()).toBe('Hello');
      await i18n.setLocale('fr');
      expect(hello()).toBe('Bonjour');
    });

    test('invalidates after catalog mutation via register()', () => {
      const i18n = createI18n({ catalogs: { en: { msg: 'Original' } } });
      const fn = i18n.bind('msg');

      expect(fn()).toBe('Original');
      i18n.register('en', { msg: 'Updated' });
      expect(fn()).toBe('Updated');
    });

    test('invalidates after catalog mutation via merge()', async () => {
      const i18n = createI18n({ catalogs: { en: { msg: 'Original' } } });
      const fn = i18n.bind('msg');

      expect(fn()).toBe('Original');
      await i18n.merge('en', { msg: 'Merged' });
      expect(fn()).toBe('Merged');
    });

    test('works with compile: true mode', () => {
      const i18n = createI18n({ catalogs: { en: { greeting: 'Hello, {name}!' } }, compile: true });
      const greet = i18n.bind('greeting');

      expect(greet({ name: 'Alice' })).toBe('Hello, Alice!');
    });

    test('resolves through the fallback chain', () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: {} },
        fallback: 'en',
        locale: 'fr',
      });
      const hello = i18n.bind('hello');

      expect(hello()).toBe('Hello');
    });

    test('multiple independent bind() bindings on the same instance', () => {
      const i18n = createI18n({ catalogs: { en: { a: 'Alpha', b: 'Beta' } } });
      const a = i18n.bind('a');
      const b = i18n.bind('b');

      expect(a()).toBe('Alpha');
      expect(b()).toBe('Beta');
    });

    test('invalidates cached entry after setLocale() with compile: true', async () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        compile: true,
        locale: 'en',
      });
      const hello = i18n.bind('hello');

      expect(hello()).toBe('Hello');
      await i18n.setLocale('fr');
      expect(hello()).toBe('Bonjour');
    });
  });

  // ─── bindPlural() ─────────────────────────────────────────────────────────

  describe('bindPlural()', () => {
    test('returns a function that translates a plural key', () => {
      const i18n = createI18n({
        catalogs: { en: { inbox: { one: 'One message', other: '{count} messages' } } },
      });
      const inbox = i18n.bindPlural('inbox');

      expect(inbox(1)).toBe('One message');
      expect(inbox(5)).toBe('5 messages');
    });

    test('calls onMissingKey for an unknown plural key', () => {
      const i18n = createI18n({ onMissingKey: (k) => `MISSING:${k}` });
      const fn = i18n.bindPlural('ghost' as any);

      expect(fn(1)).toBe('MISSING:ghost');
    });

    test('invalidates after setLocale()', async () => {
      const i18n = createI18n({
        catalogs: {
          de: { items: { one: 'Ein Element', other: '{count} Elemente' } },
          en: { items: { one: 'One item', other: '{count} items' } },
        },
        locale: 'en',
      });
      const items = i18n.bindPlural('items');

      expect(items(1)).toBe('One item');
      await i18n.setLocale('de');
      expect(items(1)).toBe('Ein Element');
    });

    test('supports TpOptions ordinal', () => {
      const i18n = createI18n({
        catalogs: { en: { position: { few: '{count}rd', one: '{count}st', other: '{count}th', two: '{count}nd' } } },
      });
      const pos = i18n.bindPlural('position');

      expect(pos(1, { ordinal: true })).toBe('1st');
      expect(pos(2, { ordinal: true })).toBe('2nd');
    });

    test('works with compile: true', () => {
      const i18n = createI18n({
        catalogs: { en: { inbox: { one: 'One message', other: '{count} messages' } } },
        compile: true,
      });
      const inbox = i18n.bindPlural('inbox');

      expect(inbox(1)).toBe('One message');
      expect(inbox(7)).toBe('7 messages');
    });

    test('works with pipe-plural shorthand expansion', () => {
      const i18n = createI18n({ catalogs: { en: { alerts: 'One alert|{count} alerts' } } });
      const alerts = i18n.bindPlural('alerts');

      expect(alerts(1)).toBe('One alert');
      expect(alerts(5)).toBe('5 alerts');
    });
  });

  // ─── fork() (F4) ──────────────────────────────────────────────────────────

  describe('fork()', () => {
    test('inherits current catalog state', () => {
      const parent = createI18n({ catalogs: { en: { hello: 'Hello' } }, locale: 'en' });
      const child = parent.fork();

      expect(child.t('hello')).toBe('Hello');
    });

    test('fork without arguments inherits the parent locale', () => {
      const parent = createI18n({ catalogs: { en: {} }, locale: 'en' });
      const child = parent.fork();

      expect(child.locale).toBe('en');
    });

    test('can be given a different locale', () => {
      const parent = createI18n({
        catalogs: { de: { hello: 'Hallo' }, en: { hello: 'Hello' } },
        locale: 'en',
      });
      const child = parent.fork({ locale: 'de' });

      expect(child.locale).toBe('de');
      expect(child.t('hello')).toBe('Hallo');
      expect(parent.locale).toBe('en');
    });

    test('catalog mutations on the fork do not affect the parent', () => {
      const parent = createI18n({ catalogs: { en: { hello: 'Hello' } }, locale: 'en' });
      const child = parent.fork();

      child.register('en', { hello: 'Hi' });
      expect(child.t('hello')).toBe('Hi');
      expect(parent.t('hello')).toBe('Hello');
    });

    test('catalog mutations on the parent do not affect the fork', () => {
      const parent = createI18n({ catalogs: { en: { hello: 'Hello' } }, locale: 'en' });
      const child = parent.fork();

      parent.register('en', { hello: 'Hi from parent' });
      expect(child.t('hello')).toBe('Hello');
    });

    test('locale changes on the fork do not affect the parent', async () => {
      const parent = createI18n({ catalogs: { de: {}, en: {} }, locale: 'en' });
      const child = parent.fork();

      await child.setLocale('de');
      expect(child.locale).toBe('de');
      expect(parent.locale).toBe('en');
    });

    test('locale changes on the parent do not affect the fork', async () => {
      const parent = createI18n({ catalogs: { de: {}, en: {} }, locale: 'en' });
      const child = parent.fork();

      await parent.setLocale('de');
      expect(parent.locale).toBe('de');
      expect(child.locale).toBe('en');
    });

    test('inherits loaders for unresolved locales', async () => {
      const parent = createI18n({
        catalogs: {
          en: { hello: 'Hello' },
          fr: async () => ({ hello: 'Bonjour' }),
        },
        locale: 'en',
      });
      const child = parent.fork({ locale: 'en' });

      await child.setLocale('fr');
      expect(child.t('hello')).toBe('Bonjour');
    });

    test('accepts a custom onMissingKey', () => {
      const parent = createI18n({ catalogs: { en: {} }, locale: 'en' });
      const child = parent.fork({ onMissingKey: (k) => `MISSING:${k}` });

      expect(child.t('unknown' as any)).toBe('MISSING:unknown');
      expect(parent.t('unknown' as any)).toBe('unknown');
    });

    test('inherits parent fallback when none specified', () => {
      const parent = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: {} },
        fallback: 'en',
        locale: 'fr',
      });
      const child = parent.fork();

      expect(child.t('hello')).toBe('Hello');
    });

    test('fork can override the fallback chain', () => {
      const parent = createI18n({
        catalogs: { de: {}, en: { hello: 'Hello' }, fr: {} },
        fallback: 'en',
        locale: 'fr',
      });
      const child = parent.fork({ fallback: 'fr', locale: 'de' });

      // 'fr' catalog is empty, no key via fallback, returns key string
      expect(child.t('hello' as any)).toBe('hello');
    });

    test('fork of a fork is independent of the grandparent', () => {
      const grandparent = createI18n({ catalogs: { en: { msg: 'Original' } }, locale: 'en' });
      const parent = grandparent.fork();
      const child = parent.fork();

      child.register('en', { msg: 'Child' });
      expect(child.t('msg')).toBe('Child');
      expect(parent.t('msg')).toBe('Original');
      expect(grandparent.t('msg')).toBe('Original');
    });

    test('subscribers on the fork are independent of the parent', async () => {
      const parent = createI18n({ catalogs: { de: {}, en: {} }, locale: 'en' });
      const child = parent.fork();
      const parentListener = vi.fn();
      const childListener = vi.fn();

      parent.subscribe(parentListener);
      child.subscribe(childListener);

      await parent.setLocale('de');
      expect(parentListener).toHaveBeenCalledTimes(1);
      expect(childListener).not.toHaveBeenCalled();
    });

    test('preserves nested catalog structure through the fork', () => {
      const parent = createI18n({ catalogs: { en: { nav: { about: 'About', home: 'Home' } } }, locale: 'en' });
      const child = parent.fork();

      expect(child.t('nav.home')).toBe('Home');
      expect(child.t('nav.about')).toBe('About');
    });

    test('inherits compile mode and renders compiled templates correctly', () => {
      const parent = createI18n({
        catalogs: { en: { greeting: 'Hello, {name}!' } },
        compile: true,
        locale: 'en',
      });
      const child = parent.fork();

      expect(child.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
    });

    test('inherits the namespace registry from the parent', async () => {
      const parent = createI18n({ catalogs: { en: { base: 'Base' } }, locale: 'en' });

      parent.registerNamespace('ui', () => ({ btn: 'Click me' }));

      const child = parent.fork();

      await child.loadNamespace('ui');
      expect(child.t('btn')).toBe('Click me');
    });

    test('namespace mutations on the fork do not affect the parent', async () => {
      const parent = createI18n({ catalogs: { en: {} }, locale: 'en' });

      parent.registerNamespace('ui', () => ({ btn: 'Click me' }));

      const child = parent.fork();

      await child.loadNamespace('ui');
      expect(child.t('btn')).toBe('Click me');
      expect(parent.t('btn')).toBe('btn'); // parent did not load the namespace
    });

    test('namespaces registered after forking are not visible on the fork', async () => {
      const parent = createI18n({ catalogs: { en: {} }, locale: 'en' });
      const child = parent.fork();

      parent.registerNamespace('afterFork', () => ({ x: 'X' }));

      await expect(child.loadNamespace('afterFork')).rejects.toThrow('[lingua/E005]');
    });
  });

  // ─── pipe-plural edge cases ────────────────────────────────────────────────

  describe('pipe-plural edge cases', () => {
    test('pipe with a leading empty segment is treated as a plain string', () => {
      const i18n = createI18n({ catalogs: { en: { value: '|{count} items' } } });

      // Not expanded — the pipe value has an empty first part.
      expect(i18n.t('value')).toBe('|{count} items');
    });

    test('pipe with a trailing empty segment is treated as a plain string', () => {
      const i18n = createI18n({ catalogs: { en: { value: 'One item|' } } });

      expect(i18n.t('value')).toBe('One item|');
    });

    test('pipe with an internal empty segment is treated as a plain string', () => {
      const i18n = createI18n({ catalogs: { en: { value: 'zero||other' } } });

      expect(i18n.t('value')).toBe('zero||other');
    });
  });

  // ─── restoreState() — knownLocales consistency ────────────────────────────

  describe('restoreState() — knownLocales consistency', () => {
    test('throws [lingua/E006] when state.locale is absent from state.catalogs', () => {
      const i18n = createI18n();

      expect(() => i18n.restoreState({ catalogs: {}, locale: 'fr' })).toThrowError('[lingua/E006]');
    });

    test('active locale appears in getSupportedLocales() after valid restoreState()', () => {
      const i18n = createI18n();

      i18n.restoreState({ catalogs: { fr: { hello: 'Bonjour' } }, locale: 'fr' });
      expect(i18n.getSupportedLocales()).toContain('fr');
    });
  });

  // ─── scope().bind() / scope().bindPlural() ────────────────────────────────

  describe('scope().bind() and scope().bindPlural()', () => {
    test('scope().bind() resolves the scoped key', () => {
      const i18n = createI18n({ catalogs: { en: { nav: { about: 'About', home: 'Home' } } } });
      const nav = i18n.scope('nav');
      const home = nav.bind('home');

      expect(home()).toBe('Home');
    });

    test('scope().bind() supports variable interpolation', () => {
      const i18n = createI18n({ catalogs: { en: { user: { greeting: 'Hello, {name}!' } } } });
      const user = i18n.scope('user');
      const greet = user.bind('greeting');

      expect(greet({ name: 'Alice' })).toBe('Hello, Alice!');
    });

    test('scope().bind() invalidates on locale change', async () => {
      const i18n = createI18n({
        catalogs: {
          de: { nav: { home: 'Startseite' } },
          en: { nav: { home: 'Home' } },
        },
      });
      const nav = i18n.scope('nav');
      const home = nav.bind('home');

      expect(home()).toBe('Home');

      await i18n.setLocale('de');

      expect(home()).toBe('Startseite');
    });

    test('scope().bind() calls onMissingKey for unknown key', () => {
      const i18n = createI18n({ onMissingKey: (k) => `[missing:${k}]` });
      const nav = i18n.scope('nav');
      const home = nav.bind('home');

      expect(home()).toBe('[missing:nav.home]');
    });

    test('scope().bindPlural() resolves plural forms', () => {
      const i18n = createI18n({
        catalogs: { en: { inbox: { one: 'One message', other: '{count} messages', zero: 'No messages' } } },
      });
      const root = i18n.scope('inbox');
      const count = root.bindPlural('other');

      // bindPlural on 'inbox.other' would look for 'inbox.other.one' etc.
      // More useful: scope on parent and bindPlural the branch directly
      const i18n2 = createI18n({
        catalogs: { en: { ui: { inbox: { one: 'One message', other: '{count} messages', zero: 'No messages' } } } },
      });
      const ui = i18n2.scope('ui');
      const inbox = ui.bindPlural('inbox');

      expect(inbox(0)).toBe('No messages');
      expect(inbox(1)).toBe('One message');
      expect(inbox(5)).toBe('5 messages');
    });

    test('scope().bindPlural() follows locale changes', async () => {
      const i18n = createI18n({
        catalogs: {
          de: { ui: { count: { one: 'Ein Element', other: '{count} Elemente' } } },
          en: { ui: { count: { one: 'One item', other: '{count} items' } } },
        },
      });
      const ui = i18n.scope('ui');
      const count = ui.bindPlural('count');

      expect(count(1)).toBe('One item');

      await i18n.setLocale('de');

      expect(count(1)).toBe('Ein Element');
      expect(count(3)).toBe('3 Elemente');
    });
  });

  // ─── hasBranch() ──────────────────────────────────────────────────────────

  describe('hasBranch()', () => {
    test('returns true for an explicit plural branch', () => {
      const i18n = createI18n({ catalogs: { en: { inbox: { one: 'One', other: '{count}' } } } });

      expect(i18n.hasBranch('inbox')).toBe(true);
    });

    test('returns true for a pipe-plural expanded branch', () => {
      const i18n = createI18n({ catalogs: { en: { inbox: 'One message|{count} messages' } } });

      // has() returns false — base key was expanded
      expect(i18n.has('inbox')).toBe(false);
      // hasBranch() returns true — inbox.one / inbox.other exist
      expect(i18n.hasBranch('inbox')).toBe(true);
    });

    test('returns false for a plain leaf key', () => {
      const i18n = createI18n({ catalogs: { en: { greeting: 'Hello' } } });

      expect(i18n.hasBranch('greeting')).toBe(false);
    });

    test('returns false for an unregistered key', () => {
      const i18n = createI18n({ catalogs: { en: { greeting: 'Hello' } } });

      expect(i18n.hasBranch('missing')).toBe(false);
    });

    test('checks fallback chain', () => {
      const i18n = createI18n({
        catalogs: {
          en: { inbox: { one: 'One', other: '{count}' } },
          fr: { other: 'other key' },
        },
        fallback: 'en',
        locale: 'fr',
      });

      // 'fr' has no inbox branch; fallback 'en' does
      expect(i18n.hasBranch('inbox')).toBe(true);
    });

    test('returns false when no catalog loaded for active locale and no fallback', () => {
      const i18n = createI18n({ catalogs: { en: { greeting: 'Hello' } }, locale: 'en' });
      const fork = i18n.fork({ locale: 'en' });

      // Fork has catalog, should still work
      expect(fork.hasBranch('greeting')).toBe(false); // leaf, not branch
    });
  });

  // ─── isLoaded() ───────────────────────────────────────────────────────────

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

  // ─── subscribe() — immediate throw path ───────────────────────────────────

  describe('subscribe() — immediate callback throw', () => {
    test('immediate callback throw invokes onSubscriberError and does not register', () => {
      const errors: unknown[] = [];
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' } },
        onSubscriberError: (e) => errors.push(e),
      });
      const boom = new Error('boom');
      const calls: number[] = [];

      i18n.subscribe(
        () => {
          throw boom;
        },
        { immediate: true },
      );

      expect(errors).toEqual([boom]);

      // subscriber was not registered — catalog change should not trigger it
      i18n.register('en', { hello: 'Hi' });
      expect(calls).toHaveLength(0);
    });
  });

  // ─── setLocale() — concurrent last-wins ───────────────────────────────────

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

  // ─── getSupportedLocales() — sorted ───────────────────────────────────────

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

  // ─── merge() on unregistered locale ───────────────────────────────────────

  describe('merge() on unregistered locale', () => {
    test('creates a new catalog for the locale', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } }, fallback: 'fr', locale: 'en' });

      await i18n.merge('fr', { bye: 'Au revoir' });

      await i18n.setLocale('fr');
      expect(i18n.t('bye')).toBe('Au revoir');
      expect(i18n.isLoaded('fr')).toBe(true);
    });
  });

  // ─── fork() — fallback array propagation ──────────────────────────────────

  describe('fork() — fallback propagation', () => {
    test('fork inherits fallback array from parent', async () => {
      const i18n = createI18n({
        catalogs: {
          en: { greeting: 'Hello' },
          fr: { greeting: 'Bonjour' },
        },
        fallback: ['fr', 'en'],
        locale: 'en',
      });
      const child = i18n.fork({ locale: 'de' });

      // 'de' has no catalog — should fall through to 'fr' then 'en'
      expect(child.t('greeting')).toBe('Bonjour');
    });

    test('fork accepts its own fallback override', () => {
      const i18n = createI18n({
        catalogs: {
          en: { greeting: 'Hello' },
          fr: { greeting: 'Bonjour' },
        },
        fallback: 'fr',
        locale: 'en',
      });
      const child = i18n.fork({ fallback: 'en', locale: 'de' });

      expect(child.t('greeting')).toBe('Hello');
    });
  });

  // ─── isRegistered() ───────────────────────────────────────────────────────

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

  // ─── dispose() ────────────────────────────────────────────────────────────

  describe('dispose()', () => {
    test('clears subscribers — no callbacks after dispose', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } } });
      let calls = 0;

      i18n.subscribe(() => calls++);
      i18n.dispose();
      i18n.register('en', { hello: 'Hi' });

      expect(calls).toBe(0);
    });

    test('is idempotent — calling dispose() twice does not throw', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(() => {
        i18n.dispose();
        i18n.dispose();
      }).not.toThrow();
    });

    test('isLoaded returns false for all locales after dispose', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(i18n.isLoaded('en')).toBe(true);
      i18n.dispose();
      expect(i18n.isLoaded('en')).toBe(false);
    });

    test('isRegistered returns false for all locales after dispose', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(i18n.isRegistered('en')).toBe(true);
      i18n.dispose();
      expect(i18n.isRegistered('en')).toBe(false);
    });
  });

  // ─── createNamespace() ────────────────────────────────────────────────────

  describe('createNamespace()', () => {
    test('is an identity function — returns the same factory reference', () => {
      const factory = (locale: string) => ({ save: `Save (${locale})` });
      const wrapped = createNamespace(factory);

      expect(wrapped).toBe(factory);
    });

    test('wrapped factory works correctly with registerNamespace', async () => {
      const i18n = createI18n({ catalogs: { en: {} }, locale: 'en' });

      i18n.registerNamespace(
        'actions',
        createNamespace((locale) => ({ cancel: 'Cancel', save: `Save ${locale}` })),
      );

      await i18n.loadNamespace('actions');

      expect(i18n.t('save')).toBe('Save en');
      expect(i18n.t('cancel')).toBe('Cancel');
    });
  });
});
