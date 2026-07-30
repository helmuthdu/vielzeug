import { describe, expect, test, vi } from 'vitest';

import { createI18n } from '../';

describe('createI18n — fork()', () => {
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

    test('inherits catalog and renders interpolated templates correctly', () => {
      const parent = createI18n({
        catalogs: { en: { greeting: 'Hello, {name}!' } },
        locale: 'en',
      });
      const child = parent.fork();

      expect(child.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
    });

    test('inherits the namespace registry from the parent', async () => {
      const parent = createI18n({ catalogs: { en: { base: 'Base' } }, locale: 'en' });
      const child = parent.fork();

      await child.loadNamespace('ui', () => Promise.resolve({ btn: 'Click me' }) as any);
      expect(child.t('btn')).toBe('Click me');
    });

    test('namespace mutations on the fork do not affect the parent', async () => {
      const parent = createI18n({ catalogs: { en: {} }, locale: 'en' });
      const child = parent.fork();

      await child.loadNamespace('ui', () => Promise.resolve({ btn: 'Click me' }));
      expect(child.t('btn')).toBe('Click me');
      expect(parent.t('btn')).toBe('btn'); // parent did not load the namespace
    });

    test('loadNamespace() on fork does not affect the parent registry', async () => {
      const parent = createI18n({ catalogs: { en: {} }, locale: 'en' });
      const child = parent.fork();

      await child.loadNamespace('childOnly', () => Promise.resolve({ x: 'X' }));
      expect(child.t('x')).toBe('X');
      expect(parent.t('x')).toBe('x');
    });
  });

  describe('fork() — catalog clone', () => {
    test('forked instance translates keys from parent catalog without re-compile', () => {
      const parent = createI18n({
        catalogs: { en: { count: '{count} items', greeting: 'Hello, {name}!' } },
        locale: 'en',
      });
      const child = parent.fork({ locale: 'en' });

      expect(child.t('greeting', { name: 'World' })).toBe('Hello, World!');
      expect(child.t('count', { count: 3 })).toBe('3 items');
    });

    test('catalog mutation on fork does not affect parent', () => {
      const parent = createI18n({
        catalogs: { en: { hello: 'Hello' } },
        locale: 'en',
      });
      const child = parent.fork();

      child.register('en', { hello: 'Hi' });
      expect(parent.t('hello')).toBe('Hello');
      expect(child.t('hello')).toBe('Hi');
    });
  });

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
});
