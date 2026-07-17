import { describe, expect, test, vi } from 'vitest';

import { LinguaError, LinguaNamespaceMissingError, createI18n } from '../';

describe('createI18n — namespaces', () => {
  describe('registerNamespace() / loadNamespace()', () => {
    test('registerNamespace() registers without loading', async () => {
      const i18n = createI18n({ catalogs: { en: {} } });

      i18n.registerNamespace('ui', async () => ({ btn: 'Click' }));
      expect(i18n.isNamespaceRegistered('ui')).toBe(true);
      expect(i18n.isNamespaceLoaded('ui')).toBe(false);
      expect(i18n.t('btn')).toBe('btn');
    });

    test('loadNamespace() loads after registerNamespace()', async () => {
      const i18n = createI18n({ catalogs: { en: {} } });

      i18n.registerNamespace('ui', async () => ({ btn: 'Click' }));
      await i18n.loadNamespace('ui');
      expect(i18n.isNamespaceLoaded('ui')).toBe(true);
      expect(i18n.t('btn')).toBe('Click');
    });

    test('loadNamespace() deduplicates concurrent calls', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: {} } });

      i18n.registerNamespace('ui', async () => {
        calls++;

        return { btn: 'Click' };
      });
      await Promise.all([i18n.loadNamespace('ui'), i18n.loadNamespace('ui'), i18n.loadNamespace('ui')]);
      expect(calls).toBe(1);
    });

    test('loadNamespace() is a no-op after the namespace is already loaded', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: {} } });

      i18n.registerNamespace('ui', async () => {
        calls++;

        return { btn: 'Click' };
      });
      await i18n.loadNamespace('ui');
      await i18n.loadNamespace('ui');
      await i18n.loadNamespace('ui');
      expect(calls).toBe(1);
    });

    test('loadNamespace() rejects when namespace is not registered', async () => {
      const i18n = createI18n({ catalogs: { en: {} } });

      await expect(i18n.loadNamespace('unregistered')).rejects.toThrow('not registered');
      await expect(i18n.loadNamespace('unregistered')).rejects.toBeInstanceOf(LinguaNamespaceMissingError);
      await expect(i18n.loadNamespace('unregistered')).rejects.toBeInstanceOf(LinguaError);
    });

    test('isNamespaceRegistered() returns false for an unregistered namespace', () => {
      const i18n = createI18n({ catalogs: { en: {} } });

      expect(i18n.isNamespaceRegistered('missing')).toBe(false);
    });

    test('isNamespaceLoaded() with explicit locale argument', async () => {
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });

      i18n.registerNamespace('ui', async (locale) => (locale === 'fr' ? { btn: 'Cliquer' } : { btn: 'Click' }));
      await i18n.loadNamespace('ui', 'fr');
      expect(i18n.isNamespaceLoaded('ui', 'fr')).toBe(true);
      expect(i18n.isNamespaceLoaded('ui', 'en')).toBe(false);
    });

    test('isNamespaceLoaded() returns false for invalid locale tags', () => {
      const i18n = createI18n({ catalogs: { en: {} } });

      expect(() => i18n.isNamespaceLoaded('ui', 'not-a-valid-locale!!!')).not.toThrow();
      expect(i18n.isNamespaceLoaded('ui', 'not-a-valid-locale!!!')).toBe(false);
    });

    test('extend() = registerNamespace + loadNamespace in one call', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: {} } });

      await i18n.extend('ui', async () => {
        calls++;

        return { btn: 'Click' };
      });
      expect(calls).toBe(1);
      expect(i18n.isNamespaceRegistered('ui')).toBe(true);
      expect(i18n.isNamespaceLoaded('ui')).toBe(true);
      expect(i18n.t('btn')).toBe('Click');
    });

    test('loadNamespace() for a specific locale does not notify when locale is not in active chain', async () => {
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });
      const listener = vi.fn();

      i18n.registerNamespace('ui', async () => ({ btn: 'Cliquer' }));
      i18n.subscribe(listener);
      await i18n.loadNamespace('ui', 'fr');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('restoreState() namespace marker reset', () => {
    test('restoreState() clears markers for locales removed from state', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });

      i18n.registerNamespace('ui', async () => {
        calls++;

        return { btn: 'Click' };
      });

      await i18n.loadNamespace('ui', 'fr');
      expect(i18n.isNamespaceLoaded('ui', 'fr')).toBe(true);
      expect(calls).toBe(1);

      i18n.restoreState({ catalogs: { en: {} }, locale: 'en' });

      expect(i18n.isNamespaceLoaded('ui', 'fr')).toBe(false);

      await i18n.loadNamespace('ui', 'fr');
      expect(calls).toBe(2);
      expect(i18n.isNamespaceLoaded('ui', 'fr')).toBe(true);
    });
  });
});
